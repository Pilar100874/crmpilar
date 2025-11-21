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
  filaId?: string;
  palavrasChave?: string[];
  opcaoBot?: string;
  prioridade?: 'baixa' | 'normal' | 'alta' | 'urgente';
}

interface Atendente {
  id: string;
  status: string;
  aceita_novos_chats: boolean;
  max_chats_simultaneos: number;
}

interface FilaAtendimento {
  id: string;
  nome: string;
  tipo_roteamento: 'round_robin' | 'por_disponibilidade' | 'por_skill' | 'por_prioridade' | 'por_carteira';
  max_chats_por_atendente: number;
  mensagem_fila?: string;
  ativa: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const requestData: RouteRequest = await req.json();
    const { conversationId, customerId, estabelecimentoId, canal, filaId, palavrasChave, opcaoBot, prioridade } = requestData;

    console.log(`[Roteamento Omnichannel] Iniciando para conversa ${conversationId}`);
    console.log(`[Roteamento] Canal: ${canal}, Prioridade: ${prioridade || 'normal'}`);

    // === ETAPA 1: VERIFICAR SE JÁ ESTÁ SENDO ATENDIDO ===
    const { data: conversation } = await supabase
      .from('conversations')
      .select('*, atendente_atual:atendentes(*)')
      .eq('id', conversationId)
      .single();

    if (!conversation) {
      throw new Error('Conversa não encontrada');
    }

    if (conversation.atendente_atual_id && conversation.chat_status === 'em_atendimento') {
      console.log(`[Roteamento] Chat já em atendimento com ${conversation.atendente_atual_id}`);
      return respondWithSuccess({ 
        message: 'Chat já está sendo atendido',
        atendenteId: conversation.atendente_atual_id,
        tipo: 'ja_atendido'
      });
    }

    // === ETAPA 2: IDENTIFICAR FILA APROPRIADA ===
    const filaEscolhida = await identificarFila(
      supabase, 
      estabelecimentoId, 
      filaId, 
      canal, 
      palavrasChave, 
      opcaoBot,
      customerId
    );

    if (!filaEscolhida) {
      console.log(`[Roteamento] Nenhuma fila disponível`);
      return respondWithError('Nenhuma fila de atendimento disponível');
    }

    console.log(`[Roteamento] Fila selecionada: ${filaEscolhida.nome} (${filaEscolhida.id})`);

    // Atualizar prioridade se especificada
    if (prioridade) {
      await atualizarPrioridade(supabase, conversationId, prioridade);
    }

    // === ETAPA 3: VERIFICAR CARTEIRA FIXA ===
    const atendenteCarteira = await verificarCarteiraFixa(
      supabase, 
      customerId, 
      estabelecimentoId
    );

    if (atendenteCarteira) {
      const atribuido = await tentarAtribuirAtendente(
        supabase, 
        conversationId, 
        atendenteCarteira.id, 
        filaEscolhida.id
      );
      
      if (atribuido) {
        console.log(`[Roteamento] Atribuído a atendente de carteira fixa: ${atendenteCarteira.id}`);
        return respondWithSuccess({ 
          atendenteId: atendenteCarteira.id, 
          tipo: 'carteira_fixa',
          fila: filaEscolhida.nome
        });
      }
    }

    // === ETAPA 4: SELECIONAR ATENDENTE PELA ESTRATÉGIA DA FILA ===
    const atendenteEscolhido = await selecionarAtendente(
      supabase,
      filaEscolhida,
      conversationId
    );

    if (atendenteEscolhido) {
      await atribuirChat(supabase, conversationId, atendenteEscolhido, filaEscolhida.id);
      console.log(`[Roteamento] Chat atribuído via ${filaEscolhida.tipo_roteamento}: ${atendenteEscolhido}`);
      return respondWithSuccess({ 
        atendenteId: atendenteEscolhido,
        tipo: filaEscolhida.tipo_roteamento,
        fila: filaEscolhida.nome
      });
    }

    // === ETAPA 5: COLOCAR EM FILA DE ESPERA ===
    await colocarEmFila(supabase, conversationId, filaEscolhida);
    console.log(`[Roteamento] Colocado em fila de espera: ${filaEscolhida.nome}`);
    
    return respondWithSuccess({ 
      message: 'Chat colocado na fila de espera', 
      filaId: filaEscolhida.id,
      fila: filaEscolhida.nome,
      tipo: 'em_fila'
    });

  } catch (error: any) {
    console.error('[Roteamento] Erro:', error);
    return respondWithError(error.message);
  }
});

