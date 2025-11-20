import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";

/**
 * Hook para gerenciar roteamento e reabertura automática de chats
 */
export const useOmnichannelRouting = () => {
  
  /**
   * Tenta reabrir um chat encerrado recentemente ou criar novo
   */
  const handleIncomingMessage = async (
    customerId: string,
    estabelecimentoId: string,
    canal: string
  ): Promise<string | null> => {
    try {
      console.log('[Omnichannel] Processando mensagem recebida:', { customerId, estabelecimentoId, canal });

      // 1. Primeiro, tentar reabrir chat existente
      const reabrirResponse = await supabase.functions.invoke('reabrir-chat-automatico', {
        body: { customerId, estabelecimentoId, canal }
      });

      if (reabrirResponse.data?.success) {
        console.log('[Omnichannel] Chat reaberto:', reabrirResponse.data.conversationId);
        toast.success('Chat reaberto automaticamente');
        return reabrirResponse.data.conversationId;
      }

          // 2. Se não pode reabrir, criar nova conversa
          if (reabrirResponse.data?.shouldCreateNew) {
            console.log('[Omnichannel] Criando nova conversa');
            
            const { data: newConv, error: createError } = await supabase
              .from('conversations')
              .insert([{
                customer_id: customerId,
                estabelecimento_id: estabelecimentoId,
                canal: canal,
                chat_status: 'em_fila' as const,
                tempo_espera_inicio: new Date().toISOString(),
                origem_abertura: 'mensagem_cliente'
              }])
              .select()
              .single();

            if (createError) throw createError;

        console.log('[Omnichannel] Nova conversa criada:', newConv.id);
        
        // 3. Rotear o chat
        await rotearChat(newConv.id, customerId, estabelecimentoId, canal);
        
        return newConv.id;
      }

      return null;

    } catch (error: any) {
      console.error('[Omnichannel] Erro ao processar mensagem:', error);
      toast.error('Erro ao processar mensagem');
      return null;
    }
  };

  /**
   * Roteia um chat para um atendente disponível
   */
  const rotearChat = async (
    conversationId: string,
    customerId: string,
    estabelecimentoId: string,
    canal: string
  ): Promise<boolean> => {
    try {
      console.log('[Omnichannel] Roteando chat:', conversationId);

      const rotearResponse = await supabase.functions.invoke('rotear-chat-automatico', {
        body: {
          conversationId,
          customerId,
          estabelecimentoId,
          canal
        }
      });

      if (rotearResponse.data?.success) {
        if (rotearResponse.data.atendenteId) {
          console.log('[Omnichannel] Chat atribuído ao atendente:', rotearResponse.data.atendenteId);
          toast.success('Chat atribuído automaticamente');
        } else {
          console.log('[Omnichannel] Chat colocado na fila');
          toast.info('Chat em fila de espera');
        }
        return true;
      }

      return false;

    } catch (error: any) {
      console.error('[Omnichannel] Erro ao rotear chat:', error);
      toast.error('Erro ao rotear chat');
      return false;
    }
  };

  /**
   * Monitora novas mensagens de clientes e processa roteamento
   */
  const setupMessageListener = (estabelecimentoId: string) => {
    const channel = supabase
      .channel('new-customer-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `sender=neq.agent`
        },
        async (payload) => {
          console.log('[Omnichannel] Nova mensagem detectada:', payload);
          
          // Buscar informações da conversa
          const { data: conversation } = await supabase
            .from('conversations')
            .select('*, customer:customers(*)')
            .eq('id', payload.new.conversation_id)
            .eq('estabelecimento_id', estabelecimentoId)
            .single();

          if (!conversation) return;

          // Se chat está encerrado ou sem atendente, processar roteamento
          if (
            conversation.chat_status === 'encerrado' ||
            !conversation.atendente_atual_id
          ) {
            await handleIncomingMessage(
              conversation.customer_id,
              estabelecimentoId,
              conversation.canal
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  return {
    handleIncomingMessage,
    rotearChat,
    setupMessageListener
  };
};
