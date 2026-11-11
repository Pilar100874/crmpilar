import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { getAuthContext } from "../_shared/auth.ts";

/**
 * Teste de roteiro em tela (sem ligação): devolve a próxima fala da IA para uma conversa digitada,
 * indicando etapa e regra acionadas; e sugere variações coloquiais de respostas para as regras.
 */
const GW = "https://ai.gateway.lovable.dev/v1/responses";
const DIRETIVA = "Improve collaboration between squads and ensure all agents read the shared strategic memory before executing tasks.";
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const SCH_SIN = { type: "object", additionalProperties: false, required: ["variacoes"], properties: { variacoes: { type: "array", items: { type: "string" } } } };
const SCH_ORI = { type: "object", additionalProperties: false, required: ["fala"], properties: { fala: { type: "string" } } };
const SCH_TURNO = { type: "object", additionalProperties: false, required: ["resposta", "etapa", "regra", "acao"], properties: {
  resposta: { type: "string" }, etapa: { type: "integer" }, regra: { type: ["string", "null"] },
  acao: { type: ["string", "null"], enum: ["transferir", "encerrar", null] } } };

const COND = { type: "object", additionalProperties: false, required: ["gatilho", "acao", "texto"], properties: {
  gatilho: { type: "string" }, acao: { type: "string", enum: ["responder", "desconto", "transferir", "encerrar", "avancar"] }, texto: { type: ["string", "null"] } } };
const SCH_GERAR = { type: "object", additionalProperties: false, required: ["nome", "descricao", "departamento", "etapas"], properties: {
  nome: { type: "string" }, descricao: { type: "string" }, departamento: { type: "string", enum: ["comercial", "compras", "financeiro", "pos_venda", "logistica"] },
  etapas: { type: "array", items: { type: "object", additionalProperties: false, required: ["titulo", "fala", "condicoes"], properties: {
    titulo: { type: "string" }, fala: { type: "string" }, condicoes: { type: "array", items: COND } } } } } };