// ============================================
// FUNÇÕES DE IDENTIFICAÇÃO DE FILA
// ============================================

async function identificarFila(
  supabase: any,
  estabelecimentoId: string,
  filaIdSugerido?: string,
  canal?: string,
  palavrasChave?: string[],
  opcaoBot?: string,
  customerId?: string
): Promise<FilaAtendimento | null> {
  
  // 1. Se filaId foi especificado explicitamente (ex: pelo bot), usar essa
  if (filaIdSugerido) {
    const { data: fila } = await supabase
      .from('filas_atendimento')
      .select('*')
      .eq('id', filaIdSugerido)
      .eq('ativa', true)
      .single();
    
    if (fila) {
      console.log(`[Identificar Fila] Fila explícita selecionada: ${fila.nome}`);
      return fila;
    }
  }

  // 2. Verificar histórico do cliente (última fila usada)
  if (customerId) {
    const { data: ultimaConversa } = await supabase
      .from('conversations')
      .select('fila_id, filas:filas_atendimento(*)')
      .eq('customer_id', customerId)
      .eq('estabelecimento_id', estabelecimentoId)
      .not('fila_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (ultimaConversa?.filas && ultimaConversa.filas.ativa) {
      console.log(`[Identificar Fila] Usando histórico do cliente: ${ultimaConversa.filas.nome}`);
      return ultimaConversa.filas;
    }
  }

  // 3. Buscar por palavras-chave ou opção do bot (match no nome/descrição da fila)
  if (palavrasChave && palavrasChave.length > 0) {
    for (const keyword of palavrasChave) {
      const { data: filaPorKeyword } = await supabase
        .from('filas_atendimento')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('ativa', true)
        .or(`nome.ilike.%${keyword}%,descricao.ilike.%${keyword}%`)
        .limit(1)
        .maybeSingle();

      if (filaPorKeyword) {
        console.log(`[Identificar Fila] Fila por palavra-chave '${keyword}': ${filaPorKeyword.nome}`);
        return filaPorKeyword;
      }
    }
  }

  if (opcaoBot) {
    const { data: filaPorOpcao } = await supabase
      .from('filas_atendimento')
      .select('*')
      .eq('estabelecimento_id', estabelecimentoId)
      .eq('ativa', true)
      .or(`nome.ilike.%${opcaoBot}%,descricao.ilike.%${opcaoBot}%`)
      .limit(1)
      .maybeSingle();

    if (filaPorOpcao) {
      console.log(`[Identificar Fila] Fila por opção do bot '${opcaoBot}': ${filaPorOpcao.nome}`);
      return filaPorOpcao;
    }
  }

  // 4. Fila padrão: maior prioridade
  const { data: filaPadrao } = await supabase
    .from('filas_atendimento')
    .select('*')
    .eq('estabelecimento_id', estabelecimentoId)
    .eq('ativa', true)
    .order('prioridade', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (filaPadrao) {
    console.log(`[Identificar Fila] Fila padrão (maior prioridade): ${filaPadrao.nome}`);
    return filaPadrao;
  }

  return null;
}

// ============================================
// FUNÇÕES DE VERIFICAÇÃO DE CARTEIRA
// ============================================

async function verificarCarteiraFixa(
  supabase: any,
  customerId: string,
  estabelecimentoId: string
): Promise<Atendente | null> {
  
  const { data: carteira } = await supabase
    .from('atendente_carteiras')
    .select('atendente_id, atendente:atendentes(*)')
    .eq('customer_id', customerId)
    .eq('estabelecimento_id', estabelecimentoId)
    .eq('ativa', true)
    .maybeSingle();

  if (carteira?.atendente) {
    const atendente = carteira.atendente as Atendente;
    
    if (atendente.status === 'disponivel' && atendente.aceita_novos_chats) {
      console.log(`[Carteira] Cliente possui atendente fixo disponível: ${atendente.id}`);
      return atendente;
    } else {
      console.log(`[Carteira] Atendente fixo não disponível (status: ${atendente.status})`);
    }
  }

  return null;
}

// ============================================
// FUNÇÕES DE SELEÇÃO DE ATENDENTE
// ============================================

async function selecionarAtendente(
  supabase: any,
  fila: FilaAtendimento,
  conversationId: string
): Promise<string | null> {
  
  console.log(`[Selecionar Atendente] Estratégia: ${fila.tipo_roteamento}`);

  switch (fila.tipo_roteamento) {
    case 'round_robin':
      return await estrategiaRoundRobin(supabase, fila.id);
    
    case 'por_disponibilidade':
      return await estrategiaPorDisponibilidade(supabase, fila.id);
    
    case 'por_skill':
      return await estrategiaPorSkill(supabase, fila.id, conversationId);
    
    case 'por_prioridade':
      return await estrategiaPorPrioridade(supabase, fila.id);
    
    case 'por_carteira':
      return await estrategiaPorDisponibilidade(supabase, fila.id);
    
    default:
      return await estrategiaRoundRobin(supabase, fila.id);
  }
}

// Estratégia 1: Round Robin (alternância circular)
async function estrategiaRoundRobin(
  supabase: any,
  filaId: string
): Promise<string | null> {
  
  const atendentes = await buscarAtendentesDisponiveis(supabase, filaId);
  if (atendentes.length === 0) {
    console.log(`[Round Robin] Nenhum atendente disponível`);
    return null;
  }

  // Buscar último atendente que recebeu chat
  const { data: ultimoChat } = await supabase
    .from('conversations')
    .select('atendente_atual_id')
    .eq('fila_id', filaId)
    .not('atendente_atual_id', 'is', null)
    .order('tempo_atendimento_inicio', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!ultimoChat?.atendente_atual_id) {
    console.log(`[Round Robin] Primeiro atendente da fila`);
    return atendentes[0].id;
  }

  const currentIndex = atendentes.findIndex(a => a.id === ultimoChat.atendente_atual_id);
  const nextIndex = (currentIndex + 1) % atendentes.length;
  
  console.log(`[Round Robin] Próximo atendente no ciclo: ${atendentes[nextIndex].id}`);
  return atendentes[nextIndex].id;
}

// Estratégia 2: Por Disponibilidade (menor carga de trabalho)
async function estrategiaPorDisponibilidade(
  supabase: any,
  filaId: string
): Promise<string | null> {
  
  const atendentes = await buscarAtendentesDisponiveis(supabase, filaId);
  if (atendentes.length === 0) {
    console.log(`[Por Disponibilidade] Nenhum atendente disponível`);
    return null;
  }

  // Calcular carga de cada atendente
  const atendenteComCarga = await Promise.all(
    atendentes.map(async (atendente) => {
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

  // Ordenar por menor carga
  atendenteComCarga.sort((a, b) => {
    if (a.carga === b.carga) {
      // Em caso de empate, usar round robin
      return 0;
    }
    return a.carga - b.carga;
  });

  console.log(`[Por Disponibilidade] Atendente com menor carga (${atendenteComCarga[0].carga} chats): ${atendenteComCarga[0].atendente.id}`);
  return atendenteComCarga[0].atendente.id;
}

// Estratégia 3: Por Skill (habilidades específicas)
async function estrategiaPorSkill(
  supabase: any,
  filaId: string,
  conversationId: string
): Promise<string | null> {
  
  // Buscar skills requeridas pela fila
  const { data: filaSkills } = await supabase
    .from('fila_skills')
    .select('skill_id, nivel_minimo, skill:skills(nome)')
    .eq('fila_id', filaId);

  if (!filaSkills || filaSkills.length === 0) {
    console.log(`[Por Skill] Fila sem skills obrigatórias, usando disponibilidade`);
    return await estrategiaPorDisponibilidade(supabase, filaId);
  }

  console.log(`[Por Skill] Skills requeridas: ${filaSkills.map((s: any) => s.skill.nome).join(', ')}`);

  const atendentes = await buscarAtendentesDisponiveis(supabase, filaId);
  if (atendentes.length === 0) return null;

  // Buscar skills de cada atendente
  const atendentesComSkills = await Promise.all(
    atendentes.map(async (atendente) => {
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

  // Filtrar atendentes que possuem TODAS as skills necessárias
  const atendentesQualificados = atendentesComSkills.filter(({ skills }) => {
    return filaSkills.every((filaSkill: any) => {
      const atendenteSkill = skills.find((s: any) => s.skill_id === filaSkill.skill_id);
      return atendenteSkill && atendenteSkill.nivel >= filaSkill.nivel_minimo;
    });
  });

  if (atendentesQualificados.length === 0) {
    console.log(`[Por Skill] Nenhum atendente qualificado encontrado`);
    return null;
  }

  // Entre os qualificados, escolher o com maior nível médio de skill
  const atendentesComNivel = atendentesQualificados.map(({ atendente, skills }) => {
    const nivelMedio = skills.reduce((sum: number, s: any) => sum + s.nivel, 0) / skills.length;
    return { atendente, nivelMedio };
  });

  atendentesComNivel.sort((a, b) => b.nivelMedio - a.nivelMedio);
  
  console.log(`[Por Skill] Atendente mais qualificado (nível médio ${atendentesComNivel[0].nivelMedio.toFixed(1)}): ${atendentesComNivel[0].atendente.id}`);
  return atendentesComNivel[0].atendente.id;
}

// Estratégia 4: Por Prioridade (prioridade do atendente na fila)
async function estrategiaPorPrioridade(
  supabase: any,
  filaId: string
): Promise<string | null> {
  
  const { data: filaAtendentes } = await supabase
    .from('atendente_filas')
    .select('atendente_id, prioridade, atendente:atendentes(*)')
    .eq('fila_id', filaId)
    .order('prioridade', { ascending: false });

  if (!filaAtendentes || filaAtendentes.length === 0) {
    console.log(`[Por Prioridade] Nenhum atendente na fila`);
    return null;
  }

  // Filtrar atendentes disponíveis respeitando a prioridade
  for (const fa of filaAtendentes) {
    const atendente = fa.atendente as Atendente;
    
    if (atendente.status === 'disponivel' && atendente.aceita_novos_chats) {
      const disponivel = await verificarLimiteChats(supabase, atendente);
      if (disponivel) {
        console.log(`[Por Prioridade] Atendente com prioridade ${fa.prioridade}: ${atendente.id}`);
        return atendente.id;
      }
    }
  }

  console.log(`[Por Prioridade] Nenhum atendente disponível`);
  return null;
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

async function buscarAtendentesDisponiveis(
  supabase: any,
  filaId: string
): Promise<Atendente[]> {
  
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

  // Filtrar por limite de chats
  const atendentesDisponiveis = [];
  for (const atendente of atendentes) {
    const disponivel = await verificarLimiteChats(supabase, atendente);
    if (disponivel) {
      atendentesDisponiveis.push(atendente);
    }
  }

  return atendentesDisponiveis;
}

async function verificarLimiteChats(
  supabase: any,
  atendente: Atendente
): Promise<boolean> {
  
  const { data: chatsAtivos } = await supabase
    .from('conversations')
    .select('id')
    .eq('atendente_atual_id', atendente.id)
    .in('chat_status', ['em_atendimento', 'aguardando_cliente']);

  return (chatsAtivos?.length || 0) < atendente.max_chats_simultaneos;
}

async function tentarAtribuirAtendente(
  supabase: any,
  conversationId: string,
  atendenteId: string,
  filaId: string
): Promise<boolean> {
  
  const { data: atendente } = await supabase
    .from('atendentes')
    .select('*')
    .eq('id', atendenteId)
    .single();

  if (!atendente) return false;

  if (atendente.status !== 'disponivel' || !atendente.aceita_novos_chats) {
    return false;
  }

  const disponivel = await verificarLimiteChats(supabase, atendente);
  if (!disponivel) return false;

  await atribuirChat(supabase, conversationId, atendenteId, filaId);
  return true;
}

async function atribuirChat(
  supabase: any,
  conversationId: string,
  atendenteId: string,
  filaId: string
) {
  await supabase
    .from('conversations')
    .update({
      atendente_atual_id: atendenteId,
      fila_id: filaId,
      chat_status: 'em_atendimento',
      tempo_atendimento_inicio: new Date().toISOString(),
      tempo_espera_inicio: null,
      bot_active: false
    })
    .eq('id', conversationId);

  console.log(`[Atribuir] Chat ${conversationId} -> Atendente ${atendenteId}`);
}

async function colocarEmFila(
  supabase: any,
  conversationId: string,
  fila: FilaAtendimento
) {
  await supabase
    .from('conversations')
    .update({
      chat_status: 'aguardando_atendente',
      fila_id: fila.id,
      tempo_espera_inicio: new Date().toISOString(),
      atendente_atual_id: null
    })
    .eq('id', conversationId);

  // Enviar mensagem de fila se configurada
  if (fila.mensagem_fila) {
    await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender: 'system',
        text: fila.mensagem_fila
      });
  }

  console.log(`[Fila] Chat ${conversationId} colocado em fila: ${fila.nome}`);
}

async function atualizarPrioridade(
  supabase: any,
  conversationId: string,
  prioridade: string
) {
  await supabase
    .from('conversations')
    .update({ prioridade })
    .eq('id', conversationId);

  console.log(`[Prioridade] Chat ${conversationId} atualizado para: ${prioridade}`);
}

// ============================================
// FUNÇÕES DE RESPOSTA
// ============================================

function respondWithSuccess(data: any) {
  return new Response(
    JSON.stringify({ success: true, ...data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

function respondWithError(message: string) {
  return new Response(
    JSON.stringify({ success: false, error: message }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}