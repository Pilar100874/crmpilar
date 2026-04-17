import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { description, agent_name } = await req.json();
    if (!description?.trim()) {
      return new Response(JSON.stringify({ error: "Descrição é obrigatória" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `Você é um especialista em engenharia de prompts para agentes de atendimento ao cliente.

Dado uma descrição do que o agente deve fazer, gere um Agent Card profissional e completo para um chatbot de atendimento.

IMPORTANTE: Todos os campos devem ser em português brasileiro. Seja específico e prático — evite generalidades.

O agente "${agent_name || 'Agente'}" será usado em um sistema de atendimento para auxiliar atendentes humanos ou responder diretamente a clientes.

Retorne EXATAMENTE um JSON com os seguintes campos:
- papel: string (1-3 frases descrevendo quem é o agente e sua especialidade)
- missao: string (1-2 frases sobre o objetivo principal)
- tom_de_voz: string (como deve se comunicar: formal, informal, técnico, etc.)
- capacidades: string[] (5-8 habilidades específicas do agente)
- restricoes: string[] (3-5 coisas que o agente NÃO deve fazer)
- protocolo_raciocinio: string[] (5-7 passos ordenados que o agente segue ao processar uma pergunta)
- padroes_qualidade: string[] (3-5 critérios de qualidade para as respostas)
- anti_padroes: string[] (3-4 comportamentos proibidos)
- tratamento_erros: string (como reagir quando não tem informação suficiente)
- instrucoes_extras: string (instruções adicionais relevantes)
- escopo_agente: string (3-5 frases respondendo, em primeira pessoa, "o que eu sei e o que eu não sei". Liste claramente: temas/produtos/áreas que o agente cobre, e temas que ele NÃO cobre. Será exibido literalmente quando o cliente perguntar sobre o próprio agente — ex: "o que você sabe?", "qual seu escopo?", "o que não sabe responder?". Exemplo: "Sou especialista em X, Y e Z. Posso ajudar com A, B e C. Não respondo sobre preços, prazos de entrega ou temas fora do meu escopo — nesses casos, encaminhe para um atendente humano.")

Diretrizes de qualidade:
- Capacidades devem ser ESPECÍFICAS e acionáveis (não genéricas)
- Restrições devem prevenir erros comuns de chatbots
- O protocolo de raciocínio deve ser uma sequência lógica clara
- Anti-padrões devem listar comportamentos realistas a evitar
- Tom de voz deve ser descritivo e dar exemplos
- Escopo do agente deve ser direto, em primeira pessoa, listar coberturas E exclusões`;

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
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI error:", response.status, errorText);
      throw new Error(`Erro na IA: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      // Try to extract JSON from markdown
      const jsonMatch = content?.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1]);
      } else {
        throw new Error("Não foi possível parsear a resposta da IA");
      }
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("generate-chat-agent-prompt error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
