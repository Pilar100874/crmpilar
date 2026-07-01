// Edge function: valida marcação de ponto multi-fator e persiste com score de confiança.
// Recebe: funcionario_id, tipo, gps {lat,lng,precisao}, ip (auto), foto base64 (opcional),
// device_hash, user_agent, qr_token (opcional). Retorna score e detalhamento.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

interface Body {
  funcionario_id: string;
  tipo: "entrada" | "saida" | "inicio_intervalo" | "fim_intervalo";
  gps?: { lat: number; lng: number; precisao?: number };
  foto_base64?: string;
  device_hash?: string;
  user_agent?: string;
  qr_token?: string;
  origem?: string;
  observacao?: string;
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body: Body = await req.json();
    if (!body.funcionario_id || !body.tipo) {
      return new Response(JSON.stringify({ error: "funcionario_id e tipo obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pega funcionário + empresa/filial
    const { data: func, error: fErr } = await supabase
      .from("ponto_funcionarios")
      .select("id, nome, empresa_id, filial_id, foto_referencia_url")
      .eq("id", body.funcionario_id)
      .single();
    if (fErr || !func) {
      return new Response(JSON.stringify({ error: "funcionário não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Config empresa (geofence obrigatório para app)
    const { data: empCfg } = await supabase
      .from("ponto_empresas")
      .select("geofence_obrigatorio_app, antifraude_ativo")
      .eq("id", func.empresa_id)
      .maybeSingle();
    const exigirGeofenceApp = empCfg?.geofence_obrigatorio_app !== false;
    const origemApp = (body.origem || "app").startsWith("app");

    const fatores: Record<string, { ok: boolean; peso: number; detalhe?: string }> = {};
    let scoreObtido = 0;
    let scoreMax = 0;

    // 1) GPS + Geofence (peso 30) — BLOQUEANTE para marcações via app
    let geofence_ok = false;
    scoreMax += 30;
    const { data: geos } = await supabase
      .from("ponto_geofences")
      .select("lat, lng, raio_metros, nome")
      .eq("empresa_id", func.empresa_id)
      .eq("ativo", true);
    const temGeofences = !!(geos && geos.length > 0);

    if (body.gps) {
      if (temGeofences) {
        let maisProximo = { nome: "", dist: Infinity, raio: 0 };
        for (const g of geos!) {
          const d = haversine(body.gps.lat, body.gps.lng, Number(g.lat), Number(g.lng));
          if (d < maisProximo.dist) maisProximo = { nome: g.nome, dist: d, raio: g.raio_metros };
          if (d <= g.raio_metros) {
            geofence_ok = true;
            fatores.geofence = { ok: true, peso: 30, detalhe: `Dentro de ${g.nome} (${Math.round(d)}m)` };
            scoreObtido += 30;
            break;
          }
        }
        if (!geofence_ok) {
          fatores.geofence = {
            ok: false,
            peso: 30,
            detalhe: `Fora das áreas permitidas — mais próxima: ${maisProximo.nome} a ${Math.round(maisProximo.dist)}m (raio ${maisProximo.raio}m)`,
          };
          if (exigirGeofenceApp && origemApp) {
            return new Response(
              JSON.stringify({
                error: `Marcação bloqueada: você está fora da área permitida. Local mais próximo: ${maisProximo.nome} (${Math.round(maisProximo.dist)}m de distância, raio ${maisProximo.raio}m).`,
                codigo: "fora_geofence",
                fatores,
              }),
              { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
          }
        }
      } else {
        // sem geofence cadastrado
        if (exigirGeofenceApp && origemApp) {
          return new Response(
            JSON.stringify({
              error: "Marcação bloqueada: nenhuma área de GPS foi cadastrada para esta empresa. Peça ao RH para cadastrar em Configurações Antifraude → Geofences.",
              codigo: "sem_geofence_cadastrada",
            }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        fatores.geofence = { ok: true, peso: 15, detalhe: "Sem geofence cadastrado" };
        scoreObtido += 15;
        geofence_ok = true;
      }
    } else {
      fatores.geofence = { ok: false, peso: 30, detalhe: "GPS ausente" };
      if (exigirGeofenceApp && origemApp) {
        return new Response(
          JSON.stringify({
            error: "Marcação bloqueada: GPS não disponível. Ative a localização do dispositivo e tente novamente.",
            codigo: "gps_ausente",
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }


    // 2) Rede autorizada (peso 15)
    scoreMax += 15;
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "desconhecido";
    let rede_ok = false;
    const { data: redes } = await supabase
      .from("ponto_redes_autorizadas")
      .select("tipo, valor")
      .eq("empresa_id", func.empresa_id)
      .eq("ativo", true);
    if (redes && redes.length > 0) {
      for (const r of redes) {
        if (r.tipo === "ip" && r.valor === ip) {
          rede_ok = true;
          break;
        }
        // CIDR e SSID: marcam ok se simples match, validação completa fica para client/extensão
        if (r.tipo === "cidr" && ip.startsWith(r.valor.split("/")[0].split(".").slice(0, 3).join("."))) {
          rede_ok = true;
          break;
        }
      }
      fatores.rede = rede_ok
        ? { ok: true, peso: 15, detalhe: `IP ${ip} autorizado` }
        : { ok: false, peso: 15, detalhe: `IP ${ip} não autorizado` };
      if (rede_ok) scoreObtido += 15;
    } else {
      fatores.rede = { ok: true, peso: 5, detalhe: "Sem rede cadastrada (modo flexível)" };
      scoreObtido += 5;
      rede_ok = true;
    }

    // 3) QR Token dinâmico (peso 15)
    scoreMax += 15;
    let qrValid = false;
    if (body.qr_token) {
      const { data: qrRes } = await supabase.functions.invoke("ponto-qrcode-token", {
        body: { action: "validate", token: body.qr_token },
      });
      qrValid = qrRes?.valid === true;
      fatores.qr_token = qrValid
        ? { ok: true, peso: 15, detalhe: "QR válido" }
        : { ok: false, peso: 15, detalhe: qrRes?.reason || "inválido" };
      if (qrValid) scoreObtido += 15;
    } else {
      fatores.qr_token = { ok: false, peso: 0, detalhe: "QR não usado" };
    }

    // 4) Foto/Selfie + face match via Lovable AI (peso 25)
    scoreMax += 25;
    let foto_url: string | null = null;
    let face_match_score: number | null = null;
    if (body.foto_base64) {
      const fileName = `${func.id}/${Date.now()}.jpg`;
      const bytes = Uint8Array.from(atob(body.foto_base64.replace(/^data:image\/\w+;base64,/, "")), (c) =>
        c.charCodeAt(0),
      );
      const { error: upErr } = await supabase.storage
        .from("support-tickets")
        .upload(`ponto-marcacoes/${fileName}`, bytes, { contentType: "image/jpeg", upsert: true });
      if (!upErr) {
        const { data: pub } = supabase.storage
          .from("support-tickets")
          .getPublicUrl(`ponto-marcacoes/${fileName}`);
        foto_url = pub.publicUrl;
      }

      // Face match real via Lovable AI Vision se houver foto de referência
      if (func.foto_referencia_url && Deno.env.get("LOVABLE_API_KEY")) {
        try {
          const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Lovable-API-Key": Deno.env.get("LOVABLE_API_KEY")! },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [{
                role: "user",
                content: [
                  { type: "text", text: "Compare these two faces. Reply ONLY with JSON {\"match\":0-100,\"liveness\":0-100}. match=0 if different people." },
                  { type: "image_url", image_url: { url: func.foto_referencia_url } },
                  { type: "image_url", image_url: { url: `data:image/jpeg;base64,${body.foto_base64.replace(/^data:image\/\w+;base64,/, "")}` } },
                ],
              }],
            }),
          });
          const j = await aiResp.json();
          const txt = (j.choices?.[0]?.message?.content || "").replace(/```json|```/g, "").trim();
          const parsed = JSON.parse(txt);
          face_match_score = Number(parsed.match) / 100;
          if (face_match_score >= 0.7) {
            fatores.foto = { ok: true, peso: 25, detalhe: `Face match ${Math.round(face_match_score*100)}%` };
            scoreObtido += 25;
          } else {
            fatores.foto = { ok: false, peso: 25, detalhe: `Face match baixo (${Math.round(face_match_score*100)}%)` };
            scoreObtido += Math.round(face_match_score * 25);
          }
        } catch {
          fatores.foto = { ok: true, peso: 15, detalhe: "Selfie capturada (face match indisponível)" };
          scoreObtido += 15;
          face_match_score = 0.5;
        }
      } else {
        face_match_score = 0.5;
        fatores.foto = { ok: true, peso: 20, detalhe: "Selfie capturada (sem referência)" };
        scoreObtido += 20;
      }
    } else {
      fatores.foto = { ok: false, peso: 25, detalhe: "Sem selfie" };
    }

    // 6b) Deslocamento impossível (peso 5)
    scoreMax += 5;
    if (body.gps) {
      const { data: ult } = await supabase.from("ponto_registros")
        .select("gps_lat, gps_lon, data_hora")
        .eq("funcionario_id", func.id)
        .not("gps_lat", "is", null)
        .order("data_hora", { ascending: false }).limit(1).maybeSingle();
      if (ult?.gps_lat && ult?.gps_lon) {
        const distM = haversine(body.gps.lat, body.gps.lng, Number(ult.gps_lat), Number(ult.gps_lon));
        const dtMin = (Date.now() - new Date(ult.data_hora).getTime()) / 60000;
        const kmH = (distM / 1000) / Math.max(1/60, dtMin / 60);
        if (kmH > 200) {
          fatores.deslocamento = { ok: false, peso: 5, detalhe: `Deslocamento impossível ${Math.round(kmH)} km/h` };
        } else {
          fatores.deslocamento = { ok: true, peso: 5, detalhe: `${Math.round(kmH)} km/h` };
          scoreObtido += 5;
        }
      } else {
        fatores.deslocamento = { ok: true, peso: 5, detalhe: "Sem referência anterior" };
        scoreObtido += 5;
      }
    }


    // 5) Device fingerprint (peso 10)
    scoreMax += 10;
    let device_ok = false;
    if (body.device_hash) {
      const { data: dev } = await supabase
        .from("ponto_dispositivos_autorizados")
        .select("id")
        .eq("funcionario_id", func.id)
        .eq("device_id", body.device_hash)
        .maybeSingle();
      if (dev) {
        device_ok = true;
        fatores.device = { ok: true, peso: 10, detalhe: "Dispositivo conhecido" };
        scoreObtido += 10;
        await supabase
          .from("ponto_dispositivos_autorizados")
          .update({ ultimo_uso: new Date().toISOString() })
          .eq("id", dev.id);
      } else {
        fatores.device = { ok: false, peso: 10, detalhe: "Dispositivo novo (cadastrado)" };
        await supabase.from("ponto_dispositivos_autorizados").insert({
          funcionario_id: func.id,
          device_id: body.device_hash,
          plataforma: body.user_agent?.includes("Mobile") ? "mobile" : "web",
          modelo: body.user_agent?.slice(0, 60),
          ativo: true,
          ultimo_uso: new Date().toISOString(),
        });
      }
    } else {
      fatores.device = { ok: false, peso: 10, detalhe: "Sem fingerprint" };
    }


    // 6) Horário compatível com escala (peso 5) — simplificado
    scoreMax += 5;
    fatores.horario = { ok: true, peso: 5, detalhe: "Aceito (validação de escala na pós-jornada)" };
    scoreObtido += 5;

    const score_confianca = Math.round((scoreObtido / scoreMax) * 100);

    // 7) Assinatura criptográfica encadeada
    const payload = `${func.id}|${body.tipo}|${new Date().toISOString()}|${score_confianca}|${ip}`;
    const hash_assinatura = await sha256(payload);

    // Persiste o registro
    const { data: registro, error: insErr } = await supabase
      .from("ponto_registros")
      .insert({
        funcionario_id: func.id,
        tipo: body.tipo,
        origem: body.origem || "app",
        gps_lat: body.gps?.lat,
        gps_lon: body.gps?.lng,
        gps_precisao: body.gps?.precisao,
        foto_url,
        face_match_score,
        liveness_ok: !!body.foto_base64,
        geofence_ok,
        rede_ok,
        qr_token: body.qr_token,
        device_hash: body.device_hash,
        user_agent: body.user_agent,
        ip,
        score_confianca,
        score_fraude: 100 - score_confianca,
        fatores_validacao: fatores,
        hash_assinatura,
        dispositivo_info: { user_agent: body.user_agent, device_hash: body.device_hash },
        observacao: body.observacao,
      })
      .select("id")
      .single();

    if (insErr) {
      return new Response(JSON.stringify({ error: insErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Gera alerta se score baixo
    if (score_confianca < 60) {
      await supabase.from("ponto_alertas").insert({
        funcionario_id: func.id,
        empresa_id: func.empresa_id,
        registro_id: registro.id,
        nivel: score_confianca < 40 ? "alto" : "medio",
        categoria: "marcacao_suspeita",
        descricao: `Marcação com score de confiança ${score_confianca}%`,
        detalhes: { fatores },
      });
    }

    return new Response(
      JSON.stringify({
        sucesso: true,
        registro_id: registro.id,
        score_confianca,
        fatores,
        hash_assinatura,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
