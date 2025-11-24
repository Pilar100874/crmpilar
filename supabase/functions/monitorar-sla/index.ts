import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SLAConfig {
  id: string;
  estabelecimento_id: string;
  fila_id: string | null;
  tempo_primeira_resposta: number;
  tempo_resposta_subsequente: number;
  tempo_resolucao: number;
  considera_horario_comercial: boolean;
  horario_funcionamento: any;
  multiplicador_urgente: number;
  multiplicador_alta: number;
  multiplicador_normal: number;
  multiplicador_baixa: number;
  alerta_porcentagem: number;
  escalar_automaticamente: boolean;
  fila_escalacao_id: string | null;
}

interface Conversation {
  id: string;
  estabelecimento_id: string;
  fila_id: string | null;
  prioridade: 'baixa' | 'normal' | 'alta' | 'urgente';
  chat_status: string;
  atendente_atual_id: string | null;
  created_at: string;
  sla_config_id: string | null;
  sla_primeira_resposta_at: string | null;
  sla_ultima_resposta_cliente_at: string | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🔍 Iniciando monitoramento de SLA...');

    // Buscar todos os estabelecimentos com SLA configurado
    const { data: configs, error: configError } = await supabase
      .from('sla_config')
      .select('*')
      .eq('ativo', true);

    if (configError) {
      throw new Error(`Erro ao buscar configurações de SLA: ${configError.message}`);
    }

    console.log(`✅ Encontradas ${configs?.length || 0} configurações ativas de SLA`);

    const resultados = {
      processadas: 0,
      violacoes_detectadas: 0,
      alertas_enviados: 0,
      escalacoes: 0,
      erros: [] as string[],
    };

    // Para cada configuração, verificar conversas ativas
    for (const config of configs || []) {
      try {
        await processarSLAParaConfig(supabase, config, resultados);
      } catch (error: any) {
        console.error(`❌ Erro ao processar config ${config.id}:`, error);
        resultados.erros.push(`Config ${config.id}: ${error.message}`);
      }
    }

    console.log('✅ Monitoramento de SLA concluído:', resultados);

