
-- Criar função para deletar customer e todas as dependências
CREATE OR REPLACE FUNCTION public.delete_customer_cascade(p_customer_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Deletar mensagens das conversas
  DELETE FROM public.messages 
  WHERE conversation_id IN (
    SELECT id FROM public.conversations WHERE customer_id = p_customer_id
  );
  
  -- Deletar tags aplicadas nos chats
  DELETE FROM public.chat_tags_aplicadas 
  WHERE chat_id IN (
    SELECT id FROM public.conversations WHERE customer_id = p_customer_id
  );
  
  -- Deletar transferências de chat
  DELETE FROM public.chat_transferencias 
  WHERE chat_id IN (
    SELECT id FROM public.conversations WHERE customer_id = p_customer_id
  );
  
  -- Deletar conversas
  DELETE FROM public.conversations WHERE customer_id = p_customer_id;
  
  -- Deletar respostas de tickets do portal
  DELETE FROM public.portal_ticket_respostas WHERE customer_id = p_customer_id;
  
  -- Deletar tickets do portal
  DELETE FROM public.portal_tickets WHERE customer_id = p_customer_id;
  
  -- Deletar deals do funil
  DELETE FROM public.funil_deals WHERE cliente_id = p_customer_id;
  
  -- Deletar itens de orçamentos antes dos orçamentos
  DELETE FROM public.orcamento_itens 
  WHERE orcamento_id IN (
    SELECT id FROM public.orcamentos WHERE cliente_id = p_customer_id
  );
  
  -- Deletar orçamentos
  DELETE FROM public.orcamentos WHERE cliente_id = p_customer_id;
  
  -- Deletar feedback da base de conhecimento
  DELETE FROM public.kb_feedback WHERE customer_id = p_customer_id;
  
  -- Deletar respostas de pesquisas
  DELETE FROM public.pesquisas_respostas WHERE customer_id = p_customer_id;
  
  -- Deletar contatos de envio em massa
  DELETE FROM public.envio_massa_contatos WHERE customer_id = p_customer_id;
  
  -- Deletar carteiras de atendente (tem CASCADE mas garantir)
  DELETE FROM public.atendente_carteiras WHERE customer_id = p_customer_id;
  
  -- Deletar preferências de canal (tem CASCADE mas garantir)
  DELETE FROM public.customer_canal_preferences WHERE customer_id = p_customer_id;
  
  -- Deletar segmentos (tem CASCADE mas garantir)
  DELETE FROM public.customer_segmentos WHERE customer_id = p_customer_id;
  
  -- Deletar transições de canal (tem CASCADE mas garantir)
  DELETE FROM public.canal_transitions WHERE customer_id = p_customer_id;
  
  -- Deletar sessões omnichannel (tem CASCADE mas garantir)
  DELETE FROM public.omnichannel_sessions WHERE customer_id = p_customer_id;
  
  -- Deletar vínculos com empresas (tem CASCADE mas garantir)
  DELETE FROM public.customer_empresas WHERE customer_id = p_customer_id;
  
  -- Deletar vínculos gerais
  DELETE FROM public.customer_vinculos WHERE customer_id = p_customer_id;

  -- Finalmente deletar o customer
  DELETE FROM public.customers WHERE id = p_customer_id;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Erro ao deletar customer: %', SQLERRM;
    RETURN FALSE;
END;
$$;
