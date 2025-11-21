import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RealocacaoRequest {
  atendenteId: string;
  estabelecimentoId: string;
  motivoRealocacao?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { atendenteId, estabelecimentoId, motivoRealocacao }: RealocacaoRequest = await req.json();

    console.log(`[Realocação] Iniciando realocação de chats do atendente ${atendenteId}`);

    // 1. Buscar todos os chats ativos do atendente
    const { data: chatsAtivos, error: chatsError } = await supabase
      .from('conversations')
      .select('id, customer_id, fila_id, canal, prioridade')
      .eq('atendente_atual_id', atendenteId)
      .eq('estabelecimento_id', estabelecimentoId)
      .in('chat_status', ['em_atendimento', 'aguardando_cliente']);

    if (chatsError) {
      throw new Error(`Erro ao buscar chats: ${chatsError.message}`);
    }

    if (!chatsAtivos || chatsAtivos.length === 0) {
      console.log(`[Realocação] Nenhum chat ativo encontrado para o atendente`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Nenhum chat para realocar',
          totalRealocados: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Realocação] ${chatsAtivos.length} chats ativos encontrados`);

    let totalRealocados = 0;
    let totalEmFila = 0;
    const erros = [];

    // 2. Para cada chat, tentar realocar
    for (const chat of chatsAtivos) {
      try {
        // Registrar transferência
        await supabase
          .from('chat_transferencias')
          .insert({
            chat_id: chat.id,
            atendente_origem_id: atendenteId,
            fila_origem_id: chat.fila_id,
            tipo: 'automatica',
            motivo: motivoRealocacao || 'Atendente ficou offline',
            realizada_por: atendenteId
          });

        // Tentar rotear para novo atendente via edge function
        const { data: roteamento, error: roteamentoError } = await supabase.functions.invoke(
          'rotear-chat-automatico',
          {
            body: {
              conversationId: chat.id,
              customerId: chat.customer_id,
              estabelecimentoId: estabelecimentoId,
              canal: chat.canal,
              filaId: chat.fila_id,
              prioridade: chat.prioridade
            }
          }
        );

        if (roteamentoError) {
          console.error(`[Realocação] Erro ao rotear chat ${chat.id}:`, roteamentoError);
          erros.push({ chatId: chat.id, erro: roteamentoError.message });
          continue;
        }

        if (roteamento.atendenteId) {
          totalRealocados++;
          console.log(`[Realocação] Chat ${chat.id} realocado para atendente ${roteamento.atendenteId}`);
          
          // Enviar mensagem notificando a transferência
          await supabase
            .from('messages')
            .insert({
              conversation_id: chat.id,
              sender: 'system',
              text: `📋 Chat transferido automaticamente. ${motivoRealocacao || 'Atendente anterior ficou indisponível.'}`
            });
        } else if (roteamento.tipo === 'em_fila') {
          totalEmFila++;
          console.log(`[Realocação] Chat ${chat.id} colocado em fila de espera`);
          
          await supabase
            .from('messages')
            .insert({
              conversation_id: chat.id,
              sender: 'system',
              text: '⏳ Você foi colocado na fila de espera. Em breve um atendente estará disponível para ajudá-lo.'
            });
        }

      } catch (chatError: any) {
        console.error(`[Realocação] Erro ao processar chat ${chat.id}:`, chatError);
        erros.push({ chatId: chat.id, erro: chatError.message });
      }
    }

    console.log(`[Realocação] Concluída: ${totalRealocados} realocados, ${totalEmFila} em fila`);

    return new Response(
      JSON.stringify({ 
        success: true,
        totalChats: chatsAtivos.length,
        totalRealocados,
        totalEmFila,
        erros: erros.length > 0 ? erros : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Realocação] Erro:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});