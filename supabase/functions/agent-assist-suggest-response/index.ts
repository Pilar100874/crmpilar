import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    const { conversationId, messages } = await req.json();

    console.log(`💡 Gerando sugestão de resposta para conversa ${conversationId}`);

    // Buscar dados do cliente para contexto
    const { data: conversation } = await supabase
      .from('conversations')
      .select(`
        *,
        customer:customers(nome, email, telefone, custom_fields)
      `)
      .eq('id', conversationId)
      .single();

    // Formatar histórico de mensagens
    const messageHistory = messages.map((msg: any) => ({
      role: msg.sender === 'customer' ? 'user' : 'assistant',
      content: msg.text || msg.content || ''
    }));

    // Construir contexto
    const contextInfo = [
      `Cliente: ${conversation?.customer?.nome || 'N/A'}`,
      `Canal: ${conversation?.canal || 'N/A'}`,
      `Status: ${conversation?.chat_status || 'N/A'}`,
    ].join('\n');

    // Chamar Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Você é um assistente de atendimento que sugere respostas para atendentes.

Contexto da conversa:
${contextInfo}

Regras:
- Seja cordial, profissional e empático
- Mantenha o tom apropriado para ${conversation?.canal}
- Responda em português brasileiro
- Seja conciso mas completo
- Ofereça soluções práticas

Baseado no histórico, sugira uma resposta apropriada para o atendente enviar.`
          },
          ...messageHistory
        ],
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`Erro na API: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const suggestion = aiData.choices[0].message.content;

    return new Response(JSON.stringify({
      success: true,
      suggestion,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('❌ Erro ao gerar sugestão:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
