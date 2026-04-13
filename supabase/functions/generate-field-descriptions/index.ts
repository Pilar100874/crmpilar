import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { agentName, agentDescription, fields } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const fieldsText = fields.map((f: any) =>
      `- Nome: "${f.nome}", Tipo: ${f.tipo}, Obrigatório: ${f.obrigatorio ? 'Sim' : 'Não'}${f.descricao ? `, Descrição atual: "${f.descricao}"` : ''}`
    ).join('\n');

    const systemPrompt = `Você é um especialista em configuração de agentes de IA para atendimento comercial B2B.
Sua tarefa é gerar descrições detalhadas e úteis para campos de dados que um agente de IA usará para responder clientes.

Regras para as descrições:
1. Seja específico sobre O QUE é o campo
2. Explique QUANDO o agente deve usar essa informação
3. Inclua o FORMATO esperado quando relevante
4. Adicione REGRAS DE NEGÓCIO quando aplicável
5. Dê EXEMPLOS práticos
6. Cada descrição deve ter entre 1-3 frases
7. Escreva em português brasileiro

Responda APENAS com um JSON array de objetos com { "nome": string, "descricao": string } para cada campo.`;

    const userPrompt = `Agente: "${agentName}"${agentDescription ? `\nDescrição do agente: "${agentDescription}"` : ''}

Campos para gerar descrições:
${fieldsText}

Gere descrições detalhadas e contextuais para cada campo, considerando o propósito do agente.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "set_field_descriptions",
              description: "Define as descrições geradas para os campos do agente",
              parameters: {
                type: "object",
                properties: {
                  fields: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        nome: { type: "string", description: "Nome exato do campo" },
                        descricao: { type: "string", description: "Descrição detalhada e contextual do campo" },
                      },
                      required: ["nome", "descricao"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["fields"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "set_field_descriptions" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("Erro no gateway de IA");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("Resposta inesperada da IA");

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-field-descriptions error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
