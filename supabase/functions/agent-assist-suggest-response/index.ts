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
    let historico = '';
    if (conversation?.customer_id) {
      const { data: orcs } = await supabase.from('orcamentos')
        .select('etapa, valor_total, created_at, orcamento_itens(quantidade, produtos(nome))')
        .eq('cliente_id', conversation.customer_id).order('created_at', { ascending: false }).limit(5);
      historico = (orcs ?? []).map((o: any) => `- ${String(o.created_at).slice(0, 10)} ${o.etapa} R$ ${Math.round(Number(o.valor_total) || 0)}: ${(o.orcamento_itens ?? []).slice(0, 5).map((i: any) => `${i.quantidade}x ${i.produtos?.nome ?? 'item'}`).join(', ')}`).join('\n');
    }
    const contextInfo = [
      `Cliente: ${conversation?.customer?.nome || 'N/A'}`,
      `Canal: ${conversation?.canal || 'N/A'}`,
      `Status: ${conversation?.chat_status || 'N/A'}`,
      historico ? `Últimos orçamentos/pedidos:\n${historico}` : 'Sem orçamentos anteriores.',
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

- Nunca invente preços, prazos ou estoque que não estejam no contexto

Baseado no histórico, sugira 3 respostas curtas e diferentes (ex.: confirmar pedido, esclarecer prazo, negociar).
Responda SOMENTE em JSON: {"sugestoes":[{"titulo":"até 4 palavras","texto":"mensagem pronta"}]}`
          },
          ...messageHistory
        ],
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`Erro na API: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const bruto = String(aiData.choices[0].message.content ?? '');
    let sugestoes: { titulo: string; texto: string }[] = [];
    try {
      const j = JSON.parse(bruto.slice(bruto.indexOf('{'), bruto.lastIndexOf('}') + 1));
      sugestoes = (j.sugestoes ?? []).filter((x: any) => x?.texto).slice(0, 3);
    } catch { /* resposta fora do formato */ }
    if (!sugestoes.length) sugestoes = [{ titulo: 'Sugestão', texto: bruto }];
    const suggestion = sugestoes[0].texto;

    return new Response(JSON.stringify({
      success: true,
      suggestion,
      sugestoes,
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
