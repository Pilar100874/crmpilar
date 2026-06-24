// Sugestão automática de escala — usa IA para propor uma escala otimizada
// considerando jornada contratada, regras CLT, feriados, férias e cobertura mínima.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { empresa_id, filial_id = null, mes, cobertura_minima = 1, hora_abertura = "08:00", hora_fechamento = "18:00" } = await req.json();
    if (!empresa_id || !mes) {
      return new Response(JSON.stringify({ error: "empresa_id e mes (YYYY-MM-01) obrigatórios" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Funcionários ativos
    let q = sb.from("ponto_funcionarios")
      .select("id, nome, cargo_id, jornada_contratada_horas, escala_id")
      .eq("empresa_id", empresa_id).eq("status", "ativo");
    if (filial_id) q = q.eq("filial_id", filial_id);
    const { data: funcs } = await q;

    const ini = mes; // YYYY-MM-01
    const fimDate = new Date(ini);
    fimDate.setMonth(fimDate.getMonth() + 1);
    fimDate.setDate(0);
    const fim = fimDate.toISOString().slice(0, 10);

    // Férias/afastamentos no período
    const { data: afast } = await sb.from("ponto_ferias_afastamentos")
      .select("funcionario_id, data_inicio, data_fim, tipo")
      .eq("estabelecimento_id", (await sb.from("ponto_empresas").select("estabelecimento_id").eq("id", empresa_id).maybeSingle()).data?.estabelecimento_id)
      .eq("status", "aprovado")
      .lte("data_inicio", fim).gte("data_fim", ini);

    // Feriados
    const { data: feriados } = await sb.from("ponto_feriados")
      .select("data, descricao").gte("data", ini).lte("data", fim);

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return new Response(JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } });

    const prompt = `Você é especialista em escalas CLT. Gere uma sugestão de escala mensal para uma equipe.

REGRAS OBRIGATÓRIAS (CLT brasileira):
- Máximo 44h semanais ou 220h mensais
- Mínimo 11h de descanso entre jornadas
- Mínimo 1 dia de DSR (preferencialmente domingo) por semana
- Respeitar férias/afastamentos (não escalar nesses dias)
- Cobertura mínima diária: ${cobertura_minima} funcionário(s) por dia
- Horário de funcionamento: ${hora_abertura} às ${hora_fechamento}

PERÍODO: ${ini} a ${fim}
FUNCIONÁRIOS (${(funcs || []).length}):
${(funcs || []).map((f: any) => `- ${f.nome} (id:${f.id}, jornada:${f.jornada_contratada_horas || 220}h/mês)`).join("\n")}

AFASTAMENTOS:
${(afast || []).map((a: any) => `- func:${a.funcionario_id} ${a.tipo} ${a.data_inicio}→${a.data_fim}`).join("\n") || "nenhum"}

FERIADOS:
${(feriados || []).map((f: any) => `- ${f.data} ${f.descricao}`).join("\n") || "nenhum"}

Retorne APENAS JSON válido:
{
  "escala": [
    {"funcionario_id": "uuid", "data": "YYYY-MM-DD", "entrada": "HH:MM", "saida": "HH:MM", "intervalo_min": 60, "tipo": "trabalho"|"folga"|"feriado"|"ferias"}
  ],
  "resumo": {
    "total_horas_planejadas": numero,
    "media_horas_por_funcionario": numero,
    "dias_sem_cobertura": [datas],
    "alertas": [strings curtas]
  }
}

Não inclua explicações fora do JSON. Pode omitir dias de folga, mas mantenha pelo menos 1 entrada por funcionário por semana indicando o DSR.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      return new Response(JSON.stringify({ error: `Gateway IA falhou: ${resp.status}`, detalhe: txt }),
        { status: resp.status, headers: { ...cors, "Content-Type": "application/json" } });
    }
    const ai = await resp.json();
    const content = ai?.choices?.[0]?.message?.content || "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { parsed = { escala: [], resumo: { alertas: ["Falha ao processar resposta da IA"] } }; }

    return new Response(JSON.stringify({ ok: true, ...parsed }),
      { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
