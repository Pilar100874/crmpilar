import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TransferenciaRequest {
  chatId: string;
  atendenteOrigemId?: string;
  atendenteDestinoId?: string;
  filaDestinoId?: string;
  motivo?: string;
  realizadoPor: string;
  tipo: 'atendente' | 'fila' | 'automatica';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const requestData: TransferenciaRequest = await req.json();
    const { 
      chatId, 
      atendenteOrigemId, 
      atendenteDestinoId, 
      filaDestinoId, 
      motivo, 
      realizadoPor,
      tipo
    } = requestData;

    console.log(`[Transferência] Iniciando transferência do chat ${chatId}`);
    console.log(`[Transferência] Tipo: ${tipo}, Motivo: ${motivo || 'Não especificado'}`);

    // 1. Buscar dados do chat
    const { data: chat, error: chatError } = await supabase
      .from('conversations')
      .select('*, customer_id, estabelecimento_id, fila_id, atendente_atual_id, canal')
      .eq('id', chatId)
      .single();

    if (chatError || !chat) {
      throw new Error('Chat não encontrado');
    }

    // 2. Validações
    if (tipo === 'atendente' && !atendenteDestinoId) {
      throw new Error('Atendente destino não especificado');
    }

    if (tipo === 'fila' && !filaDestinoId) {
      throw new Error('Fila destino não especificada');
    }

    // 3. Registrar transferência
    const { data: transferencia, error: transfError } = await supabase
      .from('chat_transferencias')
      .insert({
        chat_id: chatId,
        atendente_origem_id: atendenteOrigemId || chat.atendente_atual_id,
        atendente_destino_id: atendenteDestinoId,
        fila_origem_id: chat.fila_id,
        fila_destino_id: filaDestinoId,
        tipo: tipo,
        motivo: motivo,
        realizada_por: realizadoPor
      })
      .select()
      .single();

    if (transfError) {
      console.error('[Transferência] Erro ao registrar:', transfError);
      throw new Error(`Erro ao registrar transferência: ${transfError.message}`);
    }

    // 4. Executar transferência baseada no tipo
    let resultado: any = {};

    if (tipo === 'atendente') {
      // Transferência direta para atendente específico
      resultado = await transferirParaAtendente(
        supabase, 
        chatId, 
        atendenteDestinoId!, 
        filaDestinoId || chat.fila_id
      );
      
    } else if (tipo === 'fila') {
      // Transferência para fila (roteamento automático)
      resultado = await transferirParaFila(
        supabase, 
        chatId, 
        chat.customer_id, 
        chat.estabelecimento_id,
        chat.canal,
        filaDestinoId!
      );
    }

    // 5. Enviar mensagem notificando a transferência
    let mensagemTransferencia = '📋 Chat transferido';
    
    if (tipo === 'atendente') {
      mensagemTransferencia += ' para outro atendente.';
    } else if (tipo === 'fila') {
      const { data: fila } = await supabase
        .from('filas_atendimento')
        .select('nome')
        .eq('id', filaDestinoId)
        .single();
      
      mensagemTransferencia += fila ? ` para a fila "${fila.nome}".` : '.';
    }

    if (motivo) {
      mensagemTransferencia += `\n💬 Motivo: ${motivo}`;
    }

    await supabase
      .from('messages')
      .insert({
        conversation_id: chatId,
        sender: 'system',
        text: mensagemTransferencia
      });

    console.log(`[Transferência] Concluída com sucesso`);

    return new Response(
      JSON.stringify({ 
        success: true,
        transferenciaId: transferencia.id,
        ...resultado
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Transferência] Erro:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

async function transferirParaAtendente(
  supabase: any,
  chatId: string,
  atendenteDestinoId: string,
  filaId: string
): Promise<any> {
  
  // Verificar se atendente está disponível
  const { data: atendente } = await supabase
    .from('atendentes')
    .select('*')
    .eq('id', atendenteDestinoId)
    .single();

  if (!atendente) {
    throw new Error('Atendente destino não encontrado');
  }

  if (atendente.status !== 'disponivel') {
    throw new Error(`Atendente não está disponível (status: ${atendente.status})`);
  }

  // Verificar limite de chats
  const { data: chatsAtivos } = await supabase
    .from('conversations')
    .select('id')
    .eq('atendente_atual_id', atendenteDestinoId)
    .in('chat_status', ['em_atendimento', 'aguardando_cliente']);

  if ((chatsAtivos?.length || 0) >= atendente.max_chats_simultaneos) {
    throw new Error('Atendente atingiu o limite de chats simultâneos');
  }

  // Atribuir chat ao novo atendente
  await supabase
    .from('conversations')
    .update({
      atendente_atual_id: atendenteDestinoId,
      fila_id: filaId,
      chat_status: 'em_atendimento',
      tempo_atendimento_inicio: new Date().toISOString()
    })
    .eq('id', chatId);

  console.log(`[Transferir] Chat atribuído ao atendente ${atendenteDestinoId}`);

  return {
    tipo: 'atendente',
    atendenteId: atendenteDestinoId,
    filaId: filaId
  };
}

async function transferirParaFila(
  supabase: any,
  chatId: string,
  customerId: string,
  estabelecimentoId: string,
  canal: string,
  filaDestinoId: string
): Promise<any> {
  
  // Verificar se fila existe e está ativa
  const { data: fila } = await supabase
    .from('filas_atendimento')
    .select('*')
    .eq('id', filaDestinoId)
    .eq('ativa', true)
    .single();

  if (!fila) {
    throw new Error('Fila destino não encontrada ou inativa');
  }

  // Chamar edge function de roteamento
  const { data: roteamento, error: roteamentoError } = await supabase.functions.invoke(
    'rotear-chat-automatico',
    {
      body: {
        conversationId: chatId,
        customerId: customerId,
        estabelecimentoId: estabelecimentoId,
        canal: canal,
        filaId: filaDestinoId
      }
    }
  );

  if (roteamentoError) {
    throw new Error(`Erro no roteamento: ${roteamentoError.message}`);
  }

  console.log(`[Transferir] Chat processado pelo roteamento automático`);

  return {
    tipo: 'fila',
    filaId: filaDestinoId,
    resultado: roteamento
  };
}