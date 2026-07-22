
CREATE OR REPLACE FUNCTION public.check_customer_dependencies(p_customer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v jsonb := '{}'::jsonb;
  n bigint;
BEGIN
  SELECT count(*) INTO n FROM public.conversations WHERE customer_id = p_customer_id;
  IF n > 0 THEN v := v || jsonb_build_object('conversas', n); END IF;

  SELECT count(*) INTO n FROM public.messages m JOIN public.conversations c ON c.id=m.conversation_id WHERE c.customer_id = p_customer_id;
  IF n > 0 THEN v := v || jsonb_build_object('mensagens', n); END IF;

  SELECT count(*) INTO n FROM public.orcamentos WHERE cliente_id = p_customer_id;
  IF n > 0 THEN v := v || jsonb_build_object('orcamentos', n); END IF;

  SELECT count(*) INTO n FROM public.funil_deals WHERE cliente_id = p_customer_id;
  IF n > 0 THEN v := v || jsonb_build_object('negociacoes_funil', n); END IF;

  SELECT count(*) INTO n FROM public.portal_tickets WHERE customer_id = p_customer_id;
  IF n > 0 THEN v := v || jsonb_build_object('tickets_portal', n); END IF;

  SELECT count(*) INTO n FROM public.calendario_tarefas WHERE contact_id = p_customer_id;
  IF n > 0 THEN v := v || jsonb_build_object('tarefas_agenda', n); END IF;

  SELECT count(*) INTO n FROM public.envio_massa_contatos WHERE customer_id = p_customer_id;
  IF n > 0 THEN v := v || jsonb_build_object('envio_massa', n); END IF;

  SELECT count(*) INTO n FROM public.pesquisas_respostas WHERE customer_id = p_customer_id;
  IF n > 0 THEN v := v || jsonb_build_object('respostas_pesquisa', n); END IF;

  SELECT count(*) INTO n FROM public.ecom_active_carts WHERE customer_id = p_customer_id;
  IF n > 0 THEN v := v || jsonb_build_object('carrinhos_ativos', n); END IF;

  SELECT count(*) INTO n FROM public.customer_empresas WHERE customer_id = p_customer_id;
  IF n > 0 THEN v := v || jsonb_build_object('empresas_vinculadas', n); END IF;

  RETURN v;
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_customer_cascade(p_customer_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
SET statement_timeout TO '60s'
AS $function$
DECLARE
  v_conv_ids uuid[];
  v_deps jsonb;
BEGIN
  v_deps := public.check_customer_dependencies(p_customer_id);
  IF v_deps <> '{}'::jsonb THEN
    RAISE EXCEPTION 'CONTATO_EM_USO: %', v_deps::text USING ERRCODE = 'P0001';
  END IF;

  SELECT array_agg(id) INTO v_conv_ids FROM public.conversations WHERE customer_id = p_customer_id;

  DELETE FROM public.calendario_tarefas WHERE contact_id = p_customer_id;

  IF v_conv_ids IS NOT NULL THEN
    DELETE FROM public.messages WHERE conversation_id = ANY(v_conv_ids);
    DELETE FROM public.chat_tags_aplicadas WHERE chat_id = ANY(v_conv_ids);
    DELETE FROM public.chat_transferencias WHERE chat_id = ANY(v_conv_ids);
    DELETE FROM public.sentiment_analysis WHERE chat_id = ANY(v_conv_ids);
    DELETE FROM public.sentiment_conversation_summary WHERE chat_id = ANY(v_conv_ids);
    DELETE FROM public.sentiment_alerts WHERE chat_id = ANY(v_conv_ids);
    DELETE FROM public.sla_violations WHERE conversation_id = ANY(v_conv_ids);
    DELETE FROM public.qa_avaliacoes WHERE chat_id = ANY(v_conv_ids);
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
  DELETE FROM public.ecom_active_carts WHERE customer_id = p_customer_id;
  DELETE FROM public.ecom_usage_events WHERE customer_id = p_customer_id;

  DELETE FROM public.customers WHERE id = p_customer_id;

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    IF SQLSTATE = 'P0001' THEN
      RAISE;
    END IF;
    RAISE EXCEPTION 'Falha ao excluir contato (%): %', SQLSTATE, SQLERRM;
END;
$function$;
