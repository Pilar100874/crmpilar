import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, resourceContext } = await req.json();

    console.log('Generating n8n workflow with context:', { promptLength: prompt?.length, resourceContext: !!resourceContext });

    const systemPrompt = `Você é um especialista em n8n workflow automation. Gere workflows n8n válidos em JSON PURO.

${resourceContext || ''}

REGRAS CRÍTICAS - SIGA TODAS:
1. Retorne APENAS JSON puro, sem \`\`\`json ou \`\`\` 
2. TODAS as strings devem estar em UMA ÚNICA LINHA - NUNCA quebre strings em múltiplas linhas
3. Use \\n para quebras de linha DENTRO de strings
4. Escape aspas duplas com \\"
5. Use aspas duplas para strings, NUNCA aspas simples
6. NÃO inclua comentários
7. NÃO use trailing commas
8. Mantenha textos de prompts/descrições CURTOS (máximo 200 caracteres)

EXEMPLO DE STRING CORRETA:
"prompt": "Gere uma imagem de um produto. Use cores vibrantes e fundo branco."

EXEMPLO ERRADO (NUNCA FAÇA ISSO):
"prompt": "Gere uma imagem 
de um produto"

ESTRUTURA DO WORKFLOW:
{"name":"Nome","nodes":[{"id":"uuid","name":"Node","type":"n8n-nodes-base.webhook","typeVersion":2,"position":[240,300],"parameters":{"httpMethod":"POST","path":"webhook-path"}}],"connections":{},"active":false,"settings":{"executionOrder":"v1"}}

NODES DISPONÍVEIS:
- n8n-nodes-base.webhook (typeVersion:2) - Trigger HTTP
- n8n-nodes-base.openAi (typeVersion:1) - OpenAI API
- n8n-nodes-base.httpRequest (typeVersion:4) - HTTP genérico
- n8n-nodes-base.set (typeVersion:3) - Manipular dados
- n8n-nodes-base.code (typeVersion:2) - JavaScript

VARIÁVEIS: ={{$env.NOME_VAR}}

Após o JSON, adicione "---ENV_VARS---" e liste: NOME|Descrição|Exemplo`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', errorText);
      throw new Error(`AI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

    console.log('Workflow generated successfully, length:', content.length);

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error in generate-n8n-workflow:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro ao gerar workflow';
    return new Response(JSON.stringify({ 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
