const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const {
      tema,
      categoria,
      responsavel,
      contexto,
      modo, // 'tema' | 'topicos' | 'ajustar'
      topicos, // texto livre com tópicos
      textoAtual, // conteúdo atual (para ajustar)
      tituloAtual,
      resumoAtual,
      instrucao, // instruções extras / ajuste
    } = body ?? {};

    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const system = `Você é especialista em compliance e políticas internas corporativas brasileiras.
Gere uma política interna clara, profissional, em português do Brasil, pronta para publicação.
Formato de saída OBRIGATÓRIO em JSON:
{
  "title": "Título curto e objetivo",
  "summary": "Resumo em 1-2 frases",
  "content": "Texto completo em markdown simples com seções: **1. Objetivo**, **2. Abrangência**, **3. Diretrizes**, **4. Responsabilidades**, **5. Descumprimento**, **6. Vigência**. Use listas com - quando fizer sentido.",
  "keywords": ["palavra1","palavra2","palavra3","palavra4","palavra5"]
}
Não escreva nada fora do JSON.`;

    let userPrompt = "";
    if (modo === "topicos") {
      if (!topicos || typeof topicos !== "string" || !topicos.trim()) {
        return new Response(JSON.stringify({ error: "topicos é obrigatório" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userPrompt = `A partir dos tópicos abaixo, produza uma política interna completa, coerente e formal, expandindo cada tópico em texto profissional e agrupando em seções.
${categoria ? `Categoria: ${categoria}\n` : ""}${responsavel ? `Área responsável: ${responsavel}\n` : ""}${contexto ? `Contexto adicional: ${contexto}\n` : ""}
TÓPICOS FORNECIDOS PELO USUÁRIO:
"""
${topicos.trim()}
"""`;
    } else if (modo === "ajustar") {
      if (!textoAtual || !instrucao) {
        return new Response(
          JSON.stringify({ error: "textoAtual e instrucao são obrigatórios" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      userPrompt = `Refine/ajuste a política abaixo seguindo estritamente as instruções do usuário. Mantenha o formato (seções, listas) e apenas retorne o JSON no formato pedido.
${categoria ? `Categoria: ${categoria}\n` : ""}${responsavel ? `Área responsável: ${responsavel}\n` : ""}
TÍTULO ATUAL: ${tituloAtual ?? ""}
RESUMO ATUAL: ${resumoAtual ?? ""}
CONTEÚDO ATUAL:
"""
${textoAtual}
"""

INSTRUÇÃO DE AJUSTE DO USUÁRIO:
"""
${instrucao}
"""`;
    } else {
      // modo tema (padrão)
      if (!tema || typeof tema !== "string") {
        return new Response(JSON.stringify({ error: "tema é obrigatório" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userPrompt = `Tema da política: ${tema}
${categoria ? `Categoria: ${categoria}` : ""}
${responsavel ? `Área responsável: ${responsavel}` : ""}
${contexto ? `Contexto adicional: ${contexto}` : ""}`;
    }

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      return new Response(JSON.stringify({ error: `AI Gateway ${resp.status}: ${t}` }), {
        status: resp.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const raw = data.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) parsed = JSON.parse(m[0]);
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
