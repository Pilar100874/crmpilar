import { supabase } from "@/integrations/supabase/client";

/**
 * Serviço de Roteamento Omnichannel
 * 
 * Funções de alto nível para integração com o sistema de roteamento.
 * Utiliza edge functions para lógica complexa de roteamento.
 */

// ============================================
// TIPOS
// ============================================

export type TipoRoteamento = 'round_robin' | 'por_disponibilidade' | 'por_skill' | 'por_prioridade' | 'por_carteira';
export type PrioridadeChat = 'baixa' | 'normal' | 'alta' | 'urgente';
export type TipoTransferencia = 'atendente' | 'fila' | 'automatica';

export interface OpcoesRoteamento {
  conversationId: string;
  customerId: string;
  estabelecimentoId: string;
  canal: string;
  filaId?: string;
  palavrasChave?: string[];
  opcaoBot?: string;
  prioridade?: PrioridadeChat;
}

export interface ResultadoRoteamento {
  success: boolean;
  atendenteId?: string;
  filaId?: string;
  fila?: string;
  tipo?: string;
  message?: string;
  error?: string;
}

export interface OpcoesTransferencia {
  chatId: string;
  tipo: TipoTransferencia;
  atendenteDestinoId?: string;
  filaDestinoId?: string;
  motivo?: string;
  realizadoPor: string;
}

export interface ResultadoRealocacao {
  success: boolean;
  totalChats: number;
  totalRealocados: number;
  totalEmFila: number;
  erros?: Array<{ chatId: string; erro: string }>;
}

// ============================================
// ROTEAMENTO AUTOMÁTICO
// ============================================

/**
 * Roteia um chat automaticamente para o atendente mais adequado
 * 
 * @param opcoes - Opções de roteamento
 * @returns Resultado do roteamento
 * 
 * @example
 * ```typescript
 * const resultado = await rotearChatAutomatico({
 *   conversationId: 'uuid-do-chat',
 *   customerId: 'uuid-do-cliente',
 *   estabelecimentoId: 'uuid-do-estab',
 *   canal: 'whatsapp',
 *   palavrasChave: ['suporte', 'problema'],
 *   prioridade: 'alta'
 * });
 * 
 * if (resultado.atendenteId) {
 *   console.log(`Atribuído ao atendente ${resultado.atendenteId}`);
 * }
 * ```
 */
export const rotearChatAutomatico = async (
  opcoes: OpcoesRoteamento
): Promise<ResultadoRoteamento> => {
  try {
    console.log('[Roteamento] Iniciando roteamento automático:', opcoes);

    const { data, error } = await supabase.functions.invoke('rotear-chat-automatico', {
      body: opcoes
    });

    if (error) {
      console.error('[Roteamento] Erro na edge function:', error);
      return {
        success: false,
        error: error.message || 'Erro ao rotear chat'
      };
    }

    console.log('[Roteamento] Resultado:', data);
    return data;

  } catch (error: any) {
    console.error('[Roteamento] Erro:', error);
    return {
      success: false,
      error: error.message || 'Erro inesperado ao rotear chat'
    };
  }
};

/**
 * Roteia chat com opções simplificadas (usando padrões)
 */
export const rotearChatSimples = async (
  conversationId: string,
  customerId: string,
  estabelecimentoId: string,
  canal: string = 'whatsapp'
): Promise<ResultadoRoteamento> => {
  return rotearChatAutomatico({
    conversationId,
    customerId,
    estabelecimentoId,
    canal
  });
};

/**
 * Roteia chat para fila específica
 */
export const rotearParaFila = async (
  conversationId: string,
  customerId: string,
  estabelecimentoId: string,
  filaId: string,
  canal: string = 'whatsapp'
): Promise<ResultadoRoteamento> => {
  return rotearChatAutomatico({
    conversationId,
    customerId,
    estabelecimentoId,
    canal,
    filaId
  });
};

// ============================================
// TRANSFERÊNCIAS
// ============================================

