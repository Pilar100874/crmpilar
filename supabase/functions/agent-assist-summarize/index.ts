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
    const startTime = Date.now();
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    const { conversationId, messages } = await req.json();

    console.log(`📝 Gerando resumo para conversa ${conversationId}`);

    // Buscar dados da conversa
    const { data: conversation } = await supabase
      .from('conversations')
      .select(`
        *,
        customer:customers(nome, email, telefone)
      `)
      .eq('id', conversationId)
      .single();

    // Formatar mensagens
    const conversationText = messages.map((msg: any) => {
      const sender = msg.sender === 'customer' ? conversation?.customer?.nome || 'Cliente' : 'Atendente';
      return `${sender}: ${msg.text || msg.content || ''}`;
    }).join('\n');

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
            content: `Você é um assistente que cria resumos executivos de conversas de atendimento.

Crie um resumo estruturado contendo:
1. **Problema Principal**: Qual a necessidade/problema do cliente?
2. **Solução Proposta**: O que foi oferecido/resolvido?
3. **Próximos Passos**: O que precisa ser feito?
4. **Pontos de Atenção**: Algo importante a destacar?

Use markdown para formatação. Seja conciso mas completo.`
          },
          {
            role: 'user',
            content: `Resuma esta conversa:\n\n${conversationText}`
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`Erro na API: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const summary = aiData.choices[0].message.content;

    // Salvar resumo no metadata da conversa
    const currentMetadata = (conversation?.metadata || {}) as any;
    await supabase
      .from('conversations')
      .update({
        metadata: {
          ...currentMetadata,
          ai_summary: summary,
          ai_summary_generated_at: new Date().toISOString()
        }
      })
      .eq('id', conversationId);

    return new Response(JSON.stringify({
      success: true,
      summary,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('❌ Erro ao gerar resumo:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
