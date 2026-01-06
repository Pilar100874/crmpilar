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

    const systemPrompt = `Você é um especialista em n8n workflow automation.

${resourceContext || ''}

REGRAS ABSOLUTAS:
1. Retorne APENAS JSON puro (sem \`\`\`json)
2. Strings em UMA LINHA (use \\n para quebras internas)
3. O campo "connections" NUNCA pode estar vazio {}

=== CONNECTIONS É OBRIGATÓRIO ===
Para cada node (exceto o último), você DEVE criar uma conexão.
Se você tem nodes A -> B -> C -> D, o connections será:
"connections": {
  "A": {"main": [[{"node": "B", "type": "main", "index": 0}]]},
  "B": {"main": [[{"node": "C", "type": "main", "index": 0}]]},
  "C": {"main": [[{"node": "D", "type": "main", "index": 0}]]}
}

O nome usado em connections DEVE ser EXATAMENTE o valor do campo "name" do node.

=== ESTRUTURA COMPLETA OBRIGATÓRIA ===
{
  "name": "Nome do Workflow",
  "nodes": [
    {"id": "uuid1", "name": "Webhook", "type": "n8n-nodes-base.webhook", "typeVersion": 2, "position": [100, 300], "parameters": {"httpMethod": "POST", "path": "endpoint"}, "webhookId": "wh1"},
    {"id": "uuid2", "name": "Processar", "type": "n8n-nodes-base.set", "typeVersion": 3.4, "position": [340, 300], "parameters": {"options": {}}},
    {"id": "uuid3", "name": "Responder", "type": "n8n-nodes-base.respondToWebhook", "typeVersion": 1.1, "position": [580, 300], "parameters": {"respondWith": "json", "responseBody": "={{ $json }}", "options": {}}}
  ],
  "connections": {
    "Webhook": {"main": [[{"node": "Processar", "type": "main", "index": 0}]]},
    "Processar": {"main": [[{"node": "Responder", "type": "main", "index": 0}]]}
  },
  "active": false,
  "settings": {"executionOrder": "v1"},
  "pinData": {},
  "versionId": "1"
}

=== NODES DISPONÍVEIS ===
- Webhook: n8n-nodes-base.webhook (typeVersion: 2)
- Set: n8n-nodes-base.set (typeVersion: 3.4)
- OpenAI: @n8n/n8n-nodes-langchain.openAi (typeVersion: 1.8)
- HTTP Request: n8n-nodes-base.httpRequest (typeVersion: 4.2)
- Respond to Webhook: n8n-nodes-base.respondToWebhook (typeVersion: 1.1)
- Code: n8n-nodes-base.code (typeVersion: 2)

=== CREDENCIAIS OPENAI ===
"credentials": {"openAiApi": {"id": "cred1", "name": "OpenAI account"}}

=== VARIÁVEIS DE AMBIENTE ===
Use: ={{ $env.NOME_VARIAVEL }}

Após o JSON, adicione "---ENV_VARS---" seguido de: NOME|Descrição|Exemplo`;

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