/**
 * Transfere chat para outro atendente
 * 
 * @example
 * ```typescript
 * const resultado = await transferirParaAtendente({
 *   chatId: 'uuid-do-chat',
 *   atendenteDestinoId: 'uuid-do-atendente',
 *   motivo: 'Cliente solicitou especialista',
 *   realizadoPor: usuarioId
 * });
 * ```
 */
export const transferirParaAtendente = async (
  opcoes: Omit<OpcoesTransferencia, 'tipo'>
): Promise<ResultadoRoteamento> => {
  try {
    console.log('[Transferência] Para atendente:', opcoes);

    const { data, error } = await supabase.functions.invoke('transferir-chat', {
      body: {
        ...opcoes,
        tipo: 'atendente'
      }
    });

    if (error) {
      console.error('[Transferência] Erro:', error);
      return {
        success: false,
        error: error.message || 'Erro ao transferir chat'
      };
    }

    return data;

  } catch (error: any) {
    console.error('[Transferência] Erro:', error);
    return {
      success: false,
      error: error.message || 'Erro inesperado'
    };
  }
};

/**
 * Transfere chat para fila (roteamento automático na fila)
 * 
 * @example
 * ```typescript
 * const resultado = await transferirParaFilaComRoteamento({
 *   chatId: 'uuid-do-chat',
 *   filaDestinoId: 'uuid-da-fila',
 *   motivo: 'Escalando para suporte nível 2',
 *   realizadoPor: usuarioId
 * });
 * ```
 */
export const transferirParaFilaComRoteamento = async (
  opcoes: Omit<OpcoesTransferencia, 'tipo'>
): Promise<ResultadoRoteamento> => {
  try {
    console.log('[Transferência] Para fila:', opcoes);

    const { data, error } = await supabase.functions.invoke('transferir-chat', {
      body: {
        ...opcoes,
        tipo: 'fila'
      }
    });

    if (error) {
      console.error('[Transferência] Erro:', error);
      return {
        success: false,
        error: error.message || 'Erro ao transferir chat'
      };
    }

    return data;

  } catch (error: any) {
    console.error('[Transferência] Erro:', error);
    return {
      success: false,
      error: error.message || 'Erro inesperado'
    };
  }
};

// ============================================
// REALOCAÇÃO
// ============================================

/**
 * Realoca automaticamente todos os chats de um atendente
 * 
 * Útil quando atendente sai, fica offline ou precisa pausar atendimentos.
 * 
 * @example
 * ```typescript
 * // Ao mudar status do atendente
 * await atualizarStatusAtendente(atendenteId, 'offline');
 * 
 * const resultado = await realocarChatsAtendente(
 *   atendenteId,
 *   estabelecimentoId,
 *   'Atendente encerrou expediente'
 * );
 * 
 * console.log(`${resultado.totalRealocados} chats realocados`);
 * ```
 */
export const realocarChatsAtendente = async (
  atendenteId: string,
  estabelecimentoId: string,
  motivoRealocacao?: string
): Promise<ResultadoRealocacao> => {
  try {
    console.log('[Realocação] Iniciando para atendente:', atendenteId);

    const { data, error } = await supabase.functions.invoke('realocar-chats-atendente', {
      body: {
        atendenteId,
        estabelecimentoId,
        motivoRealocacao
      }
    });

    if (error) {
      console.error('[Realocação] Erro:', error);
      return {
        success: false,
        totalChats: 0,
        totalRealocados: 0,
        totalEmFila: 0,
        erros: [{ chatId: 'unknown', erro: error.message }]
      };
    }

    console.log('[Realocação] Resultado:', data);
    return data;

  } catch (error: any) {
    console.error('[Realocação] Erro:', error);
    return {
      success: false,
      totalChats: 0,
      totalRealocados: 0,
      totalEmFila: 0,
      erros: [{ chatId: 'unknown', erro: error.message }]
    };
  }
};

/**
 * Realoca automaticamente ao mudar status do atendente
 */
export const realocarAoMudarStatus = async (
  atendenteId: string,
  estabelecimentoId: string,
  novoStatus: string
): Promise<void> => {
  // Só realocar se sair de "disponivel"
  if (novoStatus !== 'disponivel') {
    console.log('[Realocação] Status mudou para:', novoStatus);
    
    const motivo = novoStatus === 'offline' 
      ? 'Atendente ficou offline' 
      : `Atendente mudou para ${novoStatus}`;

    await realocarChatsAtendente(atendenteId, estabelecimentoId, motivo);
  }
};

