// Detecta visitas espontâneas: varre posições recentes e cria ocorrências
// automaticamente quando um funcionário/veículo permanece no endereço de
// um cliente por tempo mínimo definido na regra.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const hoje = new Date().toISOString().slice(0, 10);
  const desde = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(); // últimas 6h

  // Regras com detecção espontânea ativada
  const { data: regras } = await supabase
    .from("visita_regras_monitoramento")
    .select("*")
    .eq("ativa", true)
    .eq("detectar_espontanea", true);

  if (!regras || regras.length === 0) {
    return new Response(JSON.stringify({ ok: true, criadas: 0, motivo: "sem regras" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const estabIds = [...new Set(regras.map((r: any) => r.estabelecimento_id))];

  // Clientes com lat/lng por estabelecimento
  const { data: clientes } = await supabase
    .from("customers")
    .select("id, nome, lat, lng, estabelecimento_id")
    .in("estabelecimento_id", estabIds)
    .not("lat", "is", null)
    .not("lng", "is", null);

  if (!clientes || clientes.length === 0) {
    return new Response(JSON.stringify({ ok: true, criadas: 0, motivo: "sem clientes com coordenadas" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Posições recentes de usuários
  const { data: userPos } = await supabase
    .from("usuario_posicoes")
    .select("usuario_id, lat, lng, data_hora, estabelecimento_id")
    .in("estabelecimento_id", estabIds)
    .gte("data_hora", desde);

  let criadas = 0;

  // Agrupa posições por usuário
  const porUsuario = new Map<string, any[]>();
  for (const p of userPos || []) {
    const arr = porUsuario.get(p.usuario_id) || [];
    arr.push(p);
    porUsuario.set(p.usuario_id, arr);
  }

  function resolveRegra(estabId: string, usuarioId: string) {
    const rs = regras.filter((r: any) => r.estabelecimento_id === estabId);
    return (
      rs.find((r: any) => r.escopo === "usuario" && r.usuario_id === usuarioId) ||
      rs.find((r: any) => r.escopo === "global") ||
      rs[0]
    );
  }

  for (const [usuarioId, posicoes] of porUsuario) {
    posicoes.sort((a: any, b: any) => a.data_hora.localeCompare(b.data_hora));
    const estabId = posicoes[0].estabelecimento_id;
    const regra = resolveRegra(estabId, usuarioId);
    if (!regra) continue;

    const clientesEstab = clientes.filter((c: any) => c.estabelecimento_id === estabId);

    for (const cli of clientesEstab) {
      let dentroDesde: Date | null = null;
      let minDist = Infinity;
      let saida: Date | null = null;

      for (const p of posicoes) {
        const d = haversine(p.lat, p.lng, cli.lat, cli.lng);
        if (d <= regra.raio_metros) {
          if (!dentroDesde) dentroDesde = new Date(p.data_hora);
          saida = new Date(p.data_hora);
          if (d < minDist) minDist = d;
        } else if (dentroDesde) {
          break;
        }
      }

      if (!dentroDesde || !saida) continue;
      const permanenciaMin = (saida.getTime() - dentroDesde.getTime()) / 60000;
      if (permanenciaMin < regra.tempo_minimo_min) continue;

      // Já existe ocorrência para esse cliente/usuário/dia?
      const { data: existente } = await supabase
        .from("visita_ocorrencias")
        .select("id, status")
        .eq("customer_id", cli.id)
        .eq("usuario_id", usuarioId)
        .eq("data_prevista", hoje)
        .maybeSingle();

      // Resolve formulário aplicável
      const { data: regrasForm } = await supabase
        .from("visita_formulario_regras")
        .select("*")
        .eq("estabelecimento_id", estabId)
        .eq("ativa", true);
      let formularioId: string | null = null;
      const listRF = regrasForm || [];
      formularioId =
        (listRF.find((r: any) => r.escopo === "usuario" && r.usuario_id === usuarioId)?.formulario_id) ||
        (listRF.find((r: any) => r.escopo === "global")?.formulario_id) ||
        null;

      const dur = Math.round(permanenciaMin);
      const payload: any = {
        estabelecimento_id: estabId,
        customer_id: cli.id,
        usuario_id: usuarioId,
        data_prevista: hoje,
        janela_inicio: "00:00:00",
        janela_fim: "23:59:59",
        status: "realizada",
        origem: "espontanea",
        verificada_em: new Date().toISOString(),
        hora_chegada: dentroDesde.toISOString(),
        hora_saida: saida.toISOString(),
        duracao_min: dur,
        fonte_deteccao: "celular",
        distancia_metros: minDist,
        lat_registro: cli.lat,
        lng_registro: cli.lng,
        observacao_auto: `Visita espontânea detectada em ${cli.nome}`,
        formulario_id: formularioId,
        formulario_status: formularioId ? "pendente" : "nao_aplicavel",
      };

      if (existente) {
        if (existente.status === "pendente" || existente.status === "nao_realizada") {
          await supabase.from("visita_ocorrencias").update(payload).eq("id", existente.id);
          criadas++;
        }
      } else {
        await supabase.from("visita_ocorrencias").insert(payload);
        criadas++;
      }
    }
  }

  return new Response(JSON.stringify({ ok: true, criadas }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