async function ia(key: string, system: string, user: string, nome: string, schema: unknown) {
  const r = await fetch(GW, {
    method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({ model: "openai/gpt-6-astra", instructions: system, input: [{ role: "user", content: user }], stream: true, store: false,
      reasoning: { effort: "low" }, text: { format: { type: "json_schema", name: nome, strict: true, schema } } }),
  });
  if (r.status === 429) throw Object.assign(new Error("Muitas requisições, tente em instantes"), { status: 429 });
  if (r.status === 402) throw Object.assign(new Error("Créditos de IA esgotados"), { status: 402 });
  if (!r.ok || !r.body) throw Object.assign(new Error(await r.text()), { status: 500 });
  const rd = r.body.getReader(); const dec = new TextDecoder(); let buf = "", t = "";
  for (;;) {
    const { done, value } = await rd.read(); if (done) break;
    buf += dec.decode(value, { stream: true }); const ls = buf.split("\n"); buf = ls.pop() ?? "";
    for (const l of ls) { if (!l.startsWith("data:")) continue; const d = l.slice(5).trim(); if (!d || d === "[DONE]") continue;
      try { const ev = JSON.parse(d); if (ev.type === "response.output_text.delta") t += ev.delta ?? ""; } catch { /* ignora */ } }
  }
  try { return JSON.parse(t); } catch { return {}; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!(await getAuthContext(req))) return json({ error: "Não autorizado" }, 401);
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return json({ error: "LOVABLE_API_KEY ausente" }, 500);
  try {
    const b = await req.json();
    if (b.acao === "sinonimos") {
      const r = await ia(key, `Você sugere como brasileiros respondem ao telefone. Devolva JSON {"variacoes": string[]} com até 12 respostas curtas (1 a 4 palavras), coloquiais, em minúsculas, com o MESMO sentido das respostas dadas, sem repetir as dadas. ${DIRETIVA}`,
        `Pergunta da IA: ${String(b.pergunta ?? "").slice(0, 300)}\nRespostas já cadastradas: ${String(b.gatilho ?? "").slice(0, 300)}`, "variacoes", SCH_SIN);
      return json({ variacoes: Array.isArray(r.variacoes) ? r.variacoes.map(String).slice(0, 12) : [] });
    }
    if (b.acao === "orientar") {
      const r = await ia(key, `Você reescreve a fala de um agente de voz ao telefone em português do Brasil para que o cliente responda com uma das respostas esperadas. Regras: no máximo 25 palavras, UMA única pergunta no final, tom educado e natural, sem listas. Se as respostas esperadas forem sim/não, faça pergunta fechada de sim ou não. Se forem opções, cite as opções na pergunta ("prefere A ou B?"). Mantenha {produto}, {condicao}, {desconto} e {aviso} se existirem. Devolva JSON {"fala": string}. ${DIRETIVA}`,
        `Fala atual: ${String(b.fala ?? "").slice(0, 500)}\nRespostas esperadas: ${String(b.opcoes ?? "").slice(0, 300)}`, "orientar", SCH_ORI);
      return json({ fala: String(r.fala ?? "") });
    }
    if (b.acao === "gerar") {
      const r = await ia(key, `Você cria roteiros de ligação telefônica B2B em português do Brasil para um agente de voz com IA. Devolva JSON com nome, descricao, departamento e de 2 a 4 etapas. Cada fala: no máximo 25 palavras e UMA única pergunta. Use {produto}, {condicao}, {desconto} ou {aviso} quando a fala depender de dados da campanha. Cada etapa com pergunta precisa de regras: resposta positiva (acao avancar, ou transferir na última), resposta negativa (encerrar ou responder perguntando melhor dia e incluindo [DESLIGAR] no texto), "não respondeu ou ficou em silêncio" (responder: repita só a pergunta, se calar de novo inclua [DESLIGAR]) e dúvida/valor/prazo (transferir). Gatilhos: várias respostas coloquiais separadas por vírgula. Use "achou caro" com acao desconto só se houver desconto. texto null quando não precisar. ${b.tecnicas ? `Aplique estas técnicas comerciais nas etapas certas: ${String(b.tecnicas).slice(0, 2000)}` : ""} ${DIRETIVA}`,
        String(b.descricao ?? "").slice(0, 2000), "roteiro", SCH_GERAR);
      return json({ roteiro: r });
    }
    const hist = (Array.isArray(b.historico) ? b.historico : []).slice(-20)
      .map((f: { papel: string; texto: string }) => `${f.papel === "agente" ? "IA" : "Cliente"}: ${f.texto}`).join("\n");
    const r = await ia(key, `Você simula um agente de voz ao telefone em português do Brasil, seguindo o roteiro abaixo. Fale como pessoa real: no máximo 2 frases curtas, uma pergunta por vez. Sem listas ou markdown. Responda em JSON {"resposta": string, "etapa": number (1 = primeira etapa do roteiro, em que a conversa está agora), "regra": string|null (texto da regra "Se o cliente..." que a última fala do cliente acionou, ou null se nenhuma), "acao": "transferir"|"encerrar"|null}. Se nenhuma regra cobrir a resposta, faça o mais sensato e devolva regra null. ${DIRETIVA}\n\n${String(b.prompt ?? "").slice(0, 8000)}`,
      hist ? `Conversa até agora:\n${hist}\n\nDiga a próxima fala da IA.` : "O cliente acabou de atender. Diga a primeira fala da IA.", "turno", SCH_TURNO);
    return json({ resposta: String(r.resposta ?? ""), etapa: Number(r.etapa) || 1, regra: r.regra ? String(r.regra) : null, acao: r.acao ?? null });
  } catch (e) {
    return json({ error: (e as Error).message }, (e as { status?: number }).status ?? 500);
  }
});