    return new Response(JSON.stringify({
      success: true,
      resultados,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('❌ Erro no monitoramento de SLA:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function processarSLAParaConfig(
  supabase: any,
  config: SLAConfig,
  resultados: any
) {
  console.log(`📊 Processando SLA config: ${config.id}`);

  // Buscar conversas ativas (não encerradas) que usam esta config ou que estão na fila correspondente
  let query = supabase
    .from('conversations')
    .select('*')
    .eq('estabelecimento_id', config.estabelecimento_id)
    .neq('chat_status', 'encerrado');

  if (config.fila_id) {
    query = query.eq('fila_id', config.fila_id);
  } else {
    // Config padrão - buscar conversas sem config específica
    query = query.or('sla_config_id.is.null,sla_config_id.eq.' + config.id);
  }

  const { data: conversations, error } = await query;

  if (error) {
    throw new Error(`Erro ao buscar conversas: ${error.message}`);
  }

  console.log(`📞 Encontradas ${conversations?.length || 0} conversas para análise`);

  for (const conv of conversations || []) {
    resultados.processadas++;
    
    // Atualizar config_id se necessário
    if (!conv.sla_config_id) {
      await supabase
        .from('conversations')
        .update({ sla_config_id: config.id })
        .eq('id', conv.id);
    }

    await verificarSLADaConversa(supabase, conv, config, resultados);
  }
}

async function verificarSLADaConversa(
  supabase: any,
  conv: Conversation,
  config: SLAConfig,
  resultados: any
) {
  const agora = new Date();
  const criadoEm = new Date(conv.created_at);

  // Obter multiplicador baseado na prioridade
  const multiplicador = getMultiplicadorPrioridade(conv.prioridade, config);

  // 1. Verificar SLA de primeira resposta (se ainda não respondeu)
  if (!conv.sla_primeira_resposta_at && conv.chat_status !== 'novo') {
    const tempoEsperado = config.tempo_primeira_resposta * multiplicador;
    const tempoDecorrido = Math.floor((agora.getTime() - criadoEm.getTime()) / 1000);

    if (tempoDecorrido > tempoEsperado) {
      await registrarViolacao(supabase, conv, config, 'primeira_resposta', tempoEsperado, tempoDecorrido, resultados);
    } else {
      // Verificar se está próximo do limite para alerta
      const porcentagemDecorrida = (tempoDecorrido / tempoEsperado) * 100;
      if (porcentagemDecorrida >= config.alerta_porcentagem) {
        await enviarAlertaProximoViolacao(supabase, conv, config, 'primeira_resposta', porcentagemDecorrida);
        resultados.alertas_enviados++;
      }
    }
  }

  // 2. Verificar SLA de resposta subsequente (após última mensagem do cliente)
  if (conv.sla_ultima_resposta_cliente_at && conv.chat_status === 'aguardando_cliente') {
    const ultimaRespostaCliente = new Date(conv.sla_ultima_resposta_cliente_at);
    const tempoEsperado = config.tempo_resposta_subsequente * multiplicador;
    const tempoDecorrido = Math.floor((agora.getTime() - ultimaRespostaCliente.getTime()) / 1000);

    if (tempoDecorrido > tempoEsperado) {
      await registrarViolacao(supabase, conv, config, 'resposta_subsequente', tempoEsperado, tempoDecorrido, resultados);
    } else {
      const porcentagemDecorrida = (tempoDecorrido / tempoEsperado) * 100;
      if (porcentagemDecorrida >= config.alerta_porcentagem) {
        await enviarAlertaProximoViolacao(supabase, conv, config, 'resposta_subsequente', porcentagemDecorrida);
        resultados.alertas_enviados++;
      }
    }
  }

  // 3. Verificar SLA de resolução total
  if (conv.chat_status === 'em_atendimento') {
    const tempoEsperado = config.tempo_resolucao * multiplicador;
    const tempoDecorrido = Math.floor((agora.getTime() - criadoEm.getTime()) / 1000);

    if (tempoDecorrido > tempoEsperado) {
      await registrarViolacao(supabase, conv, config, 'resolucao', tempoEsperado, tempoDecorrido, resultados);
    } else {
      const porcentagemDecorrida = (tempoDecorrido / tempoEsperado) * 100;
      if (porcentagemDecorrida >= config.alerta_porcentagem) {
        await enviarAlertaProximoViolacao(supabase, conv, config, 'resolucao', porcentagemDecorrida);
        resultados.alertas_enviados++;
      }
    }
  }
}

async function registrarViolacao(
  supabase: any,
  conv: Conversation,
  config: SLAConfig,
  tipo: string,
  tempoEsperado: number,
  tempoReal: number,
  resultados: any
) {
  console.log(`⚠️ Violação de SLA detectada: ${tipo} para conversa ${conv.id}`);

  const tempoExcedido = tempoReal - tempoEsperado;
  const porcentagemExcedida = ((tempoExcedido / tempoEsperado) * 100);

  // Verificar se já existe violação registrada
  const { data: violacaoExistente } = await supabase
    .from('sla_violations')
    .select('id')
    .eq('conversation_id', conv.id)
    .eq('tipo_violacao', tipo)
    .single();

  if (violacaoExistente) {
    console.log('ℹ️ Violação já registrada anteriormente');
    return;
  }

  // Registrar violação
  const { error: violacaoError } = await supabase
    .from('sla_violations')
    .insert({
      conversation_id: conv.id,
      sla_config_id: config.id,
      tipo_violacao: tipo,
      tempo_esperado: tempoEsperado,
      tempo_real: tempoReal,
      tempo_excedido: tempoExcedido,
      porcentagem_excedida: porcentagemExcedida,
      prioridade_chat: conv.prioridade,
      fila_id: conv.fila_id,
      atendente_id: conv.atendente_atual_id,
    });

  if (violacaoError) {
    console.error('❌ Erro ao registrar violação:', violacaoError);
    return;
  }

  resultados.violacoes_detectadas++;

  // Atualizar flag de violação na conversa
  const updateData: any = {};
  if (tipo === 'primeira_resposta') updateData.sla_violacao_primeira_resposta = true;
  if (tipo === 'resposta_subsequente') updateData.sla_violacao_resposta_subsequente = true;
  if (tipo === 'resolucao') updateData.sla_violacao_resolucao = true;

  await supabase
    .from('conversations')
    .update(updateData)
    .eq('id', conv.id);

  // Enviar notificação
  await enviarNotificacaoViolacao(supabase, conv, config, tipo, porcentagemExcedida);
  resultados.alertas_enviados++;

  // Escalar automaticamente se configurado
  if (config.escalar_automaticamente && config.fila_escalacao_id) {
    await escalarConversa(supabase, conv, config, resultados);
  }
}

async function enviarNotificacaoViolacao(
  supabase: any,
  conv: Conversation,
  config: SLAConfig,
  tipo: string,
  porcentagem: number
) {
  console.log(`📧 Enviando notificação de violação de SLA`);

  const tipoLabel = {
    primeira_resposta: 'Primeira Resposta',
    resposta_subsequente: 'Resposta Subsequente',
    resolucao: 'Resolução Total',
  }[tipo] || tipo;

  // Buscar supervisores e atendente atual
  const destinatarios = [];

  // Adicionar atendente atual
  if (conv.atendente_atual_id) {
    const { data: atendente } = await supabase
      .from('atendentes')
      .select('usuario_id')
      .eq('id', conv.atendente_atual_id)
      .single();

    if (atendente) {
      destinatarios.push(atendente.usuario_id);
    }
  }

  // Adicionar gestores e admins
  const { data: gestores } = await supabase
    .from('user_roles')
    .select('user_id')
    .in('role', ['admin', 'gestor']);

  if (gestores) {
    destinatarios.push(...gestores.map((g: any) => g.user_id));
  }

  // Enviar notificação para cada destinatário
  for (const usuarioId of [...new Set(destinatarios)]) {
    await supabase.functions.invoke('enviar-notificacao', {
      body: {
        usuarioId,
        estabelecimentoId: conv.estabelecimento_id,
        tipo: 'sla_alerta',
        titulo: `⚠️ Violação de SLA - ${tipoLabel}`,
        mensagem: `O chat excedeu o SLA em ${porcentagem.toFixed(0)}%. Ação necessária!`,
        chatId: conv.id,
      },
    });
  }
}

async function enviarAlertaProximoViolacao(
  supabase: any,
  conv: Conversation,
  config: SLAConfig,
  tipo: string,
  porcentagem: number
) {
  console.log(`📢 Enviando alerta de SLA próximo ao limite`);

  if (conv.atendente_atual_id) {
    const { data: atendente } = await supabase
      .from('atendentes')
      .select('usuario_id')
      .eq('id', conv.atendente_atual_id)
      .single();

    if (atendente) {
      await supabase.functions.invoke('enviar-notificacao', {
        body: {
          usuarioId: atendente.usuario_id,
          estabelecimentoId: conv.estabelecimento_id,
          tipo: 'sla_alerta',
          titulo: '⏰ SLA Próximo do Limite',
          mensagem: `Chat está em ${porcentagem.toFixed(0)}% do tempo de SLA. Responda em breve!`,
          chatId: conv.id,
        },
      });
    }
  }
}

async function escalarConversa(
  supabase: any,
  conv: Conversation,
  config: SLAConfig,
  resultados: any
) {
  console.log(`🔼 Escalando conversa ${conv.id} para fila ${config.fila_escalacao_id}`);

  // Atualizar conversa para nova fila
  await supabase
    .from('conversations')
    .update({
      fila_id: config.fila_escalacao_id,
      chat_status: 'em_fila',
      atendente_atual_id: null,
    })
    .eq('id', conv.id);

  // Registrar transferência
  await supabase
    .from('chat_transferencias')
    .insert({
      chat_id: conv.id,
      fila_origem_id: conv.fila_id,
      fila_destino_id: config.fila_escalacao_id,
      atendente_origem_id: conv.atendente_atual_id,
      tipo: 'supervisor_forcada',
      motivo: 'Escalação automática por violação de SLA',
    });

  // Atualizar violação
  await supabase
    .from('sla_violations')
    .update({
      escalado: true,
      escalado_para_fila_id: config.fila_escalacao_id,
      escalado_at: new Date().toISOString(),
    })
    .eq('conversation_id', conv.id)
    .eq('escalado', false);

  resultados.escalacoes++;

  // Rotear para novo atendente
  await supabase.functions.invoke('rotear-chat-automatico', {
    body: {
      conversationId: conv.id,
      estabelecimentoId: conv.estabelecimento_id,
    },
  });
}

function getMultiplicadorPrioridade(
  prioridade: string,
  config: SLAConfig
): number {
  switch (prioridade) {
    case 'urgente':
      return config.multiplicador_urgente;
    case 'alta':
      return config.multiplicador_alta;
    case 'normal':
      return config.multiplicador_normal;
    case 'baixa':
      return config.multiplicador_baixa;
    default:
      return 1.0;
  }
}
