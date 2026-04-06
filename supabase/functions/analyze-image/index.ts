import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageBase64, tipoObjeto } = await req.json();
    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "Imagem não fornecida" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Map tipo to label - if it's a custom string (generic), use it directly
    const tipoMap: Record<string, string> = {
      pacotes_graficos: "pacotes gráficos empilhados",
      caixas: "caixas",
      fardos: "fardos",
    };
    const tipoLabel = tipoMap[tipoObjeto] || tipoObjeto || "objetos/volumes";

    const systemPrompt = `Você é um sistema de visão computacional de alta precisão, especializado em contar ${tipoLabel} em imagens industriais e logísticas.

MÉTODO DE CONTAGEM OBRIGATÓRIO — siga rigorosamente:
1. Divida a imagem mentalmente em uma grade (linhas horizontais e colunas verticais).
2. Conte fileira por fileira, de cima para baixo, da esquerda para a direita.
3. Para cada fileira, conte coluna por coluna.
4. Numere sequencialmente cada item encontrado (1, 2, 3...).
5. Se itens estão parcialmente ocultos ou sobrepostos, INCLUA-OS na contagem estimando sua posição.
6. Após contar, RECONFERE o total percorrendo a grade novamente.
7. Forneça bounding boxes em coordenadas percentuais (0-100) relativas à imagem.
8. Cada bounding box deve envolver individualmente UM ÚNICO item — não agrupe múltiplos itens.

REGRAS:
- Prefira SUPERESTIMAR levemente do que subestimar.
- Itens parcialmente visíveis nas bordas DEVEM ser contados.
- Retorne confiança individual realista (0.0 a 1.0) para cada detecção.
- Use a function tool fornecida OBRIGATORIAMENTE para responder.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: `Analise cuidadosamente esta imagem. Conte TODOS os ${tipoLabel} visíveis, um por um, numerando-os sequencialmente. Use o método de grade (fileira por fileira). Retorne bounding boxes individuais para cada item.` },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "report_detection",
              description: "Report detected objects with bounding boxes",
              parameters: {
                type: "object",
                properties: {
                  total_detectado: { type: "integer" },
                  confianca_media: { type: "number" },
                  deteccoes: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "integer" },
                        label: { type: "string" },
                        confianca: { type: "number" },
                        bbox: {
                          type: "object",
                          properties: {
                            x: { type: "number" },
                            y: { type: "number" },
                            width: { type: "number" },
                            height: { type: "number" },
                          },
                          required: ["x", "y", "width", "height"],
                        },
                      },
                      required: ["id", "label", "confianca", "bbox"],
                    },
                  },
                  observacao_ia: { type: "string" },
                },
                required: ["total_detectado", "confianca_media", "deteccoes"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "report_detection" } },
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      const statusMap: Record<number, string> = {
        429: "Limite de requisições atingido, tente novamente.",
        402: "Créditos insuficientes.",
      };
      return new Response(
        JSON.stringify({ error: statusMap[response.status] || "Erro ao processar imagem" }),
        { status: response.status >= 400 && response.status < 500 ? response.status : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "IA não retornou resultado válido" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const detection = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(detection), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-image error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
