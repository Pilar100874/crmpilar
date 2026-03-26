import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { messages, regras_atuais, modo, system_prompt_override } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let systemPrompt: string;

    if (modo === 'simular' && system_prompt_override) {
      // Simulation mode: use the agent's actual prompt + rules to simulate behavior
      systemPrompt = system_prompt_override;
    } else if (modo === 'refinar') {
      // Refine mode: analyze simulation and fix rules
      systemPrompt = `Você é um especialista em otimizar REGRAS DE BUSCA E NEGÓCIO para agentes de IA.

Você receberá:
1. As regras atuais do agente
2. Um trecho de simulação mostrando como o agente se comportou
3. Um problema reportado pelo usuário

Seu trabalho:
- Analise o problema reportado
- Identifique qual parte das regras causou o comportamento incorreto
- Gere as regras COMPLETAS corrigidas (não apenas a parte alterada)
- Explique brevemente o que mudou e por quê

FORMATO: Gere as regras corrigidas entre:
<!--RULES_START-->
[Regras completas corrigidas]
<!--RULES_END-->

Antes das tags, explique em 2-3 frases o que foi corrigido.

IMPORTANTE: Mantenha TODAS as regras existentes que estavam funcionando. Apenas corrija/adicione o necessário.`;
    } else {
      // Default: create/modify rules conversationally
      systemPrompt = `Você é um especialista em criar REGRAS DE BUSCA E NEGÓCIO para agentes de IA que consultam catálogos de produtos.

Seu objetivo é ajudar o usuário a definir regras claras e estruturadas que serão injetadas no prompt do agente de IA. Essas regras determinam como o agente deve buscar produtos, sugerir alternativas, calcular cortes/perdas, e interagir com o cliente.

CONTEXTO: O sistema trabalha com catálogos que podem incluir:
- Papéis gráficos formatados (folhas com largura × comprimento)
- Bobinas (rolos com largura, cortados sob demanda)
- Produtos com especificações numéricas (gramatura, largura, comprimento, peso, etc.)
- Qualquer outro tipo de produto com características mensuráveis

SEU FLUXO DE TRABALHO:
1. Faça perguntas ao usuário para entender o negócio dele
2. Identifique os tipos de produtos e suas especificações relevantes
3. Entenda as regras de negócio (conjugação de corte, tolerâncias, perdas, etc.)
4. Gere as regras formatadas em linguagem clara para o agente

FORMATO DE SAÍDA:
Quando o usuário aprovar as regras, gere o texto final entre as tags:
<!--RULES_START-->
[Regras formatadas aqui]
<!--RULES_END-->

As regras devem ser:
- Escritas como instruções diretas para uma IA
- Com etapas numeradas e claras
- Com exemplos práticos
- Com fórmulas de cálculo quando aplicável
- Em português brasileiro

${regras_atuais ? `\nREGRAS ATUAIS DO AGENTE (use como base para modificações):\n${regras_atuais}\n` : ''}

IMPORTANTE: Seja conversacional e amigável. Faça perguntas uma de cada vez. Não gere as regras até o usuário confirmar que está satisfeito.`;
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: false,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`Erro na IA: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const resposta = aiData.choices?.[0]?.message?.content || "Não foi possível gerar uma resposta.";

    return new Response(JSON.stringify({ resposta }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("generate-agent-search-rules error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
