// IA Auditoria: analisa padrões suspeitos dos últimos 30 dias por funcionário
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const empresa_id: string | undefined = body.empresa_id;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

    let q = supabase.from("ponto_funcionarios").select("id, nome, empresa_id").eq("status", "ativo");
    if (empresa_id) q = q.eq("empresa_id", empresa_id);
    const { data: funcs } = await q;

    const desde = new Date(Date.now() - 30 * 86400000).toISOString();
    let inseridos = 0;

    for (const f of funcs || []) {
      const { data: regs } = await supabase
        .from("ponto_registros")
        .select("data_hora, tipo, gps_lat, gps_lon, ip, device_hash, score_confianca, face_match_score")
        .eq("funcionario_id", f.id)
        .gte("data_hora", desde)
        .order("data_hora", { ascending: true })
        .limit(500);

      if (!regs?.length) continue;

      // resumo compacto para o modelo
      const resumo = {
        total_registros: regs.length,
        score_medio: regs.reduce((s, r) => s + (r.score_confianca || 0), 0) / regs.length,
        face_medio: regs.filter(r => r.face_match_score).reduce((s, r) => s + Number(r.face_match_score), 0) /
                    Math.max(1, regs.filter(r => r.face_match_score).length),
        devices_distintos: new Set(regs.map(r => r.device_hash).filter(Boolean)).size,
        ips_distintos: new Set(regs.map(r => r.ip).filter(Boolean)).size,
        amostras: regs.slice(-20).map(r => ({
          dh: r.data_hora, tipo: r.tipo, lat: r.gps_lat, lon: r.gps_lon,
          ip: r.ip, score: r.score_confianca, face: r.face_match_score,
        })),
      };

      const prompt = `Você é auditor antifraude de ponto eletrônico. Analise o histórico abaixo e detecte padrões suspeitos (locais inconsistentes, múltiplos dispositivos, score baixo recorrente, marcações em horários atípicos, possível buddy punching). Retorne JSON estrito:
{"suspeito": boolean, "nivel": "baixo|medio|alto", "categoria": "string curta", "descricao": "máx 200 chars"}

Dados:
${JSON.stringify(resumo)}`;

      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": LOVABLE_API_KEY,
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
        }),
      });

      if (!aiResp.ok) continue;
      const ai = await aiResp.json();
      const content = ai?.choices?.[0]?.message?.content || "{}";
      let parsed: any = {};
      try { parsed = JSON.parse(content); } catch { continue; }

      if (parsed.suspeito) {
        // evita duplicar mesmo padrão aberto
        const { data: existe } = await supabase
          .from("ponto_alertas").select("id")
          .eq("funcionario_id", f.id).eq("categoria", `ia:${parsed.categoria}`)
          .eq("resolvido", false).maybeSingle();
        if (!existe) {
          await supabase.from("ponto_alertas").insert({
            funcionario_id: f.id,
            empresa_id: f.empresa_id,
            nivel: parsed.nivel || "medio",
            categoria: `ia:${parsed.categoria}`,
            descricao: parsed.descricao,
            detalhes: { resumo, ia: parsed },
          });
          inseridos++;
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, analisados: funcs?.length || 0, novos_alertas: inseridos }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
