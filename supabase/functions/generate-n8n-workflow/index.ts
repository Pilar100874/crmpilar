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

    const systemPrompt = `Você é um especialista em n8n workflow automation. Gere workflows n8n COMPLETOS e FUNCIONAIS.

${resourceContext || ''}

REGRAS CRÍTICAS:
1. Retorne APENAS JSON puro, sem markdown
2. TODAS as strings em UMA ÚNICA LINHA
3. Use \\n para quebras de linha dentro de strings

EXEMPLO COMPLETO DE WORKFLOW COM 3 NODES CONECTADOS:
{
  "name": "Meu Workflow",
  "nodes": [
    {
      "id": "node_webhook",
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2,
      "position": [240, 300],
      "parameters": {"httpMethod": "POST", "path": "meu-endpoint"},
      "webhookId": "wh1"
    },
    {
      "id": "node_openai",
      "name": "OpenAI",
      "type": "@n8n/n8n-nodes-langchain.openAi",
      "typeVersion": 1.8,
      "position": [480, 300],
      "parameters": {
        "modelId": {"__rl": true, "mode": "list", "value": "gpt-4o"},
        "options": {}
      },
      "credentials": {"openAiApi": {"id": "cred_openai", "name": "OpenAI"}}
    },
    {
      "id": "node_respond",
      "name": "Respond to Webhook",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.1,
      "position": [720, 300],
      "parameters": {"respondWith": "json", "responseBody": "={{ $json }}"}
    }
  ],
  "connections": {
    "Webhook": {"main": [[{"node": "OpenAI", "type": "main", "index": 0}]]},
    "OpenAI": {"main": [[{"node": "Respond to Webhook", "type": "main", "index": 0}]]}
  },
  "active": false,
  "settings": {"executionOrder": "v1"},
  "pinData": {},
  "versionId": "1"
}

IMPORTANTE - CONNECTIONS:
- SEMPRE conecte os nodes na ordem correta
- O nome no connections DEVE ser EXATAMENTE igual ao "name" do node
- Cada node (exceto o último) deve ter uma conexão para o próximo

NODES COMUNS:
1. Webhook (trigger): n8n-nodes-base.webhook, typeVersion: 2
2. OpenAI Chat: @n8n/n8n-nodes-langchain.openAi, typeVersion: 1.8
3. HTTP Request: n8n-nodes-base.httpRequest, typeVersion: 4.2  
4. Respond to Webhook: n8n-nodes-base.respondToWebhook, typeVersion: 1.1
5. Set Data: n8n-nodes-base.set, typeVersion: 3.4
6. Code: n8n-nodes-base.code, typeVersion: 2

CREDENCIAIS (adicione no node que precisa):
"credentials": {"openAiApi": {"id": "cred_openai", "name": "OpenAI"}}

Para HTTP Request com API key:
"parameters": {
  "url": "https://api.exemplo.com",
  "authentication": "genericCredentialType",
  "genericAuthType": "httpHeaderAuth",
  "options": {}
}

Após o JSON, adicione "---ENV_VARS---" e liste as variáveis necessárias: NOME|Descrição|Exemplo`;

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
