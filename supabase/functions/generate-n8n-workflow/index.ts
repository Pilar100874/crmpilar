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

    const systemPrompt = `Você é um especialista em n8n workflow automation. Sua tarefa é gerar workflows n8n válidos em formato JSON baseados em Recursos de Marketing de IA.

${resourceContext || ''}

REGRAS IMPORTANTES:
1. Gere APENAS o JSON válido do workflow, sem explicações antes ou depois
2. O JSON deve seguir a estrutura exata do n8n v1.0+
3. Use nodes oficiais do n8n
4. Inclua todas as conexões necessárias entre nodes

ESTRUTURA DO WORKFLOW:
1. TRIGGER: Webhook que receberá os dados dos campos de entrada
2. PROCESSAMENTO: 
   - Para retorno "image": usar node de IA para gerar imagem (ex: OpenAI DALL-E, Stability AI)
   - Para retorno "video": usar APIs de geração de vídeo
   - Para retorno "audio": usar APIs de TTS/geração de áudio
   - Para retorno "text": usar OpenAI/outro LLM para gerar texto
3. PUBLICAÇÃO (se canais configurados):
   - WhatsApp: usar node HTTP Request para API do WhatsApp Business
   - Instagram: usar node HTTP Request para Instagram Graph API
   - Facebook: usar node HTTP Request para Facebook Graph API
   - Telegram: usar node Telegram
   - Email: usar node Email/SMTP

REGRA CRÍTICA - VARIÁVEIS DE AMBIENTE:
- NUNCA use credenciais hardcoded
- Use expressões n8n: ={{$env.NOME_VARIAVEL}}

Variáveis comuns por serviço:
- OpenAI: ={{$env.OPENAI_API_KEY}}
- WhatsApp: ={{$env.WHATSAPP_TOKEN}}, ={{$env.WHATSAPP_PHONE_ID}}
- Instagram: ={{$env.INSTAGRAM_ACCESS_TOKEN}}, ={{$env.INSTAGRAM_ACCOUNT_ID}}
- Facebook: ={{$env.FACEBOOK_ACCESS_TOKEN}}, ={{$env.FACEBOOK_PAGE_ID}}
- Telegram: ={{$env.TELEGRAM_BOT_TOKEN}}, ={{$env.TELEGRAM_CHAT_ID}}
- Email SMTP: ={{$env.SMTP_HOST}}, ={{$env.SMTP_USER}}, ={{$env.SMTP_PASSWORD}}

ESTRUTURA DO JSON:
{
  "name": "Nome do Workflow",
  "nodes": [...],
  "connections": {...},
  "active": false,
  "settings": { "executionOrder": "v1" },
  "versionId": "1",
  "id": "1"
}

Após o JSON, adicione uma seção separada por "---ENV_VARS---" listando todas as variáveis de ambiente necessárias no formato:
NOME_VARIAVEL|Descrição|Exemplo de valor`;

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
