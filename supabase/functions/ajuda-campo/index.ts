import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { getAuthContext } from "../_shared/auth.ts";
import { contextoNegocio } from "./conhecimento.ts";

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
      `Item clicado: ${String(c.rotulo ?? "").slice(0, 200)}`, c.secao ? `Seção: ${String(c.secao).slice(0, 200)}` : "",
      c.dica ? `Texto de apoio na tela: ${String(c.dica).slice(0, 400)}` : "", c.placeholder ? `Exemplo na tela: ${String(c.placeholder).slice(0, 200)}` : "",
      c.tipo ? `Tipo do item: ${String(c.tipo).slice(0, 50)}` : "", c.opcoes ? `Opções: ${String(c.opcoes).slice(0, 400)}` : "",
      b.oficial ? `Explicação oficial do sistema: ${String(b.oficial).slice(0, 1500)}` : "",
      c.vizinhos ? `Outros campos da mesma seção: ${String(c.vizinhos).slice(0, 600)}` : ""].filter(Boolean).join("\n");
    const hist = (Array.isArray(b.historico) ? b.historico : []).slice(-10)
      .map((m: { papel: string; texto: string }) => ({ role: m.papel === "ia" ? "assistant" : "user", content: String(m.texto).slice(0, 1500) }));
    const pergunta = String(b.pergunta ?? "").slice(0, 1500) || "Explique este item no contexto do CRM Pilar.";
    const r = await fetch(GW, {
      method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({ model: "openai/gpt-6-astra", stream: true, store: false, reasoning: { effort: "low" },
        instructions: `Você é a ajuda do CRM Pilar e explica qualquer item das telas (campos, botões, blocos de workflow, abas, menus, colunas) para usuários não técnicos, em português do Brasil.
Use o CONHECIMENTO DO SISTEMA abaixo para explicar o motivo de negócio do item, ligando-o às regras reais (ex.: por que é obrigatório, o que ele destrava ou bloqueia, que outra tela ele alimenta). Nunca responda de forma genérica como "serve para inserir dados" ou "serve para salvar".
Responda neste formato, curto (até 150 palavras):
**Por que existe:** objetivo prático no trabalho da empresa.
**O que acontece:** o que o sistema faz ao usar/preencher/clicar.
**Se não usar ou ficar vazio:** impacto ou bloqueio (omita se não se aplicar).
**Dica:** exemplo ou quando usar.
Sem nomes de tabelas ou código. Fale com segurança, sem "provavelmente", "talvez" ou "parece". Se o item clicado for um dado (nome de pessoa, empresa, valor, número), explique o componente que o exibe, usando o dado só como exemplo. Se não houver regra conhecida, explique apenas o que a tela mostra, sem inventar. ${DIRETIVA}

CONHECIMENTO DO SISTEMA:
${contextoNegocio(String(b.rota ?? ""), String(b.tela ?? ""))}

ITEM CLICADO:
${ctx}`,
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
