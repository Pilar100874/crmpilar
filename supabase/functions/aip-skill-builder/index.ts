import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

/**
 * Entrevistador de skills (estilo Claude Code, porém em formato wizard).
 *
 * O CRM envia o histórico de perguntas/respostas e a IA devolve:
 *  - acao: "perguntar"  -> próxima pergunta com campos prontos para preencher
 *  - acao: "gerar"      -> rascunho final da skill (SKILL.md + references + scripts)
 *
 * Assim o usuário leigo só vai respondendo campos; a IA conduz a entrevista,
 * pede referências/textos e no fim monta a pasta da skill para aprovação.
 */

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.6-flash";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const SISTEMA = `Você é um entrevistador especialista em criar "skills" no formato Claude Code
(pasta com SKILL.md + references/*.md + scripts/*).

Seu público é LEIGO. Conduza uma entrevista curta, uma etapa por vez, em português do Brasil,
com linguagem simples e exemplos. Nunca peça conhecimento técnico desnecessário.

Regras:
- No máximo 8 etapas. Cada etapa tem 1 a 3 campos.
- Pergunte pelo objetivo, pelo passo a passo do processo, pelo tom/estilo, por referências
  (textos, links, exemplos, arquivos que o usuário costuma usar) e pelo resultado esperado.
- Se o usuário responder de forma vaga, faça uma etapa de refinamento com sugestões prontas.
- Quando tiver informação suficiente (ou o usuário pedir para finalizar), gere a skill.

Responda SEMPRE em JSON puro, sem markdown ao redor, num destes dois formatos:

{"acao":"perguntar","etapa":{"titulo":"...","explicacao":"...","campos":[
  {"id":"objetivo","label":"...","ajuda":"...","tipo":"texto|textarea|escolha|multipla","opcoes":["..."],"exemplo":"...","obrigatorio":true}
]},"progresso":40}

{"acao":"gerar","skill":{"nome":"...","slug":"...","descricao":"...","categoria":"...","tags":["..."],
  "conteudo_md":"# Nome\\n\\n...conteúdo completo do SKILL.md...",
  "arquivos":[{"caminho":"references/exemplos.md","conteudo":"..."}]},
  "resumo":"o que essa skill faz, em 2 linhas"}

O conteudo_md deve começar com frontmatter YAML (name, description) e conter seções:
Quando usar, Passo a passo, Entradas necessárias, Saída esperada, Cuidados.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const chave = Deno.env.get("LOVABLE_API_KEY");
    if (!chave) return json({ erro: "LOVABLE_API_KEY não configurada" }, 500);

    const body = await req.json().catch(() => ({}));
    const historico: Array<{ pergunta: string; resposta: string }> = body.historico ?? [];
    const finalizar = Boolean(body.finalizar);
    const ajuste = String(body.ajuste ?? "");
    const rascunho = body.rascunho ?? null;

    const contexto = historico.length
      ? historico.map((h, i) => `Etapa ${i + 1}: ${h.pergunta}\nResposta: ${h.resposta}`).join("\n\n")
      : "Ainda não há respostas. Faça a primeira etapa da entrevista.";

    let instrucao = contexto;
    if (finalizar) instrucao += "\n\nO usuário pediu para finalizar. Gere a skill agora (acao: gerar).";
    if (ajuste && rascunho) {
      instrucao =
        `Rascunho atual da skill:\n${JSON.stringify(rascunho).slice(0, 20000)}\n\n` +
        `Ajuste pedido pelo usuário: ${ajuste}\n\nDevolva a skill revisada (acao: gerar).`;
    }

    const resposta = await fetch(GATEWAY, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": chave },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SISTEMA },
          { role: "user", content: instrucao },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (resposta.status === 429) return json({ erro: "Limite de requisições atingido. Tente em instantes." }, 429);
    if (resposta.status === 402) return json({ erro: "Créditos de IA esgotados." }, 402);
    if (!resposta.ok) return json({ erro: `Falha na IA (${resposta.status})` }, 502);

    const dados = await resposta.json();
    const texto: string = dados?.choices?.[0]?.message?.content ?? "";

    let parsed: any;
    try {
      parsed = JSON.parse(texto);
    } catch {
      const bloco = texto.match(/\{[\s\S]*\}/);
      if (!bloco) return json({ erro: "Resposta da IA em formato inesperado" }, 502);
      parsed = JSON.parse(bloco[0]);
    }

    return json(parsed);
  } catch (e) {
    return json({ erro: (e as Error).message }, 500);
  }
});
