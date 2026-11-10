CREATE OR REPLACE FUNCTION public.jornada_autoria_mensagem() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_uid uuid;
BEGIN
 IF NEW.sender='agent' AND auth.uid() IS NOT NULL THEN
 SELECT u.id INTO v_uid FROM public.usuarios u JOIN public.conversations c ON c.estabelecimento_id=u.estabelecimento_id WHERE u.auth_user_id=auth.uid() AND c.id=NEW.conversation_id LIMIT 1;
 IF v_uid IS NOT NULL THEN NEW.payload:=coalesce(NEW.payload,'{}'::jsonb)||jsonb_build_object('usuario_id',v_uid,'auth_user_id',auth.uid()); END IF;
 END IF; RETURN NEW;
END $$;
CREATE TRIGGER jornada_autoria_mensagem BEFORE INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.jornada_autoria_mensagem();
CREATE OR REPLACE FUNCTION public.jornada_fechamento_pedido() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_uid uuid;
BEGIN
 IF NEW.etapa='finalizado' AND OLD.etapa IS DISTINCT FROM NEW.etapa THEN
 SELECT id INTO v_uid FROM public.usuarios WHERE auth_user_id=auth.uid() AND estabelecimento_id=NEW.estabelecimento_id LIMIT 1;
 IF v_uid IS NOT NULL THEN INSERT INTO public.orcamento_historico(orcamento_id,usuario_id,tipo_usuario,acao,dados_anteriores,dados_novos) VALUES(NEW.id,v_uid,'vendedor','jornada_fechamento',jsonb_build_object('etapa',OLD.etapa),jsonb_build_object('etapa',NEW.etapa,'valor_total',NEW.valor_total)); END IF;
 END IF; RETURN NEW;
END $$;
CREATE TRIGGER jornada_fechamento_pedido AFTER UPDATE OF etapa ON public.orcamentos FOR EACH ROW EXECUTE FUNCTION public.jornada_fechamento_pedido();
CREATE OR REPLACE FUNCTION public.dashboard_resultados_disparo(p_inicio date,p_fim date,p_equipe boolean DEFAULT false) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE v_uid uuid;v_estab uuid;v_equipe boolean;
BEGIN
 SELECT id,estabelecimento_id INTO v_uid,v_estab FROM public.usuarios WHERE auth_user_id=auth.uid() LIMIT 1;
 IF v_uid IS NULL THEN RAISE EXCEPTION 'Usuário não identificado'; END IF;
 IF p_inicio IS NULL OR p_fim IS NULL OR p_fim<p_inicio OR p_fim-p_inicio>366 THEN RAISE EXCEPTION 'Período inválido'; END IF;
 v_equipe:=p_equipe AND (public.auth_usuario_tem_papel('admin'::public.app_role) OR public.auth_usuario_tem_papel('gestor'::public.app_role));
 RETURN coalesce((SELECT jsonb_agg(to_jsonb(d)) FROM (
 SELECT e.usuario_id,(coalesce(c.enviado_em,c.created_at) AT TIME ZONE 'America/Sao_Paulo')::date dia,'massa_'||coalesce(e.conteudo->>'canal','outro')||'_'||c.status metrica,count(*) valor
 FROM public.envio_massa e JOIN public.envio_massa_contatos c ON c.envio_id=e.id
 WHERE e.estabelecimento_id=v_estab AND (e.usuario_id=v_uid OR v_equipe) AND c.status IN ('encaminhado','registrado','erro','cancelado') AND (coalesce(c.enviado_em,c.created_at) AT TIME ZONE 'America/Sao_Paulo')::date BETWEEN p_inicio-(p_fim-p_inicio+1) AND p_fim GROUP BY e.usuario_id,dia,metrica
 ) d),'[]'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.dashboard_resultados_disparo(date,date,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.dashboard_resultados_disparo(date,date,boolean) TO authenticated,service_role;
REVOKE ALL ON FUNCTION public.jornada_autoria_mensagem() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.jornada_fechamento_pedido() FROM PUBLIC,anon,authenticated;