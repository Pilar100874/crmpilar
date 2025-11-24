import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";
import type { ChatStatus, ChatPrioridade } from "@/types/atendimento";

export const useChatStatus = () => {
  const [loading, setLoading] = useState(false);

  const mudarStatus = async (
    chatId: string,
    novoStatus: ChatStatus,
    dadosAdicionais?: {
      motivoEncerramento?: string;
      atendenteId?: string;
      filaId?: string;
    }
  ) => {
    try {
      setLoading(true);

      const updateData: any = {
        chat_status: novoStatus
      };

      // Adicionar campos específicos por status
      switch (novoStatus) {
        case 'em_atendimento':
          updateData.tempo_atendimento_inicio = new Date().toISOString();
          updateData.tempo_espera_inicio = null;
          if (dadosAdicionais?.atendenteId) {
            updateData.atendente_atual_id = dadosAdicionais.atendenteId;
          }
          break;

        case 'em_fila':
          updateData.tempo_espera_inicio = new Date().toISOString();
          updateData.atendente_atual_id = null;
          if (dadosAdicionais?.filaId) {
            updateData.fila_id = dadosAdicionais.filaId;
          }
          break;

        case 'encerrado':
          updateData.tempo_encerramento = new Date().toISOString();
          updateData.motivo_encerramento = dadosAdicionais?.motivoEncerramento || null;
          break;

        case 'aguardando_cliente':
          // Mantém atendente atual
          break;

        case 'transferido':
          updateData.tempo_espera_inicio = new Date().toISOString();
          break;

        case 'reaberto':
          updateData.tempo_encerramento = null;
          // Incrementar número de reaberturas será feito via trigger ou edge function
          break;
      }

      const { error } = await supabase
        .from('conversations')
        .update(updateData)
        .eq('id', chatId);

      if (error) throw error;

      // Adicionar mensagem de sistema
      const mensagensStatus: Record<ChatStatus, string> = {
        novo: '📩 Novo chat iniciado',
        em_fila: '⏳ Chat em fila de espera',
        em_atendimento: '✅ Atendimento iniciado',
        transferido: '🔄 Chat transferido',
        aguardando_cliente: '⏸️ Aguardando resposta do cliente',
        encerrado: '✔️ Chat encerrado',
        reaberto: '🔄 Chat reaberto'
      };

      await supabase
        .from('messages')
        .insert({
          conversation_id: chatId,
          sender: 'system',
          text: mensagensStatus[novoStatus]
        });

      toast.success(`Status alterado para: ${novoStatus}`);
      return true;

    } catch (error) {
      console.error('Erro ao mudar status:', error);
      toast.error('Erro ao mudar status do chat');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const mudarPrioridade = async (chatId: string, novaPrioridade: ChatPrioridade) => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('conversations')
        .update({ prioridade: novaPrioridade })
        .eq('id', chatId);

      if (error) throw error;

      const prioridadeEmoji: Record<ChatPrioridade, string> = {
        baixa: '🟢',
        normal: '🟡',
        alta: '🟠',
        urgente: '🔴'
      };

      toast.success(`Prioridade alterada para: ${prioridadeEmoji[novaPrioridade]} ${novaPrioridade}`);
      return true;

    } catch (error) {
      console.error('Erro ao mudar prioridade:', error);
      toast.error('Erro ao mudar prioridade');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const encerrarChat = async (chatId: string, motivo: string) => {
    const success = await mudarStatus(chatId, 'encerrado', { motivoEncerramento: motivo });
    
    if (success) {
      // Buscar dados da conversa para enviar pesquisa
      try {
        const { data: conversation } = await supabase
          .from('conversations')
          .select('customer_id, atendente_atual_id, fila_id, canal')
          .eq('id', chatId)
          .single();
        
        if (conversation) {
          // Enviar pesquisa de satisfação automaticamente
          await supabase.functions.invoke('enviar-pesquisa-satisfacao', {
            body: {
              conversation_id: chatId,
              customer_id: conversation.customer_id,
              atendente_id: conversation.atendente_atual_id,
              fila_id: conversation.fila_id,
              canal: conversation.canal
            }
          });
          console.log('Pesquisa de satisfação enviada para conversa:', chatId);
        }
      } catch (error) {
        console.error('Erro ao enviar pesquisa de satisfação:', error);
        // Não bloqueia o encerramento se a pesquisa falhar
      }
    }
    
    return success;
  };

  const reabrirChat = async (chatId: string) => {
    return mudarStatus(chatId, 'reaberto');
  };

  const colocarEmEspera = async (chatId: string) => {
    return mudarStatus(chatId, 'aguardando_cliente');
  };

  return {
    loading,
    mudarStatus,
    mudarPrioridade,
    encerrarChat,
    reabrirChat,
    colocarEmEspera
  };
};
