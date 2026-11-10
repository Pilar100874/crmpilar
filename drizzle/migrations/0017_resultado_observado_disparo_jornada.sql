ALTER TABLE public.envio_massa_contatos ADD COLUMN IF NOT EXISTS resultado_observado text;
COMMENT ON COLUMN public.envio_massa_contatos.resultado_observado IS 'Observed shared runner outcome: registrado, encaminhado, erro or cancelado; handoff is not delivery. Legacy status remains compatible.';
CREATE OR REPLACE FUNCTION public.dashboard_resultados_disparo(p_inicio date,p_fim date,p_equipe boolean DEFAULT false) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE v_uid uuid;v_estab uuid;v_equipe boolean;
BEGIN
 SELECT id,estabelecimento_id INTO v_uid,v_estab FROM public.usuarios WHERE auth_user_id=auth.uid() LIMIT 1;
 IF v_uid IS NULL THEN RAISE EXCEPTION 'Usuário não identificado'; END IF;
 IF p_inicio IS NULL OR p_fim IS NULL OR p_fim<p_inicio OR p_fim-p_inicio>366 THEN RAISE EXCEPTION 'Período inválido'; END IF;
 v_equipe:=p_equipe AND (public.auth_usuario_tem_papel('admin'::public.app_role) OR public.auth_usuario_tem_papel('gestor'::public.app_role));
 RETURN coalesce((SELECT jsonb_agg(to_jsonb(d)) FROM (
 SELECT e.usuario_id,(coalesce(c.enviado_em,c.created_at) AT TIME ZONE 'America/Sao_Paulo')::date dia,'massa_'||coalesce(e.conteudo->>'canal','outro')||'_'||c.resultado_observado metrica,count(*) valor
 FROM public.envio_massa e JOIN public.envio_massa_contatos c ON c.envio_id=e.id
 WHERE e.estabelecimento_id=v_estab AND (e.usuario_id=v_uid OR v_equipe) AND c.resultado_observado IN ('encaminhado','registrado','erro','cancelado') AND (coalesce(c.enviado_em,c.created_at) AT TIME ZONE 'America/Sao_Paulo')::date BETWEEN p_inicio-(p_fim-p_inicio+1) AND p_fim GROUP BY e.usuario_id,dia,metrica
 ) d),'[]'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.dashboard_resultados_disparo(date,date,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.dashboard_resultados_disparo(date,date,boolean) TO authenticated,service_role;