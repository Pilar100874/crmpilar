import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RouteRequest {
  conversationId: string;
  customerId: string;
  estabelecimentoId: string;
  canal: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { conversationId, customerId, estabelecimentoId, canal }: RouteRequest = await req.json();

    console.log(`[Roteamento] Iniciando roteamento para conversa ${conversationId}`);

    // 1. Verificar se chat já está sendo atendido
    const { data: conversation } = await supabase
      .from('conversations')
      .select('*, atendente_atual:atendentes(*)')
      .eq('id', conversationId)
      .single();

    if (!conversation) {
      throw new Error('Conversa não encontrada');
    }

    // Se já tem atendente e está em atendimento, não rotear
    if (conversation.atendente_atual_id && conversation.chat_status === 'em_atendimento') {
      console.log(`[Roteamento] Chat já está em atendimento com atendente ${conversation.atendente_atual_id}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Chat já está sendo atendido',
          atendenteId: conversation.atendente_atual_id
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Verificar carteira fixa
    const { data: carteira } = await supabase
      .from('atendente_carteiras')
      .select('atendente_id, atendente:atendentes(*)')
      .eq('customer_id', customerId)
      .eq('estabelecimento_id', estabelecimentoId)
      .eq('ativa', true)
      .single();

    if (carteira && carteira.atendente) {
      const atendente = carteira.atendente as any;
      if (atendente.status === 'disponivel' && atendente.aceita_novos_chats) {
        // Verificar limite de chats
        const { data: chatsAtivos } = await supabase
          .from('conversations')
          .select('id')
          .eq('atendente_atual_id', atendente.id)
          .in('chat_status', ['em_atendimento', 'aguardando_cliente']);

        if ((chatsAtivos?.length || 0) < atendente.max_chats_simultaneos) {
          await atribuirChat(supabase, conversationId, atendente.id);
          console.log(`[Roteamento] Chat atribuído para atendente de carteira fixa: ${atendente.id}`);
          return new Response(
            JSON.stringify({ success: true, atendenteId: atendente.id, tipo: 'carteira_fixa' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // 3. Buscar fila padrão ou primeira fila ativa
    const { data: fila } = await supabase
      .from('filas_atendimento')
      .select('*')
      .eq('estabelecimento_id', estabelecimentoId)
      .eq('ativa', true)
      .order('prioridade', { ascending: false })
      .limit(1)
      .single();

    if (!fila) {
      console.log(`[Roteamento] Nenhuma fila ativa encontrada`);
      return new Response(
        JSON.stringify({ success: false, message: 'Nenhuma fila de atendimento ativa' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Buscar atendentes da fila
    const { data: filaAtendentes } = await supabase
      .from('atendente_filas')
      .select('atendente_id')
      .eq('fila_id', fila.id);

    if (!filaAtendentes || filaAtendentes.length === 0) {
      await colocarEmFila(supabase, conversationId, fila.id);
      console.log(`[Roteamento] Sem atendentes na fila, chat colocado em espera`);
      return new Response(
        JSON.stringify({ success: true, message: 'Chat colocado na fila', filaId: fila.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const atendenteIds = filaAtendentes.map(fa => fa.atendente_id);

    // 5. Buscar atendentes disponíveis
    const { data: atendentesDisponiveis } = await supabase
      .from('atendentes')
      .select('*')
      .in('id', atendenteIds)
      .eq('status', 'disponivel')
      .eq('aceita_novos_chats', true);

    if (!atendentesDisponiveis || atendentesDisponiveis.length === 0) {
      await colocarEmFila(supabase, conversationId, fila.id);
      console.log(`[Roteamento] Nenhum atendente disponível, chat colocado em espera`);
      return new Response(
        JSON.stringify({ success: true, message: 'Chat colocado na fila', filaId: fila.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Aplicar estratégia de roteamento
    let atendenteEscolhido = null;

    switch (fila.tipo_roteamento) {
      case 'round_robin':
        atendenteEscolhido = await roteamentoRoundRobin(supabase, atendentesDisponiveis, fila.id);
        break;
      case 'por_disponibilidade':
        atendenteEscolhido = await roteamentoPorDisponibilidade(supabase, atendentesDisponiveis);
        break;
      case 'por_prioridade':
        atendenteEscolhido = await roteamentoPorPrioridade(supabase, atendentesDisponiveis, fila.id);
        break;
      case 'por_skill':
        atendenteEscolhido = await roteamentoPorSkill(supabase, atendentesDisponiveis, conversation);
        break;
      default:
        atendenteEscolhido = atendentesDisponiveis[0];
    }

    if (atendenteEscolhido) {
      await atribuirChat(supabase, conversationId, atendenteEscolhido.id);
      console.log(`[Roteamento] Chat atribuído para atendente ${atendenteEscolhido.id}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          atendenteId: atendenteEscolhido.id,
          tipo: fila.tipo_roteamento 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Se chegou aqui, colocar em fila
    await colocarEmFila(supabase, conversationId, fila.id);
    console.log(`[Roteamento] Chat colocado na fila ${fila.id}`);
    
    return new Response(
      JSON.stringify({ success: true, message: 'Chat colocado na fila', filaId: fila.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[Roteamento] Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Funções auxiliares
async function atribuirChat(supabase: any, conversationId: string, atendenteId: string) {
  await supabase
    .from('conversations')
    .update({
      atendente_atual_id: atendenteId,
      chat_status: 'em_atendimento',
      tempo_atendimento_inicio: new Date().toISOString(),
      fila_id: null,
      tempo_espera_inicio: null
    })
    .eq('id', conversationId);
}

async function colocarEmFila(supabase: any, conversationId: string, filaId: string) {
  await supabase
    .from('conversations')
    .update({
      chat_status: 'aguardando_atendente',
      fila_id: filaId,
      tempo_espera_inicio: new Date().toISOString(),
      atendente_atual_id: null
    })
    .eq('id', conversationId);
}

async function roteamentoRoundRobin(supabase: any, atendentes: any[], filaId: string) {
  // Buscar último atendente que recebeu chat
  const { data: ultimoChat } = await supabase
    .from('conversations')
    .select('atendente_atual_id')
    .eq('fila_id', filaId)
    .order('tempo_atendimento_inicio', { ascending: false })
    .limit(1)
    .single();

  if (!ultimoChat) return atendentes[0];

  const ultimoIndex = atendentes.findIndex(a => a.id === ultimoChat.atendente_atual_id);
  const proximoIndex = (ultimoIndex + 1) % atendentes.length;
  return atendentes[proximoIndex];
}

async function roteamentoPorDisponibilidade(supabase: any, atendentes: any[]) {
  const atendenteComChats = await Promise.all(
    atendentes.map(async (atendente) => {
      const { data: chats } = await supabase
        .from('conversations')
        .select('id')
        .eq('atendente_atual_id', atendente.id)
        .in('chat_status', ['em_atendimento', 'aguardando_cliente']);

      return {
        atendente,
        chatsAtivos: chats?.length || 0
      };
    })
  );

  atendenteComChats.sort((a, b) => a.chatsAtivos - b.chatsAtivos);
  return atendenteComChats[0].atendente;
}

async function roteamentoPorPrioridade(supabase: any, atendentes: any[], filaId: string) {
  const { data: prioridades } = await supabase
    .from('atendente_filas')
    .select('atendente_id, prioridade')
    .eq('fila_id', filaId)
    .in('atendente_id', atendentes.map(a => a.id))
    .order('prioridade', { ascending: false });

  if (prioridades && prioridades.length > 0) {
    const atendenteId = prioridades[0].atendente_id;
    return atendentes.find(a => a.id === atendenteId);
  }

  return atendentes[0];
}

async function roteamentoPorSkill(supabase: any, atendentes: any[], conversation: any) {
  // Implementação simplificada - retorna primeiro atendente disponível
  // Pode ser expandido para considerar skills específicas
  return atendentes[0];
}
