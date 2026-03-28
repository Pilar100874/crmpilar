import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, blockDefinitions, workflowType } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Build block catalog for the AI
    const blockCatalog = blockDefinitions.map((b: any) => ({
      type: b.type,
      label: b.label,
      description: b.description,
      category: b.category || "geral",
      defaultData: b.defaultData || {},
    }));

    const systemPrompt = `Você é um assistente especializado em construir workflows visuais. Sua tarefa é interpretar a regra de negócio descrita pelo usuário e gerar os blocos (nodes) e conexões (edges) corretas para um editor de workflow do tipo "${workflowType}".

## REGRAS CRÍTICAS:
1. Você SÓ pode usar os tipos de blocos listados abaixo. NÃO invente blocos novos.
2. Cada bloco deve ter um ID único no formato "ai_node_TIMESTAMP_INDEX" (use números sequenciais).
3. As posições (x, y) devem ser organizadas de cima para baixo, com espaçamento adequado (y += 150 entre níveis, x para ramificações).
4. Sempre comece com o bloco de início/sistema se existir um.
5. Conecte os blocos com edges lógicas usando sourceHandle e targetHandle quando necessário.
6. Para blocos de condição com saídas "Sim/Não", use sourceHandle "yes" e "no".
7. Configure os blocos com valores realistas baseados na descrição do usuário.
8. Retorne APENAS o JSON, sem texto adicional.

## BLOCOS DISPONÍVEIS:
${JSON.stringify(blockCatalog, null, 2)}

## FORMATO DE SAÍDA (JSON):
{
  "nodes": [
    {
      "id": "ai_node_1",
      "type": "custom",
      "position": { "x": 400, "y": 50 },
      "data": {
        "type": "TIPO_DO_BLOCO",
        "label": "Label do Bloco",
        "config": { ...configurações específicas... }
      }
    }
  ],
  "edges": [
    {
      "id": "ai_edge_1",
      "source": "ai_node_1",
      "target": "ai_node_2",
      "sourceHandle": null,
      "targetHandle": null,
      "type": "smoothstep"
    }
  ],
  "explanation": "Breve explicação em português do fluxo gerado"
}

Responda APENAS com o JSON válido.`;

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
          { role: "user", content: `Crie um workflow para a seguinte regra: ${prompt}` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos na área de configurações." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("Erro ao gerar workflow");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Extract JSON from response (may be wrapped in ```json ... ```)
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1];

    // Try to parse
    const result = JSON.parse(jsonStr.trim());

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-workflow error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
