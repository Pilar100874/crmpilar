
-- Add ativo columns where missing
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;
ALTER TABLE public.quick_replies ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;
ALTER TABLE public.skills ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;
ALTER TABLE public.canais_atendimento ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;
ALTER TABLE public.produto_grupos ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_empresas_ativo ON public.empresas(ativo) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_usuarios_ativo ON public.usuarios(ativo) WHERE ativo = true;

-- Generic dependency checker
CREATE OR REPLACE FUNCTION public.check_entity_dependencies(p_entity text, p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v jsonb := '{}'::jsonb;
  n bigint;
  txt text := p_id::text;
BEGIN
  CASE p_entity

  WHEN 'empresa' THEN
    SELECT count(*) INTO n FROM public.customer_empresas WHERE empresa_id = p_id;
    IF n>0 THEN v := v || jsonb_build_object('Contatos vinculados', n); END IF;
    SELECT count(*) INTO n FROM public.customers WHERE empresa_id = p_id;
    IF n>0 THEN v := v || jsonb_build_object('Clientes diretos', n); END IF;
    SELECT count(*) INTO n FROM public.orcamentos WHERE empresa_id = p_id;
    IF n>0 THEN v := v || jsonb_build_object('Orçamentos', n); END IF;
    SELECT count(*) INTO n FROM public.funil_deals WHERE empresa_id = p_id;
    IF n>0 THEN v := v || jsonb_build_object('Negociações no funil', n); END IF;
    SELECT count(*) INTO n FROM public.pedidos_ecommerce WHERE empresa_id = p_id;
    IF n>0 THEN v := v || jsonb_build_object('Pedidos e-commerce', n); END IF;
    SELECT count(*) INTO n FROM public.calendario_tarefas WHERE empresa_id::text = txt;
    IF n>0 THEN v := v || jsonb_build_object('Tarefas de agenda', n); END IF;

  WHEN 'produto' THEN
    SELECT count(*) INTO n FROM public.orcamento_itens WHERE produto_id = p_id;
    IF n>0 THEN v := v || jsonb_build_object('Itens em orçamentos', n); END IF;
    SELECT count(*) INTO n FROM public.pedidos_ecommerce_itens WHERE produto_id = p_id;
    IF n>0 THEN v := v || jsonb_build_object('Itens em pedidos', n); END IF;
    SELECT count(*) INTO n FROM public.marketplace_produtos WHERE produto_id = p_id;
    IF n>0 THEN v := v || jsonb_build_object('Publicações em marketplace', n); END IF;
    SELECT count(*) INTO n FROM public.mensagens_grupo_produto WHERE grupo_id IN (SELECT grupo_id FROM public.produtos WHERE id = p_id);
    IF n>0 THEN v := v || jsonb_build_object('Mensagens do grupo', n); END IF;

  WHEN 'veiculo' THEN
    SELECT count(*) INTO n FROM public.veiculo_posicoes WHERE veiculo_id = p_id;
    IF n>0 THEN v := v || jsonb_build_object('Posições registradas', n); END IF;
    SELECT count(*) INTO n FROM public.entregas_programadas WHERE veiculo_id = p_id;
    IF n>0 THEN v := v || jsonb_build_object('Entregas programadas', n); END IF;
    SELECT count(*) INTO n FROM public.veiculos_custos WHERE veiculo_id = p_id;
    IF n>0 THEN v := v || jsonb_build_object('Custos registrados', n); END IF;
    SELECT count(*) INTO n FROM public.livro_encomendas WHERE veiculo_id = p_id;
    IF n>0 THEN v := v || jsonb_build_object('Encomendas', n); END IF;

  WHEN 'motorista' THEN
    SELECT count(*) INTO n FROM public.cv_vehicle_movements WHERE driver_id = p_id;
    IF n>0 THEN v := v || jsonb_build_object('Movimentações de veículos', n); END IF;

  WHEN 'usuario' THEN
    SELECT count(*) INTO n FROM public.atendimento_registros WHERE atendente_id = p_id;
    IF n>0 THEN v := v || jsonb_build_object('Atendimentos', n); END IF;
    SELECT count(*) INTO n FROM public.conversations WHERE atendente_id = p_id;
    IF n>0 THEN v := v || jsonb_build_object('Conversas atribuídas', n); END IF;
    SELECT count(*) INTO n FROM public.orcamentos WHERE vendedor_id = p_id;
    IF n>0 THEN v := v || jsonb_build_object('Orçamentos como vendedor', n); END IF;

  WHEN 'whatsapp_sessao' THEN
    SELECT count(*) INTO n FROM public.bot_flows WHERE (flow_data)::text LIKE '%' || txt || '%';
    IF n>0 THEN v := v || jsonb_build_object('Fluxos de bot', n); END IF;
    SELECT count(*) INTO n FROM public.omnichannel_flows WHERE (flow_data)::text LIKE '%' || txt || '%';
    IF n>0 THEN v := v || jsonb_build_object('Fluxos omnichannel', n); END IF;
    SELECT count(*) INTO n FROM public.logistica_automacoes WHERE (config)::text LIKE '%' || txt || '%';
    IF n>0 THEN v := v || jsonb_build_object('Automações de logística', n); END IF;
    SELECT count(*) INTO n FROM public.tv_workflows WHERE (workflow_data)::text LIKE '%' || txt || '%';
    IF n>0 THEN v := v || jsonb_build_object('Workflows de TV', n); END IF;
    SELECT count(*) INTO n FROM public.campaigns WHERE (config)::text LIKE '%' || txt || '%';
    IF n>0 THEN v := v || jsonb_build_object('Campanhas', n); END IF;

  WHEN 'quick_reply' THEN
    SELECT count(*) INTO n FROM public.bot_flows WHERE (flow_data)::text LIKE '%' || txt || '%';
    IF n>0 THEN v := v || jsonb_build_object('Fluxos de bot', n); END IF;

  WHEN 'mensagem_grupo' THEN
    SELECT count(*) INTO n FROM public.bot_flows WHERE (flow_data)::text LIKE '%' || txt || '%';
    IF n>0 THEN v := v || jsonb_build_object('Fluxos de bot', n); END IF;
    SELECT count(*) INTO n FROM public.bot_frase_uso WHERE frase_id = p_id;
    IF n>0 THEN v := v || jsonb_build_object('Usos registrados', n); END IF;

  WHEN 'agente_ia' THEN
    SELECT count(*) INTO n FROM public.omnichannel_flows WHERE (flow_data)::text LIKE '%' || txt || '%';
    IF n>0 THEN v := v || jsonb_build_object('Fluxos omnichannel', n); END IF;
    SELECT count(*) INTO n FROM public.agent_chat_sessions WHERE agent_id = p_id;
    IF n>0 THEN v := v || jsonb_build_object('Sessões de chat', n); END IF;

  WHEN 'cupom' THEN
    SELECT count(*) INTO n FROM public.ecommerce_rules WHERE (config)::text LIKE '%' || txt || '%';
    IF n>0 THEN v := v || jsonb_build_object('Regras de e-commerce', n); END IF;
    SELECT count(*) INTO n FROM public.pedidos_ecommerce WHERE cupom_id = p_id;
    IF n>0 THEN v := v || jsonb_build_object('Pedidos que usaram', n); END IF;

  WHEN 'tabela_preco' THEN
    SELECT count(*) INTO n FROM public.produtos_fontes_precos WHERE tabela_preco_id = p_id;
    IF n>0 THEN v := v || jsonb_build_object('Produtos vinculados', n); END IF;

  WHEN 'workflow' THEN
    -- generic: no external dependencies to check (workflows have no children referencing them)
    NULL;

  ELSE
    RAISE EXCEPTION 'Entidade desconhecida: %', p_entity;
  END CASE;

  RETURN v;
EXCEPTION WHEN undefined_column OR undefined_table THEN
  RETURN v;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_entity_dependencies(text, uuid) TO authenticated;

-- Generic inactivation
CREATE OR REPLACE FUNCTION public.inactivate_entity(p_entity text, p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  CASE p_entity
    WHEN 'empresa'        THEN UPDATE public.empresas SET ativo=false WHERE id=p_id;
    WHEN 'produto'        THEN UPDATE public.produtos SET ativo=false WHERE id=p_id;
    WHEN 'veiculo'        THEN UPDATE public.veiculos SET ativo=false WHERE id=p_id;
    WHEN 'motorista'      THEN UPDATE public.cv_drivers SET active=false WHERE id=p_id;
    WHEN 'usuario'        THEN UPDATE public.usuarios SET ativo=false WHERE id=p_id;
    WHEN 'quick_reply'    THEN UPDATE public.quick_replies SET ativo=false WHERE id=p_id;
    WHEN 'mensagem_grupo' THEN UPDATE public.mensagens_grupo_produto SET ativo=false WHERE id=p_id;
    WHEN 'agente_ia'      THEN UPDATE public.chat_agents SET ativo=false WHERE id=p_id;
    WHEN 'cupom'          THEN UPDATE public.cupons_desconto SET ativo=false WHERE id=p_id;
    WHEN 'tabela_preco'   THEN UPDATE public.tabelas_preco SET ativo=false WHERE id=p_id;
    WHEN 'workflow_bot'   THEN UPDATE public.bot_flows SET active=false WHERE id=p_id;
    WHEN 'workflow_tv'    THEN UPDATE public.tv_workflows SET ativo=false WHERE id=p_id;
    WHEN 'workflow_logistica' THEN UPDATE public.logistica_automacoes SET ativo=false WHERE id=p_id;
    WHEN 'workflow_omni'  THEN UPDATE public.omnichannel_flows SET ativo=false WHERE id=p_id;
    WHEN 'contato'        THEN UPDATE public.customers SET ativo=false WHERE id=p_id;
    ELSE RAISE EXCEPTION 'Entidade desconhecida: %', p_entity;
  END CASE;
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.inactivate_entity(text, uuid) TO authenticated;
