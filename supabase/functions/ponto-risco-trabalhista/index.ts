// Score de risco trabalhista por funcionário, com justificativa IA.
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

    const desde = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
    const { data: espelho } = await supabase.from("ponto_espelho_diario")
      .select("extra_min, falta, atraso_min, noturno_min, ponto_funcionarios!inner(id, nome, empresa_id)")
      .eq("ponto_funcionarios.empresa_id", empresa_id).gte("data", desde);

    const por = new Map<string, any>();
    for (const r of (espelho || []) as any[]) {
      const k = r.ponto_funcionarios.id;
      if (!por.has(k)) por.set(k, { nome: r.ponto_funcionarios.nome, dias: 0, he: 0, faltas: 0, atrasos: 0, noturno: 0 });
      const a = por.get(k); a.dias++; a.he += r.extra_min || 0;
      a.faltas += r.falta ? 1 : 0; a.atrasos += r.atraso_min || 0; a.noturno += r.noturno_min || 0;
    }

    const arr = [...por.entries()].map(([id, a]) => {
      const heMes = (a.he / a.dias) * 22;
      const taxaFalta = a.faltas / Math.max(1, a.dias);
      const score = Math.min(100, Math.round(
        (heMes > 7200 ? 35 : (heMes/7200)*35) +
        (taxaFalta > 0.1 ? 30 : taxaFalta*300) +
        (a.atrasos > 600 ? 15 : (a.atrasos/600)*15) +
        (a.noturno > 600 ? 20 : (a.noturno/600)*20)
      ));
      return { funcionario_id: id, nome: a.nome, score_risco: score, he_mes_min: heMes, taxa_falta: taxaFalta };
    }).sort((a, b) => b.score_risco - a.score_risco);

    const top = arr.slice(0, 10);
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": LOVABLE_API_KEY },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Especialista trabalhista. Para cada funcionário no JSON, gere uma justificativa curta de risco (1-2 frases) em português. Retorne JSON {analises:[{funcionario_id, justificativa, acoes:[]}]}." },
          { role: "user", content: JSON.stringify(top) }
        ],
      }),
    });
    const j = await aiResp.json();
    let parsed: any = {};
    try {
      const txt = j.choices?.[0]?.message?.content || "{}";
      parsed = JSON.parse(txt.replace(/```json|```/g, "").trim());
    } catch { parsed = {}; }
    const justMap = new Map((parsed.analises || []).map((x: any) => [x.funcionario_id, x]));
    const final = arr.map((x) => ({ ...x, ia: justMap.get(x.funcionario_id) || null }));

    return new Response(JSON.stringify({ ok: true, riscos: final }),
      { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
