import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { description } = await req.json();
    if (!description?.trim()) {
      return new Response(JSON.stringify({ error: "Descrição é obrigatória" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `Você é um especialista em design de agentes de IA para um Motor de Estratégia de Marketing.

Dado uma descrição básica, você deve gerar um Agent Card completo e profissional.

Retorne EXATAMENTE o JSON chamando a função fornecida. Todos os campos devem ser em português brasileiro, exceto nomes técnicos.

Diretrizes:
- agent_key: snake_case, curto, descritivo (ex: analise_concorrencia)
- name: Nome profissional do agente
- role: Descrição clara do papel (1-2 frases)
- mission: Objetivo estratégico principal (1-2 frases)
- capabilities: 4-6 itens específicos do que o agente FAZ
- non_capabilities: 2-4 itens do que o agente NÃO deve fazer
- inputs: 3-5 tipos de dados que o agente aceita
- context_dependencies: 2-4 dados necessários da memória estratégica
- reasoning_protocol: 5-7 passos ordenados de raciocínio
- output_schema: JSON schema realista para o output do agente
- quality_standards: 3-5 critérios de qualidade
- anti_patterns: 2-4 comportamentos proibidos
- error_handling: Como reagir a dados insuficientes (1-2 frases)
- handoff: Para qual agente ou etapa o resultado deve ir
- description: Descrição curta (1 frase) para exibição na UI
- icon: Um emoji representativo
- color: Uma cor hex (escolha entre: #8B5CF6, #3B82F6, #10B981, #F59E0B, #EF4444, #6366F1, #EC4899, #14B8A6)`;

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
          { role: "user", content: `Crie um Agent Card completo para: ${description}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "create_agent_card",
            description: "Cria um Agent Card completo para o motor de estratégia",
            parameters: {
              type: "object",
              properties: {
                agent_key: { type: "string", description: "Chave única snake_case" },
                name: { type: "string" },
                role: { type: "string" },
                mission: { type: "string" },
                capabilities: { type: "array", items: { type: "string" } },
                non_capabilities: { type: "array", items: { type: "string" } },
                inputs: { type: "array", items: { type: "string" } },
                context_dependencies: { type: "array", items: { type: "string" } },
                reasoning_protocol: { type: "array", items: { type: "string" } },
                output_schema: { type: "object" },
                quality_standards: { type: "array", items: { type: "string" } },
                anti_patterns: { type: "array", items: { type: "string" } },
                error_handling: { type: "string" },
                handoff: { type: "string" },
                description: { type: "string" },
                icon: { type: "string" },
                color: { type: "string" },
              },
              required: ["agent_key", "name", "role", "mission", "capabilities", "non_capabilities",
                "inputs", "context_dependencies", "reasoning_protocol", "output_schema",
                "quality_standards", "anti_patterns", "error_handling", "handoff", "description", "icon", "color"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "create_agent_card" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione fundos em Settings > Workspace > Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("Erro no gateway de IA");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error("Resposta inesperada da IA");
    }

    const agentCard = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(agentCard), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-agent-card error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