// ============================================
// PROCESSAMENTO DE FILA
// ============================================

/**
 * Processa fila de espera tentando atribuir chats
 * 
 * Deve ser executado periodicamente (ex: a cada 30 segundos)
 * 
 * @example
 * ```typescript
 * // Executar periodicamente
 * setInterval(async () => {
 *   await processarFilaEspera();
 * }, 30000); // 30 segundos
 * ```
 */
export const processarFilaEspera = async (): Promise<void> => {
  try {
    console.log('[Fila] Processando fila de espera...');

    const { data, error } = await supabase.functions.invoke('processar-fila-atendimento');

    if (error) {
      console.error('[Fila] Erro ao processar:', error);
      return;
    }

    console.log('[Fila] Processamento concluído:', data);

  } catch (error) {
    console.error('[Fila] Erro:', error);
  }
};

// ============================================
// CONSULTAS AUXILIARES
// ============================================

/**
 * Verifica se cliente tem atendente fixo
 */
export const verificarCarteiraFixa = async (
  customerId: string,
  estabelecimentoId: string
): Promise<string | null> => {
  try {
    const { data } = await supabase
      .from("atendente_carteiras")
      .select("atendente_id, atendente:atendentes(*)")
      .eq("customer_id", customerId)
      .eq("estabelecimento_id", estabelecimentoId)
      .eq("ativa", true)
      .maybeSingle();

    if (data?.atendente) {
      const atendente = data.atendente as any;
      if (atendente.status === 'disponivel' && atendente.aceita_novos_chats) {
        return atendente.id;
      }
    }
    return null;
  } catch (error) {
    console.error("Erro ao verificar carteira fixa:", error);
    return null;
  }
};

/**
 * Busca histórico de transferências de um chat
 */
export const buscarHistoricoTransferencias = async (
  chatId: string
) => {
  try {
    const { data, error } = await supabase
      .from('chat_transferencias')
      .select(`
        *,
        atendente_origem:atendentes!chat_transferencias_atendente_origem_id_fkey(id, usuario:usuarios(nome)),
        atendente_destino:atendentes!chat_transferencias_atendente_destino_id_fkey(id, usuario:usuarios(nome)),
        fila_origem:filas_atendimento!chat_transferencias_fila_origem_id_fkey(nome),
        fila_destino:filas_atendimento!chat_transferencias_fila_destino_id_fkey(nome),
        realizado_por_usuario:usuarios!chat_transferencias_realizada_por_fkey(nome)
      `)
      .eq('chat_id', chatId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;

  } catch (error) {
    console.error('Erro ao buscar histórico:', error);
    return [];
  }
};

/**
 * Verifica tamanho atual da fila
 */
export const obterTamanhoFila = async (
  filaId?: string,
  estabelecimentoId?: string
): Promise<number> => {
  try {
    let query = supabase
      .from('conversations')
      .select('id', { count: 'exact', head: true })
      .eq('chat_status', 'em_fila');

    if (filaId) {
      query = query.eq('fila_id', filaId);
    }

    if (estabelecimentoId) {
      query = query.eq('estabelecimento_id', estabelecimentoId);
    }

    const { count } = await query;
    return count || 0;

  } catch (error) {
    console.error('Erro ao obter tamanho da fila:', error);
    return 0;
  }
};

/**
 * Busca métricas de roteamento
 */
export const obterMetricasRoteamento = async (
  estabelecimentoId: string,
  dataInicio?: string,
  dataFim?: string
) => {
  try {
    let query = supabase
      .from('metricas_atendente')
      .select('*');

    if (dataInicio) {
      query = query.gte('data', dataInicio);
    }

    if (dataFim) {
      query = query.lte('data', dataFim);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;

  } catch (error) {
    console.error('Erro ao buscar métricas:', error);
    return [];
  }
};

// Alias para compatibilidade
export const processarFila = processarFilaEspera;