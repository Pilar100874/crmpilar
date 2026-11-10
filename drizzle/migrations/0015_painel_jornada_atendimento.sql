CREATE OR REPLACE FUNCTION public.dashboard_jornada_atendimento(p_inicio date, p_fim date, p_equipe boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_eu uuid; v_estab uuid; v_comparar boolean; v_result jsonb;
BEGIN
 SELECT id, estabelecimento_id INTO v_eu,v_estab FROM public.usuarios WHERE auth_user_id=auth.uid() LIMIT 1;
 IF v_eu IS NULL THEN RAISE EXCEPTION 'Usuário não identificado'; END IF;
 IF p_inicio IS NULL OR p_fim IS NULL OR p_fim<p_inicio OR p_fim-p_inicio>366 THEN RAISE EXCEPTION 'Selecione um período de até um ano'; END IF;
 v_comparar := public.auth_usuario_tem_papel('admin'::public.app_role) OR public.auth_usuario_tem_papel('gestor'::public.app_role);
 WITH us AS (
 SELECT id,nome,auth_user_id,ramal FROM public.usuarios WHERE estabelecimento_id=v_estab AND (id=v_eu OR (p_equipe AND v_comparar))
 ), eventos AS (
 SELECT r.id::text id,r.usuario_id uid,r.created_at instante,'atendimento_'||r.tipo_contato metrica,1::numeric valor FROM public.atendimento_registros r WHERE r.estabelecimento_id=v_estab
 UNION ALL
 SELECT c.id::text,u.id,coalesce(c.horario_inicio,c.created_at),'ligacoes_realizadas',1 FROM public.calls c JOIN us u ON nullif(u.ramal,'')=c.ramal WHERE c.estabelecimento_id=v_estab AND c.direcao IN ('outbound','saida','outgoing','sainte')
 UNION ALL
 SELECT c.id::text,u.id,c.horario_atendimento,'ligacoes_atendidas',1 FROM public.calls c JOIN us u ON nullif(u.ramal,'')=c.ramal WHERE c.estabelecimento_id=v_estab AND c.horario_atendimento IS NOT NULL
 UNION ALL
 SELECT c.id::text,u.id,c.horario_atendimento,'segundos_ligacao',greatest(coalesce(c.duracao_segundos,0),0) FROM public.calls c JOIN us u ON nullif(u.ramal,'')=c.ramal WHERE c.estabelecimento_id=v_estab AND c.horario_atendimento IS NOT NULL
 UNION ALL
 SELECT e.id::text,u.id,coalesce(e.date,e.created_at),'emails_enviados',1 FROM public.emails e JOIN us u ON e.user_id=u.id OR e.user_id=u.auth_user_id WHERE lower(e.folder)='sent'
 UNION ALL
 SELECT e.id::text,u.id,coalesce(e.date,e.created_at),'emails_respondidos',1 FROM public.emails e JOIN us u ON e.user_id=u.id OR e.user_id=u.auth_user_id WHERE lower(e.folder)='sent' AND e.subject ~* '^(re|res|aw):'
 UNION ALL
 SELECT m.id::text,u.id,m.created_at,'whatsapp_registrados',1 FROM public.messages m JOIN public.conversations c ON c.id=m.conversation_id JOIN us u ON m.payload->>'usuario_id'=u.id::text OR m.payload->>'auth_user_id'=u.auth_user_id::text WHERE c.estabelecimento_id=v_estab AND m.sender='agent'
 UNION ALL
 SELECT v.id::text,v.usuario_id,coalesce(v.hora_chegada,v.verificada_em,v.created_at),'visitas_confirmadas',1 FROM public.visita_ocorrencias v WHERE v.estabelecimento_id=v_estab AND v.status='realizada'
 UNION ALL
 SELECT t.id::text,t.user_id,t.created_at,'massa_'||coalesce(t.origem_sub_item,'outro')||'_retornos',1 FROM public.calendario_tarefas t WHERE t.estabelecimento_id=v_estab AND t.origem='envio_massa'
 UNION ALL
 SELECT h.id::text,u.id,h.created_at,'pedidos_fechados',1 FROM public.orcamento_historico h JOIN public.orcamentos o ON o.id=h.orcamento_id JOIN us u ON h.usuario_id=u.id OR h.usuario_id=u.auth_user_id WHERE o.estabelecimento_id=v_estab AND h.dados_novos->>'etapa'='finalizado' AND coalesce(h.dados_anteriores->>'etapa','')<>'finalizado' AND o.etapa='finalizado'
 UNION ALL
 SELECT h.id::text,u.id,h.created_at,'valor_vendas',coalesce(nullif(h.dados_novos->>'valor_total','')::numeric,o.valor_total,0) FROM public.orcamento_historico h JOIN public.orcamentos o ON o.id=h.orcamento_id JOIN us u ON h.usuario_id=u.id OR h.usuario_id=u.auth_user_id WHERE o.estabelecimento_id=v_estab AND h.dados_novos->>'etapa'='finalizado' AND coalesce(h.dados_anteriores->>'etapa','')<>'finalizado' AND o.etapa='finalizado'
 ), diarios AS (
 SELECT e.uid usuario_id,(e.instante AT TIME ZONE 'America/Sao_Paulo')::date dia,e.metrica,sum(e.valor) valor FROM eventos e JOIN us ON us.id=e.uid WHERE (e.instante AT TIME ZONE 'America/Sao_Paulo')::date BETWEEN p_inicio-(p_fim-p_inicio+1) AND p_fim GROUP BY e.uid,dia,e.metrica
 ), pendencias AS (
 SELECT u.id usuario_id,count(distinct t.contact_id) FILTER (WHERE t.date<(now() AT TIME ZONE 'America/Sao_Paulo')::date) atrasados,count(distinct t.contact_id) FILTER (WHERE t.date=(now() AT TIME ZONE 'America/Sao_Paulo')::date) agendados_hoje FROM us u LEFT JOIN public.calendario_tarefas t ON t.user_id=u.id AND t.estabelecimento_id=v_estab AND t.status IN ('pending','pendente') GROUP BY u.id
 ) SELECT jsonb_build_object('usuario_id',v_eu,'pode_comparar',v_comparar,'usuarios',coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'nome',nome) ORDER BY nome) FROM us),'[]'::jsonb),'diarios',coalesce((SELECT jsonb_agg(to_jsonb(d)) FROM diarios d),'[]'::jsonb),'pendencias',coalesce((SELECT jsonb_agg(to_jsonb(p)) FROM pendencias p),'[]'::jsonb),'sem_autoria',jsonb_build_object('mensagens', (SELECT count(*) FROM public.messages m JOIN public.conversations c ON c.id=m.conversation_id WHERE c.estabelecimento_id=v_estab AND m.sender='agent' AND nullif(m.payload->>'usuario_id','') IS NULL AND nullif(m.payload->>'auth_user_id','') IS NULL AND (m.created_at AT TIME ZONE 'America/Sao_Paulo')::date BETWEEN p_inicio AND p_fim AND p_equipe AND v_comparar),'pedidos',(SELECT count(*) FROM public.orcamentos o WHERE o.estabelecimento_id=v_estab AND o.etapa='finalizado' AND NOT EXISTS(SELECT 1 FROM public.orcamento_historico h WHERE h.orcamento_id=o.id AND h.dados_novos->>'etapa'='finalizado' AND h.usuario_id IS NOT NULL) AND (o.updated_at AT TIME ZONE 'America/Sao_Paulo')::date BETWEEN p_inicio AND p_fim AND p_equipe AND v_comparar))) INTO v_result;
 RETURN v_result;
END $$;
REVOKE ALL ON FUNCTION public.dashboard_jornada_atendimento(date,date,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.dashboard_jornada_atendimento(date,date,boolean) TO authenticated,service_role;
CREATE INDEX IF NOT EXISTS atendimento_registros_jornada_idx ON public.atendimento_registros(estabelecimento_id,created_at,usuario_id);
CREATE INDEX IF NOT EXISTS calls_jornada_idx ON public.calls(estabelecimento_id,horario_inicio,ramal);
COMMENT ON FUNCTION public.dashboard_jornada_atendimento(date,date,boolean) IS 'Read-only daily aggregates; self by default, establishment comparison for protected admin/gestor roles only; no inferred historical authorship or delivery.';