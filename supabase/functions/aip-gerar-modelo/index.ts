import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

/**
 * Gerador de modelos (receitas) do assistente de criação.
 *
 * O usuário escreve, em linguagem simples, o que deseja. A IA devolve um modelo
 * pronto (tipo, objetivo, etapas, agenda e quais skills/tools/MCPs usar entre os
 * recursos que realmente existem no ambiente). Quando o CRM valida e encontra
 * problemas, reenvia os problemas em `correcoes` e a IA ajusta até ficar viável.
 */

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.6-flash";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const SISTEMA = `Você monta "modelos" de automação com IA para usuários LEIGOS, em português do Brasil.

Um modelo descreve: o tipo de trabalho, o objetivo, detalhes, o modelo de IA, quais recursos
(skills, tools, MCPs) usar, se roda de uma vez ou por etapas, e o agendamento quando for rotina.

Regras obrigatórias:
- Use SOMENTE ids de skills, tools e MCPs que aparecerem na lista de recursos disponíveis. Nunca invente ids.
- Se um recurso necessário não existir, NÃO invente: liste em "faltando" o que precisa ser cadastrado.
- Escolha o "tipo" entre os ids de tipos enviados.
- O objetivo deve ter pelo menos 30 caracteres e dizer o que fazer, com quais dados e para quem entregar.
- Prefira execução por etapas quando o processo tiver mais de um passo (mínimo 2 etapas, cada uma com título claro).
- Agenda apenas quando o tipo escolhido for uma rotina agendada.

Responda SEMPRE em JSON puro, sem markdown, neste formato:
{"modelo":{"nome":"...","tipo":"rotina","objetivo":"...","detalhes":"...","modelo_ia":"...",
"skill_ids":["..."],"tool_ids":["..."],"mcp_ids":["..."],
"modo_execucao":"unica|etapas","etapas":[{"titulo":"...","instrucao":"..."}],
"agenda":{"frequencia":"diaria|semanal|mensal|hora_em_hora","hora":"08","minuto":"00"}},
"explicacao":"2 linhas explicando o que este modelo faz",
"faltando":["recurso que precisa ser cadastrado antes de rodar"]}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const chave = Deno.env.get("LOVABLE_API_KEY");
    if (!chave) return json({ erro: "LOVABLE_API_KEY não configurada" }, 500);

    const body = await req.json().catch(() => ({}));
    const descricao = String(body.descricao ?? "").trim();
    if (descricao.length < 5) return json({ erro: "Descreva o que você quer criar." }, 400);

    const tipos = Array.isArray(body.tipos) ? body.tipos : [];
    const recursos = body.recursos ?? {};
    const modelosIa = Array.isArray(body.modelos_ia) ? body.modelos_ia : [];
    const correcoes = String(body.correcoes ?? "").trim();
    const anterior = body.modelo_anterior ?? null;

    const lista = (itens: unknown, rotulo: string) => {
      const arr = Array.isArray(itens) ? itens : [];
      if (!arr.length) return `${rotulo}: (nenhum cadastrado)`;
      return `${rotulo}:\n${arr
        .map((x: Record<string, unknown>) => `- ${x.id} | ${x.nome}${x.descricao ? ` — ${x.descricao}` : ""}`)
        .join("\n")}`;
    };

    let instrucao = `Pedido do usuário:\n${descricao}

Tipos disponíveis:
${tipos.map((t: Record<string, unknown>) => `- ${t.id} | ${t.titulo} — ${t.subtitulo}${t.criaRotina ? " (rotina agendada)" : ""}`).join("\n")}

Modelos de IA permitidos: ${modelosIa.join(", ")}

${lista(recursos.skills, "Skills disponíveis")}

${lista(recursos.tools, "Tools disponíveis")}

${lista(recursos.mcps, "MCPs disponíveis")}`;

    if (correcoes && anterior) {
      instrucao += `\n\nO modelo abaixo foi validado pelo sistema e apresentou problemas.
Corrija-os mantendo a intenção original e devolva o modelo completo novamente.

Modelo atual:
${JSON.stringify(anterior)}

Problemas encontrados na validação:
${correcoes}`;
    }

    const resp = await fetch(GATEWAY, {
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

    if (resp.status === 429) return json({ erro: "Limite de uso atingido. Tente novamente em instantes." }, 429);
    if (resp.status === 402) return json({ erro: "Créditos de IA esgotados." }, 402);
    if (!resp.ok) return json({ erro: `Falha na IA (${resp.status}): ${await resp.text()}` }, 500);

    const data = await resp.json();
    const texto: string = data?.choices?.[0]?.message?.content ?? "";
    const limpo = texto.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();

    try {
      return json(JSON.parse(limpo));
    } catch {
      return json({ erro: "A IA respondeu em formato inesperado.", bruto: limpo }, 500);
    }
  } catch (e) {
    return json({ erro: (e as Error).message }, 500);
  }
});
