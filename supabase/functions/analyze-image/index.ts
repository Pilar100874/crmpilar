import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { imageBase64, tipoObjeto } = await req.json();
    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "Imagem não fornecida" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const tipoLabel = {
      pacotes_graficos: "pacotes gráficos empilhados",
      caixas: "caixas",
      fardos: "fardos",
      generico: "objetos/volumes",
    }[tipoObjeto] || "objetos/volumes";

    const systemPrompt = `Você é um sistema de visão computacional especializado em contar ${tipoLabel} em imagens. 
Analise a imagem fornecida e identifique cada ${tipoLabel} visível.
Responda OBRIGATORIAMENTE no formato JSON usando a function tool fornecida.
Seja preciso na contagem. Se objetos estiverem parcialmente ocultos, estime com base no padrão visível.
Para cada objeto detectado, forneça coordenadas aproximadas de bounding box em percentual (0-100) da imagem.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: `Conte todos os ${tipoLabel} visíveis nesta imagem. Retorne as coordenadas de bounding box para cada um.` },
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
                  total_detectado: { type: "integer", description: "Total de objetos detectados" },
                  confianca_media: { type: "number", description: "Confiança média de 0 a 1" },
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
                            x: { type: "number", description: "X em percentual (0-100)" },
                            y: { type: "number", description: "Y em percentual (0-100)" },
                            width: { type: "number", description: "Largura em percentual" },
                            height: { type: "number", description: "Altura em percentual" },
                          },
                          required: ["x", "y", "width", "height"],
                        },
                      },
                      required: ["id", "label", "confianca", "bbox"],
                    },
                  },
                  observacao_ia: { type: "string", description: "Observações sobre a análise" },
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
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições atingido, tente novamente em instantes." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro ao processar imagem" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
