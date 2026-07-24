// Revisor de português (ortografia + concordância verbal) usando Lovable AI.
// Uso: em qualquer edge function que gere imagem/vídeo, passe o texto/prompt aqui
// antes de enviar ao modelo, para garantir que a mensagem exibida não contenha
// erros de português.

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.6-flash";

export async function revisarPortugues(input: string): Promise<string> {
  const original = (input || "").trim();
  if (!original) return input || "";
  // Textos muito curtos (1-2 palavras) raramente ganham com revisão e podem ser
  // corrompidos. Evita chamada.
  if (original.length < 4) return input;

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return input; // sem chave: falha aberto, não bloqueia geração

  try {
    const resp = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "system",
            content:
              "Você é um revisor de português do Brasil. Corrija SOMENTE erros ortográficos, " +
              "acentuação e concordância verbal/nominal do texto do usuário. NÃO reescreva, " +
              "NÃO traduza, NÃO reorganize, NÃO adicione ou remova ideias, NÃO adicione " +
              "explicações, aspas ou markdown. Preserve emojis, variáveis {{...}}, links, " +
              "quebras de linha, números, marcas e nomes próprios. Se o texto já estiver " +
              "correto, devolva-o exatamente como recebido. Responda APENAS com o texto revisado.",
          },
          { role: "user", content: original },
        ],
        temperature: 0,
      }),
      // Deadline curto para não atrasar a geração
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return input;
    const data = await resp.json();
    let out = data?.choices?.[0]?.message?.content;
    if (typeof out !== "string") return input;
    out = out.trim();
    // Remove aspas envolventes se o modelo insistir
    if (
      (out.startsWith('"') && out.endsWith('"')) ||
      (out.startsWith("'") && out.endsWith("'"))
    ) {
      out = out.slice(1, -1);
    }
    if (!out) return input;
    // Segurança: se a revisão alterou drasticamente o tamanho (>2.5x ou <0.4x),
    // devolve original para não corromper prompts técnicos.
    const ratio = out.length / original.length;
    if (ratio > 2.5 || ratio < 0.4) return input;
    return out;
  } catch (_e) {
    return input;
  }
}
