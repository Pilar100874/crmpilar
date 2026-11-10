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
const SCH_TURNO = { type: "object", additionalProperties: false, required: ["resposta", "etapa", "regra", "acao"], properties: {
  resposta: { type: "string" }, etapa: { type: "integer" }, regra: { type: ["string", "null"] },
  acao: { type: ["string", "null"], enum: ["transferir", "encerrar", null] } } };

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
    const hist = (Array.isArray(b.historico) ? b.historico : []).slice(-20)
      .map((f: { papel: string; texto: string }) => `${f.papel === "agente" ? "IA" : "Cliente"}: ${f.texto}`).join("\n");
    const r = await ia(key, `Você simula um agente de voz ao telefone em português do Brasil, seguindo o roteiro abaixo. Fale como pessoa real: no máximo 2 frases curtas, uma pergunta por vez. Sem listas ou markdown. Responda em JSON {"resposta": string, "etapa": number (1 = primeira etapa do roteiro, em que a conversa está agora), "regra": string|null (texto da regra "Se o cliente..." que a última fala do cliente acionou, ou null se nenhuma), "acao": "transferir"|"encerrar"|null}. Se nenhuma regra cobrir a resposta, faça o mais sensato e devolva regra null. ${DIRETIVA}\n\n${String(b.prompt ?? "").slice(0, 8000)}`,
      hist ? `Conversa até agora:\n${hist}\n\nDiga a próxima fala da IA.` : "O cliente acabou de atender. Diga a primeira fala da IA.", "turno", SCH_TURNO);
    return json({ resposta: String(r.resposta ?? ""), etapa: Number(r.etapa) || 1, regra: r.regra ? String(r.regra) : null, acao: r.acao ?? null });
  } catch (e) {
    return json({ error: (e as Error).message }, (e as { status?: number }).status ?? 500);
  }
});
