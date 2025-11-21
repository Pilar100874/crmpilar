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

      // 1. Verificar se existe chat ativo ou em fila
      const { data: chatAtivo } = await supabase
        .from('conversations')
        .select('id, chat_status')
        .eq('customer_id', customerId)
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('canal', canal)
        .in('chat_status', ['novo', 'em_fila', 'em_atendimento', 'transferido', 'aguardando_cliente', 'reaberto'])
        .maybeSingle();

      if (chatAtivo) {
        console.log('[Omnichannel] Chat já existe e está ativo:', chatAtivo.id);
        return chatAtivo.id;
      }

      // 2. Tentar reabrir chat encerrado recente
      const reabrirResponse = await supabase.functions.invoke('reabrir-chat-automatico', {
        body: { customerId, estabelecimentoId, canal }
      });

      if (reabrirResponse.data?.success) {
        console.log('[Omnichannel] Chat reaberto:', reabrirResponse.data.conversationId);
        toast.success('Chat reaberto automaticamente');
        return reabrirResponse.data.conversationId;
      }

      // 3. Se não pode reabrir, criar nova conversa
      if (reabrirResponse.data?.shouldCreateNew) {
        console.log('[Omnichannel] Criando nova conversa');
        
        const { data: newConv, error: createError } = await supabase
          .from('conversations')
          .insert([{
            customer_id: customerId,
            estabelecimento_id: estabelecimentoId,
            canal: canal,
            chat_status: 'novo' as const,
            origem_abertura: 'mensagem_cliente'
          }])
          .select()
          .single();

        if (createError) throw createError;

        console.log('[Omnichannel] Nova conversa criada:', newConv.id);
        
        // 4. Rotear o chat automaticamente
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
  const executarFluxoOmnichannel = async (
    flowId: string,
    conversationId: string,
    customerId: string,
    estabelecimentoId: string,
    canal: string
  ): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke("executar-fluxo-omnichannel", {
        body: {
          flowId,
          conversationId,
          customerId,
          estabelecimentoId,
          canal,
        },
      });

      if (error) throw error;
      return data?.success || false;
    } catch (error) {
      console.error("Erro ao executar fluxo omnichannel:", error);
      toast.error("Erro ao executar fluxo omnichannel");
      return false;
    }
  };

  const rotearChat = async (
    conversationId: string,
    customerId: string,
    estabelecimentoId: string,
    canal: string
  ): Promise<boolean> => {
    // Verificar se há um fluxo omnichannel ativo
    const { data: flows } = await supabase
      .from("omnichannel_flows")
      .select("id")
      .eq("estabelecimento_id", estabelecimentoId)
      .eq("ativo", true)
      .limit(1);

    // Se houver fluxo, executar o fluxo omnichannel
    if (flows && flows.length > 0) {
      console.log("Executando fluxo omnichannel:", flows[0].id);
      return await executarFluxoOmnichannel(
        flows[0].id,
        conversationId,
        customerId,
        estabelecimentoId,
        canal
      );
    }

    // Caso contrário, usar o roteamento padrão
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
    executarFluxoOmnichannel,
    setupMessageListener,
  };
};
