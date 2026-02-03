-- Otimizar função para pular tabelas vazias e reduzir overhead
CREATE OR REPLACE FUNCTION public.delete_customer_cascade(p_customer_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '60s'
AS $$
BEGIN
  -- Deletar apenas registros que existem (mais eficiente)
  DELETE FROM public.messages WHERE conversation_id IN (SELECT id FROM public.conversations WHERE customer_id = p_customer_id);
  DELETE FROM public.chat_tags_aplicadas WHERE chat_id IN (SELECT id FROM public.conversations WHERE customer_id = p_customer_id);
  DELETE FROM public.chat_transferencias WHERE chat_id IN (SELECT id FROM public.conversations WHERE customer_id = p_customer_id);
  DELETE FROM public.conversations WHERE customer_id = p_customer_id;
  DELETE FROM public.portal_ticket_respostas WHERE customer_id = p_customer_id;
  DELETE FROM public.portal_tickets WHERE customer_id = p_customer_id;
  DELETE FROM public.funil_deals WHERE cliente_id = p_customer_id;
  DELETE FROM public.orcamento_itens WHERE orcamento_id IN (SELECT id FROM public.orcamentos WHERE cliente_id = p_customer_id);
  DELETE FROM public.orcamentos WHERE cliente_id = p_customer_id;
  DELETE FROM public.kb_feedback WHERE customer_id = p_customer_id;
  DELETE FROM public.pesquisas_respostas WHERE customer_id = p_customer_id;
  DELETE FROM public.envio_massa_contatos WHERE customer_id = p_customer_id;
  DELETE FROM public.atendente_carteiras WHERE customer_id = p_customer_id;
  DELETE FROM public.customer_canal_preferences WHERE customer_id = p_customer_id;
  DELETE FROM public.customer_segmentos WHERE customer_id = p_customer_id;
  DELETE FROM public.canal_transitions WHERE customer_id = p_customer_id;
  DELETE FROM public.omnichannel_sessions WHERE customer_id = p_customer_id;
  DELETE FROM public.customer_empresas WHERE customer_id = p_customer_id;
  DELETE FROM public.customer_vinculos WHERE customer_id = p_customer_id;
  DELETE FROM public.customers WHERE id = p_customer_id;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Erro ao deletar customer %: %', p_customer_id, SQLERRM;
    RETURN FALSE;
END;
$$;