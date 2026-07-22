CREATE OR REPLACE FUNCTION public.delete_customer_cascade(p_customer_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '60s'
AS $function$
DECLARE
  v_conv_ids uuid[];
BEGIN
  SELECT array_agg(id) INTO v_conv_ids FROM public.conversations WHERE customer_id = p_customer_id;

  DELETE FROM public.calendario_tarefas WHERE contact_id = p_customer_id::text;

  IF v_conv_ids IS NOT NULL THEN
    DELETE FROM public.messages WHERE conversation_id = ANY(v_conv_ids);
    DELETE FROM public.chat_tags_aplicadas WHERE chat_id = ANY(v_conv_ids);
    DELETE FROM public.chat_transferencias WHERE chat_id = ANY(v_conv_ids);
    DELETE FROM public.sentiment_analysis WHERE conversation_id = ANY(v_conv_ids);
    DELETE FROM public.sentiment_conversation_summary WHERE conversation_id = ANY(v_conv_ids);
    DELETE FROM public.sentiment_alerts WHERE conversation_id = ANY(v_conv_ids);
    DELETE FROM public.sla_violations WHERE conversation_id = ANY(v_conv_ids);
    DELETE FROM public.qa_avaliacoes WHERE conversation_id = ANY(v_conv_ids);
    DELETE FROM public.atendimento_registros WHERE conversation_id = ANY(v_conv_ids);
    DELETE FROM public.atendimento_flags WHERE conversation_id = ANY(v_conv_ids);
    DELETE FROM public.canal_transitions WHERE conversation_id = ANY(v_conv_ids);
  END IF;

  DELETE FROM public.conversations WHERE customer_id = p_customer_id;
  DELETE FROM public.portal_ticket_respostas WHERE customer_id = p_customer_id;
  DELETE FROM public.portal_tickets WHERE customer_id = p_customer_id;
  DELETE FROM public.funil_deals WHERE cliente_id = p_customer_id;
  DELETE FROM public.orcamento_itens WHERE orcamento_id IN (SELECT id FROM public.orcamentos WHERE cliente_id = p_customer_id);
  DELETE FROM public.orcamento_historico WHERE orcamento_id IN (SELECT id FROM public.orcamentos WHERE cliente_id = p_customer_id);
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
  DELETE FROM public.pedidos_ecommerce WHERE customer_id = p_customer_id;
  DELETE FROM public.ecom_active_carts WHERE customer_id = p_customer_id;
  DELETE FROM public.ecom_usage_events WHERE customer_id = p_customer_id;
  DELETE FROM public.interaction_events WHERE customer_id = p_customer_id;
  DELETE FROM public.webhook_chat_sessions WHERE customer_id = p_customer_id;
  DELETE FROM public.chat_sessions WHERE customer_id = p_customer_id;
  DELETE FROM public.agent_chat_sessions WHERE customer_id = p_customer_id;
  DELETE FROM public.vendas_atribuidas WHERE customer_id = p_customer_id;

  DELETE FROM public.customers WHERE id = p_customer_id;

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Falha ao excluir contato (%): %', SQLSTATE, SQLERRM;
END;
$function$;