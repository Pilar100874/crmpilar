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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Iniciando processamento de filas...');

    // Buscar todos os estabelecimentos
    const { data: estabelecimentos, error: estabError } = await supabase
      .from('estabelecimentos')
      .select('id');

    if (estabError) throw estabError;

    let totalProcessed = 0;
    let totalAssigned = 0;

    for (const estab of estabelecimentos || []) {
      // Buscar chats em fila deste estabelecimento
      const { data: chatsEmFila, error: chatsError } = await supabase
        .from('conversations')
        .select('id, customer_id, fila_id, prioridade')
        .eq('estabelecimento_id', estab.id)
        .eq('chat_status', 'em_fila')
        .order('prioridade', { ascending: false })
        .order('tempo_espera_inicio', { ascending: true });

      if (chatsError) {
        console.error('Erro ao buscar chats em fila:', chatsError);
        continue;
      }

      if (!chatsEmFila || chatsEmFila.length === 0) continue;

      console.log(`Processando ${chatsEmFila.length} chats em fila para estabelecimento ${estab.id}`);

      // Processar cada chat
      for (const chat of chatsEmFila) {
        totalProcessed++;

        try {
          // 1. Verificar carteira fixa
          const { data: carteira } = await supabase
            .from('atendente_carteiras')
            .select('atendente_id, atendente:atendentes(*)')
            .eq('customer_id', chat.customer_id)
            .eq('estabelecimento_id', estab.id)
            .eq('ativa', true)
            .maybeSingle();

          if (carteira && carteira.atendente) {
            const atendente = carteira.atendente as any;
            
            if (atendente.status === 'disponivel' && atendente.aceita_novos_chats) {
              const { data: chatsAtivos } = await supabase
                .from('conversations')
                .select('id')
                .eq('atendente_atual_id', atendente.id)
                .in('chat_status', ['em_atendimento', 'aguardando_cliente']);

              if ((chatsAtivos?.length || 0) < atendente.max_chats_simultaneos) {
                await atribuirChat(supabase, chat.id, atendente.id, chat.fila_id);
                totalAssigned++;
                continue;
              }
            }
          }

          // 2. Buscar fila e tipo de roteamento
          if (!chat.fila_id) continue;

          const { data: fila } = await supabase
            .from('filas_atendimento')
            .select('tipo_roteamento')
            .eq('id', chat.fila_id)
            .single();

          if (!fila) continue;

          // 3. Aplicar roteamento baseado no tipo
          let atendenteId: string | null = null;

          switch (fila.tipo_roteamento) {
            case 'round_robin':
              atendenteId = await roteamentoRoundRobin(supabase, chat.fila_id);
              break;
            case 'por_disponibilidade':
              atendenteId = await roteamentoPorDisponibilidade(supabase, chat.fila_id);
              break;
            case 'por_skill':
              atendenteId = await roteamentoPorSkill(supabase, chat.fila_id);
              break;
            default:
              atendenteId = await roteamentoRoundRobin(supabase, chat.fila_id);
          }

          if (atendenteId) {
            await atribuirChat(supabase, chat.id, atendenteId, chat.fila_id);
            totalAssigned++;
          }
        } catch (chatError) {
          console.error(`Erro ao processar chat ${chat.id}:`, chatError);
        }
      }
    }

    console.log(`Processamento concluído: ${totalProcessed} chats processados, ${totalAssigned} atribuídos`);

    return new Response(
      JSON.stringify({ 
        success: true,
        totalProcessed,
        totalAssigned 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro no processamento da fila:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

// Funções auxiliares de roteamento
async function atribuirChat(supabase: any, chatId: string, atendenteId: string, filaId: string | null) {
  await supabase
    .from('conversations')
    .update({
      atendente_atual_id: atendenteId,
      fila_id: filaId,
      chat_status: 'em_atendimento',
      tempo_atendimento_inicio: new Date().toISOString(),
      bot_active: false
    })
    .eq('id', chatId);
}

async function buscarAtendentesDisponiveis(supabase: any, filaId: string) {
  const { data: filaAtendentes } = await supabase
    .from('atendente_filas')
    .select('atendente_id')
    .eq('fila_id', filaId);

  if (!filaAtendentes || filaAtendentes.length === 0) return [];

  const atendenteIds = filaAtendentes.map((fa: any) => fa.atendente_id);

  const { data: atendentes } = await supabase
    .from('atendentes')
    .select('*')
    .in('id', atendenteIds)
    .eq('status', 'disponivel')
    .eq('aceita_novos_chats', true);

  if (!atendentes) return [];

  const atendentesDisponiveis = [];
  for (const atendente of atendentes) {
    const { data: chatsAtivos } = await supabase
      .from('conversations')
      .select('id')
      .eq('atendente_atual_id', atendente.id)
      .in('chat_status', ['em_atendimento', 'aguardando_cliente']);

    if ((chatsAtivos?.length || 0) < atendente.max_chats_simultaneos) {
      atendentesDisponiveis.push(atendente);
    }
  }

  return atendentesDisponiveis;
}

async function roteamentoRoundRobin(supabase: any, filaId: string): Promise<string | null> {
  const atendentes = await buscarAtendentesDisponiveis(supabase, filaId);
  if (atendentes.length === 0) return null;

  const { data: ultimoChat } = await supabase
    .from('conversations')
    .select('atendente_atual_id')
    .eq('fila_id', filaId)
    .not('atendente_atual_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!ultimoChat?.atendente_atual_id) {
    return atendentes[0].id;
  }

  const currentIndex = atendentes.findIndex((a: any) => a.id === ultimoChat.atendente_atual_id);
  const nextIndex = (currentIndex + 1) % atendentes.length;
  return atendentes[nextIndex].id;
}

async function roteamentoPorDisponibilidade(supabase: any, filaId: string): Promise<string | null> {
  const atendentes = await buscarAtendentesDisponiveis(supabase, filaId);
  if (atendentes.length === 0) return null;

  const atendentesComCarga = await Promise.all(
    atendentes.map(async (atendente: any) => {
      const { data: chatsAtivos } = await supabase
        .from('conversations')
        .select('id')
        .eq('atendente_atual_id', atendente.id)
        .in('chat_status', ['em_atendimento', 'aguardando_cliente']);

      return {
        atendente,
        carga: chatsAtivos?.length || 0
      };
    })
  );

  atendentesComCarga.sort((a, b) => a.carga - b.carga);
  return atendentesComCarga[0].atendente.id;
}

async function roteamentoPorSkill(supabase: any, filaId: string): Promise<string | null> {
  const { data: filaSkills } = await supabase
    .from('fila_skills')
    .select('skill_id, nivel_minimo')
    .eq('fila_id', filaId);

  if (!filaSkills || filaSkills.length === 0) {
    return roteamentoRoundRobin(supabase, filaId);
  }

  const atendentes = await buscarAtendentesDisponiveis(supabase, filaId);
  if (atendentes.length === 0) return null;

  const atendentesComSkills = await Promise.all(
    atendentes.map(async (atendente: any) => {
      const { data: atendenteSkills } = await supabase
        .from('atendente_skills')
        .select('skill_id, nivel')
        .eq('atendente_id', atendente.id);

      return {
        atendente,
        skills: atendenteSkills || []
      };
    })
  );

  const atendentesQualificados = atendentesComSkills.filter(({ skills }: any) => {
    return filaSkills.every((filaSkill: any) => {
      const atendenteSkill = skills.find((s: any) => s.skill_id === filaSkill.skill_id);
      return atendenteSkill && atendenteSkill.nivel >= filaSkill.nivel_minimo;
    });
  });

  if (atendentesQualificados.length === 0) return null;

  const atendentesComNivelMedio = atendentesQualificados.map(({ atendente, skills }: any) => {
    const nivelMedio = skills.reduce((sum: number, s: any) => sum + s.nivel, 0) / skills.length;
    return { atendente, nivelMedio };
  });

  atendentesComNivelMedio.sort((a, b) => b.nivelMedio - a.nivelMedio);
  return atendentesComNivelMedio[0].atendente.id;
}
