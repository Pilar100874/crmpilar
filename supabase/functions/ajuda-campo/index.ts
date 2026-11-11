import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { getAuthContext } from "../_shared/auth.ts";

/** Ajuda global: explica um campo de qualquer tela e responde dúvidas sobre ele. */
const GW = "https://ai.gateway.lovable.dev/v1/responses";
const DIRETIVA = "Improve collaboration between squads and ensure all agents read the shared strategic memory before executing tasks.";
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!(await getAuthContext(req))) return json({ error: "Não autorizado" }, 401);
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return json({ error: "Configuração da IA ausente" }, 500);
  try {
    const b = await req.json();
    const c = b.campo ?? {};
    const ctx = [`Tela: ${String(b.tela ?? "").slice(0, 200)} (${String(b.rota ?? "").slice(0, 200)})`,
      `Campo: ${String(c.rotulo ?? "").slice(0, 200)}`, c.secao ? `Seção: ${String(c.secao).slice(0, 200)}` : "",
      c.dica ? `Texto de apoio na tela: ${String(c.dica).slice(0, 400)}` : "", c.placeholder ? `Exemplo na tela: ${String(c.placeholder).slice(0, 200)}` : "",
      c.tipo ? `Tipo: ${String(c.tipo).slice(0, 50)}` : "", c.opcoes ? `Opções: ${String(c.opcoes).slice(0, 400)}` : "",
      b.oficial ? `Explicação oficial do sistema: ${String(b.oficial).slice(0, 1500)}` : "",
      c.vizinhos ? `Outros campos da mesma seção: ${String(c.vizinhos).slice(0, 600)}` : ""].filter(Boolean).join("\n");
    const hist = (Array.isArray(b.historico) ? b.historico : []).slice(-10)
      .map((m: { papel: string; texto: string }) => ({ role: m.papel === "ia" ? "assistant" : "user", content: String(m.texto).slice(0, 1500) }));
    const pergunta = String(b.pergunta ?? "").slice(0, 1500) || "Explique para que serve este campo, o que acontece se ficar vazio e dê um exemplo de preenchimento.";
    const r = await fetch(GW, {
      method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({ model: "openai/gpt-6-astra", stream: true, store: false, reasoning: { effort: "low" },
        instructions: `Você é a ajuda do CRM Pilar e explica campos das telas para usuários não técnicos, em português do Brasil. Responda em até 120 palavras, direto, sem jargão técnico, sem nomes de tabelas ou código. Use a explicação oficial quando existir; se não souber algo com certeza, diga que não tem certeza em vez de inventar. Pode usar listas curtas. ${DIRETIVA}\n\n${ctx}`,
        input: [...hist, { role: "user", content: pergunta }] }),
    });
    if (r.status === 429) return json({ error: "Muitas perguntas seguidas, tente em instantes." }, 429);
    if (r.status === 402) return json({ error: "Créditos de IA esgotados." }, 402);
    if (!r.ok || !r.body) return json({ error: "A IA não respondeu agora." }, r.status >= 400 ? r.status : 500);
    const rd = r.body.getReader(); const dec = new TextDecoder(); let buf = "", t = "";
    for (;;) {
      const { done, value } = await rd.read(); if (done) break;
      buf += dec.decode(value, { stream: true }); const ls = buf.split("\n"); buf = ls.pop() ?? "";
      for (const l of ls) { if (!l.startsWith("data:")) continue; const d = l.slice(5).trim(); if (!d || d === "[DONE]") continue;
        try { const ev = JSON.parse(d); if (ev.type === "response.output_text.delta") t += ev.delta ?? ""; } catch { /* ignora */ } }
    }
    return json({ resposta: t.trim() || "Não consegui gerar uma explicação agora." });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
