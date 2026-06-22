// Recomendação de contratação por IA, dado HE e absenteísmo do período.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { empresa_id } = await req.json();
    if (!empresa_id) {
      return new Response(JSON.stringify({ error: "empresa_id obrigatório" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

    const desde = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const { data: funcs } = await supabase.from("ponto_funcionarios")
      .select("id, salario_base, ponto_departamentos(nome)")
      .eq("empresa_id", empresa_id).eq("status", "ativo");
    const { data: espelho } = await supabase.from("ponto_espelho_diario")
      .select("extra_min, falta, ponto_funcionarios!inner(empresa_id, ponto_departamentos(nome))")
      .eq("ponto_funcionarios.empresa_id", empresa_id).gte("data", desde);

    const totHE = (espelho || []).reduce((s: number, r: any) => s + (r.extra_min || 0), 0);
    const totFaltas = (espelho || []).filter((r: any) => r.falta).length;
    const nFuncs = (funcs || []).length;
    const folha = (funcs || []).reduce((s: number, f: any) => s + Number(f.salario_base || 0), 0);

    const contexto = `Empresa com ${nFuncs} funcionários ativos, folha mensal R$ ${folha.toFixed(2)}.
Últimos 30 dias: ${(totHE/60).toFixed(1)}h de HE acumulada e ${totFaltas} faltas.
Salário médio: R$ ${(folha/Math.max(1,nFuncs)).toFixed(2)}.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": LOVABLE_API_KEY },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Você é consultor de RH. Responda em português, objetivo, JSON com {recomendacao, justificativa, contratar_n, economia_mensal_estimada, risco}." },
          { role: "user", content: `${contexto}\n\nAnalise se compensa contratar novos funcionários para reduzir HE e absenteísmo. Retorne SOMENTE JSON.` }
        ],
      }),
    });
    const j = await aiResp.json();
    let parsed: any = {};
    try {
      const txt = j.choices?.[0]?.message?.content || "{}";
      parsed = JSON.parse(txt.replace(/```json|```/g, "").trim());
    } catch { parsed = { recomendacao: j.choices?.[0]?.message?.content }; }

    return new Response(JSON.stringify({ ok: true, contexto, recomendacao: parsed }),
      { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
