import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const startTime = Date.now();
    const { imageBase64, estabelecimentoId } = await req.json();
    
    if (!imageBase64) {
      throw new Error('Imagem não fornecida');
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    console.log('Processando imagem com IA...');

    // Chamar Lovable AI com visão para extrair dados estruturados
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Você é um assistente que extrai informações de orçamentos escritos à mão.
Analise a imagem e extraia TODOS os itens listados com:
- quantidade (número)
- material/produto (descrição do item)
- valor (preço unitário em número, sem símbolos)

Se algum campo não estiver legível ou não existir, use null.
Retorne TODOS os itens que conseguir identificar, mesmo que parcialmente.`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extraia os itens deste orçamento manuscrito. Para cada item identifique: quantidade, material/produto e valor unitário."
              },
              {
                type: "image_url",
                image_url: {
                  url: imageBase64
                }
              }
            ]
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_orcamento_items",
              description: "Extrai itens de um orçamento manuscrito",
              parameters: {
                type: "object",
                properties: {
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        quantidade: {
                          type: "number",
                          description: "Quantidade do item (número)"
                        },
                        material: {
                          type: "string",
                          description: "Nome/descrição do material ou produto"
                        },
                        valor_unitario: {
                          type: "number",
                          description: "Valor unitário do item (apenas número, sem símbolo de moeda)"
                        },
                        confianca: {
                          type: "string",
                          enum: ["alta", "media", "baixa"],
                          description: "Nível de confiança na extração deste item"
                        }
                      },
                      required: ["quantidade", "material", "valor_unitario", "confianca"]
                    }
                  }
                },
                required: ["items"]
              }
            }
          }
        ],
        tool_choice: {
          type: "function",
          function: { name: "extract_orcamento_items" }
        }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos em Settings -> Workspace -> Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("Erro da API:", response.status, errorText);
      throw new Error(`Erro ao processar imagem: ${response.status}`);
    }

    const data = await response.json();
    console.log('Resposta da IA:', JSON.stringify(data, null, 2));

    // Extrair resultado da tool call
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("Nenhum item foi extraído da imagem");
    }

    const extractedData = JSON.parse(toolCall.function.arguments);
    const duracao = Date.now() - startTime;
    console.log('Dados extraídos:', JSON.stringify(extractedData, null, 2));

    // Log usage
    if (estabelecimentoId) {
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      await supabase.from('ia_usage_log').insert({
        estabelecimento_id: estabelecimentoId,
        contexto: 'extract_items',
        provider: 'lovable',
        model: 'google/gemini-2.5-flash',
        prompt_tokens: data.usage?.prompt_tokens || 0,
        completion_tokens: data.usage?.completion_tokens || 0,
        total_tokens: data.usage?.total_tokens || 0,
        custo_estimado: 0,
        duracao_ms: duracao,
        sucesso: true,
        metadata: { items_count: extractedData.items?.length || 0 }
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        items: extractedData.items || []
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error("Erro ao processar imagem:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Erro ao processar imagem",
        success: false
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
