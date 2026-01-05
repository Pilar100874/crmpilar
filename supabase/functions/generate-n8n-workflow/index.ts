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

    const systemPrompt = `Você é um especialista em n8n workflow automation. Sua tarefa é gerar workflows n8n válidos em formato JSON.

${resourceContext || ''}

REGRAS CRÍTICAS DE FORMATAÇÃO:
1. Retorne APENAS o JSON puro do workflow, SEM blocos de código markdown
2. NÃO use \`\`\`json ou \`\`\` ao redor do JSON
3. O JSON deve começar com { e terminar com }
4. Use aspas duplas para strings, NUNCA aspas simples
5. NÃO inclua comentários dentro do JSON
6. NÃO use trailing commas
7. Escape corretamente caracteres especiais em strings

ESTRUTURA OBRIGATÓRIA DO WORKFLOW n8n:
{
  "name": "Nome do Workflow",
  "nodes": [
    {
      "id": "uuid-unico",
      "name": "Nome do Node",
      "type": "tipo.do.node",
      "typeVersion": 1,
      "position": [x, y],
      "parameters": {}
    }
  ],
  "connections": {
    "Nome do Node Origem": {
      "main": [[{"node": "Nome do Node Destino", "type": "main", "index": 0}]]
    }
  },
  "active": false,
  "settings": {
    "executionOrder": "v1"
  }
}

NODES COMUNS:
1. Webhook Trigger:
   - type: "n8n-nodes-base.webhook"
   - typeVersion: 2
   
2. OpenAI (texto/imagem):
   - type: "n8n-nodes-base.openAi"
   - typeVersion: 1
   - Para imagens use operation: "image" e resource: "image"
   
3. HTTP Request:
   - type: "n8n-nodes-base.httpRequest"
   - typeVersion: 4

VARIÁVEIS DE AMBIENTE (use exatamente este formato):
- ={{$env.OPENAI_API_KEY}}
- ={{$env.WHATSAPP_TOKEN}}
- ={{$env.WHATSAPP_PHONE_ID}}
- ={{$env.INSTAGRAM_ACCESS_TOKEN}}
- ={{$env.FACEBOOK_ACCESS_TOKEN}}
- ={{$env.TELEGRAM_BOT_TOKEN}}
- ={{$env.SMTP_HOST}}
- ={{$env.SMTP_USER}}
- ={{$env.SMTP_PASSWORD}}

Após o JSON, adicione uma linha com exatamente "---ENV_VARS---" e depois liste as variáveis no formato:
NOME_VARIAVEL|Descrição|Exemplo`;

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
