ALTER TABLE public.calendario_regras_automacao
  ADD COLUMN IF NOT EXISTS tela text,
  ADD COLUMN IF NOT EXISTS sistema boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS chave text,
  ADD COLUMN IF NOT EXISTS executor text NOT NULL DEFAULT 'banco',
  ADD COLUMN IF NOT EXISTS prioridade integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS relacoes jsonb NOT NULL DEFAULT '{}'::jsonb;
CREATE UNIQUE INDEX IF NOT EXISTS cra_estab_chave ON public.calendario_regras_automacao (estabelecimento_id, chave) WHERE chave IS NOT NULL;

CREATE OR REPLACE FUNCTION public.semear_regras_sistema(_estab uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _estab IS NULL THEN RETURN; END IF;
  INSERT INTO calendario_regras_automacao (estabelecimento_id, chave, sistema, executor, tela, nome, descricao, gatilho, acao, acao_config, prioridade)
  SELECT _estab, v.chave, true, v.executor, v.tela, v.nome, v.descricao, v.gatilho, v.acao, v.cfg::jsonb, v.prio
  FROM (VALUES
    ('emp_contato_temporario','banco','Cadastro de empresas','Contato temporário da empresa','Cria um contato temporário para a empresa entrar no fluxo de atendimento.','empresa_criada','criar_contato_temporario','{}',10),
    ('emp_substituir_temporario','banco','Cadastro de empresas','Substituir contato temporário','Ao vincular um contato real à empresa, as tarefas do temporário passam para ele.','contato_vinculado_empresa','transferir_tarefas','{}',10),
    ('vinc_empresa_tarefa','banco','Cadastro de empresas','Tarefa ao vincular empresa','Cria tarefa de primeiro contato para o usuário vinculado à empresa.','empresa_vinculada_usuario','criar_tarefa','{"dias":0,"titulo":"Novo vínculo: {empresa}","responsavel":"vinculado","evitar_duplicada":true,"canal":"telefone"}',50),
    ('vinc_contato_tarefa','banco','Cadastro de contatos','Tarefa ao vincular contato','Cria tarefa de acompanhamento para o gerente/vendedor vinculado ao contato.','contato_vinculado_usuario','criar_tarefa','{"dias":0,"titulo":"Acompanhamento: {cliente}","responsavel":"vinculado","evitar_duplicada":true,"canal":"telefone"}',50),
    ('inativar_cliente','tela','Cadastro de contatos','Inativar cliente','Exige motivo e substituto, cancela tarefas futuras e retira o cliente da agenda.','cliente_inativado','cancelar_tarefas','{}',5),
    ('repasse_vendedores','tela','Cadastro de contatos','Repasse de vendedores','Tarefas pendentes dos contatos passam para o novo responsável.','vendedores_repassados','transferir_tarefas','{}',20),
    ('finalizar_atendimento','tela','Atendimento','Finalizar atendimento','Registra o atendimento, conclui a tarefa do dia e cria a do próximo contato na data escolhida.','atendimento_finalizado','criar_tarefa','{"dias":"escolhido pelo usuário","titulo":"Próximo contato"}',10),
    ('uma_data_futura','tela','Atendimento','Uma única data futura por cliente','Se já existe data futura, pergunta criar nova ou modificar; fica só uma.','atendimento_finalizado','perguntar_conflito','{}',5),
    ('dias_padrao_canal','tela','Atendimento','Data sugerida por canal','Sugere a próxima data pelos dias padrão de cada canal.','atendimento_finalizado','sugerir_data','{}',30),
    ('obrigar_proxima_data','tela','Atendimento','Obrigar próxima data','Após interagir com o cliente, exige finalizar antes de trocar (exceto Atender simultâneo).','interacao_cliente','exigir_finalizacao','{}',10),
    ('inativar_pela_barra','tela','Atendimento','Inativar pela barra de próximo contato','Exige motivo, cancela tarefas futuras e retira o cliente da agenda.','cliente_inativado','cancelar_tarefas','{}',5),
    ('ignorar_movimentacao','tela','Atendimento','Ignorar movimentação','Fecha o atendimento sem alterar a agenda.','atendimento_ignorado','nenhuma','{}',90),
    ('discador_finalizacao','tela','Atendimento','Finalização no discador','Ao concluir cada ligação do discador, abre a finalização que remarca o próximo contato.','ligacao_discador','abrir_finalizacao','{}',20),
    ('nova_tarefa_conflito','tela','Calendário','Nova tarefa com tarefa futura existente','Pergunta "Trocar pela nova tarefa" ou "Manter as duas".','tarefa_criada_manual','perguntar_conflito','{}',10),
    ('arrastar_tarefa','tela','Calendário','Arrastar tarefa','Remarca a tarefa para o novo dia/horário.','tarefa_arrastada','remarcar_tarefa','{}',50),
    ('horario_vencido','tela','Calendário','Horário vencido vira atrasado','Tarefas de hoje com horário vencido contam como Atrasados.','horario_vencido','marcar_atrasado','{}',50)
  ) AS v(chave, executor, tela, nome, descricao, gatilho, acao, cfg, prio)
  ON CONFLICT (estabelecimento_id, chave) WHERE chave IS NOT NULL DO NOTHING;

  -- Regras já existentes da tela de calendário
  INSERT INTO calendario_regras_automacao (estabelecimento_id, chave, sistema, executor, tela, nome, descricao, gatilho, acao, acao_config, ativa, prioridade)
  SELECT _estab, 'cal_' || cr.tipo, true, 'tela', 'Calendário', cr.nome, cr.descricao, 'tarefa_criada_manual', 'validar_' || cr.tipo,
         coalesce(cr.configuracao,'{}'::jsonb), cr.ativa, 20 + coalesce(cr.ordem,0)
  FROM calendario_regras cr WHERE cr.estabelecimento_id = _estab
  ON CONFLICT (estabelecimento_id, chave) WHERE chave IS NOT NULL DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION public.semear_regras_sistema(uuid) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.semear_minhas_regras_sistema() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  PERFORM semear_regras_sistema(get_auth_user_estabelecimento_id());
END $$;
REVOKE ALL ON FUNCTION public.semear_minhas_regras_sistema() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.semear_minhas_regras_sistema() TO authenticated;

DO $$ DECLARE e uuid; BEGIN
  FOR e IN SELECT DISTINCT estabelecimento_id FROM usuarios WHERE estabelecimento_id IS NOT NULL LOOP
    PERFORM public.semear_regras_sistema(e);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.regra_sistema_config(_estab uuid, _chave text) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN r.id IS NULL THEN '{}'::jsonb WHEN r.ativa THEN r.acao_config ELSE NULL END
  FROM (SELECT 1) x LEFT JOIN calendario_regras_automacao r ON r.estabelecimento_id = _estab AND r.chave = _chave
$$;
REVOKE ALL ON FUNCTION public.regra_sistema_config(uuid,text) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.criar_contato_temporario_empresa()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_id uuid; v_nome text;
BEGIN
  IF regra_sistema_config(NEW.estabelecimento_id, 'emp_contato_temporario') IS NULL THEN RETURN NEW; END IF;
  v_nome := COALESCE(NULLIF(NEW.nome_fantasia,''), NEW.nome, 'Empresa');
  INSERT INTO customers (nome, telefone, tel, email, estabelecimento_id, empresa_id, ativo, custom_fields)
  VALUES (v_nome, COALESCE(NULLIF(NEW.whatsapp,''), NEW.telefone, ''), NEW.telefone, COALESCE(NEW.email,''),
          NEW.estabelecimento_id, NEW.id, true, jsonb_build_object('contato_temporario', true))
  RETURNING id INTO v_id;
  INSERT INTO customer_empresas (customer_id, empresa_id, is_primary) VALUES (v_id, NEW.id, true);
  RETURN NEW;
EXCEPTION WHEN others THEN
  RAISE WARNING 'criar_contato_temporario_empresa: %', SQLERRM; RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.criar_tarefa_acompanhamento_contato()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_nome text; v_hoje date := (now() AT TIME ZONE 'America/Sao_Paulo')::date; v_cfg jsonb; v_dias int;
BEGIN
  IF NEW.usuario_id IS NULL THEN RETURN NEW; END IF;
  v_cfg := regra_sistema_config(NEW.estabelecimento_id, 'vinc_contato_tarefa');
  IF v_cfg IS NULL THEN RETURN NEW; END IF;
  v_dias := coalesce(nullif(v_cfg->>'dias','')::int, 0);
  IF coalesce((v_cfg->>'evitar_duplicada')::boolean, true) AND EXISTS (SELECT 1 FROM calendario_tarefas WHERE user_id = NEW.usuario_id AND contact_id = NEW.customer_id AND status = 'pending') THEN
    RETURN NEW;
  END IF;
  SELECT nome INTO v_nome FROM customers WHERE id = NEW.customer_id;
  INSERT INTO calendario_tarefas (user_id, estabelecimento_id, contact_id, contact_name, title, description, date, origem, status, is_all_day, data_original)
  VALUES (NEW.usuario_id, NEW.estabelecimento_id, NEW.customer_id, COALESCE(v_nome,'Contato'),
          replace(coalesce(nullif(v_cfg->>'titulo',''),'Acompanhamento: {cliente}'),'{cliente}',COALESCE(v_nome,'Contato')),
          'Tarefa de acompanhamento criada ao vincular o contato ao gerente.',
          v_hoje + v_dias, coalesce(nullif(v_cfg->>'canal',''),'ligacao'), 'pending', true, v_hoje + v_dias);
  RETURN NEW;
EXCEPTION WHEN others THEN
  RAISE WARNING 'criar_tarefa_acompanhamento_contato: %', SQLERRM; RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.criar_tarefa_ao_vincular_empresa()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  v_nome text; v_contato uuid; v_contato_nome text; v_cfg jsonb; v_dias int;
  v_hoje date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
BEGIN
  IF NEW.usuario_id IS NULL THEN RETURN NEW; END IF;
  v_cfg := regra_sistema_config(NEW.estabelecimento_id, 'vinc_empresa_tarefa');
  IF v_cfg IS NULL THEN RETURN NEW; END IF;
  v_dias := coalesce(nullif(v_cfg->>'dias','')::int, 0);
  SELECT COALESCE(NULLIF(nome_fantasia,''), nome) INTO v_nome FROM empresas WHERE id = NEW.empresa_id;
  SELECT c.id, c.nome INTO v_contato, v_contato_nome
    FROM customer_empresas ce JOIN customers c ON c.id = ce.customer_id
    WHERE ce.empresa_id = NEW.empresa_id ORDER BY c.created_at LIMIT 1;
  IF coalesce((v_cfg->>'evitar_duplicada')::boolean, true) AND EXISTS (
    SELECT 1 FROM calendario_tarefas
    WHERE user_id = NEW.usuario_id AND date = v_hoje + v_dias AND status = 'pending'
      AND ((v_contato IS NOT NULL AND contact_id = v_contato) OR title = 'Novo vínculo: ' || COALESCE(v_nome,'Empresa'))
  ) THEN RETURN NEW; END IF;
  INSERT INTO calendario_tarefas (user_id, estabelecimento_id, contact_id, contact_name, title, description, date, origem, status, is_all_day, data_original)
  VALUES (NEW.usuario_id, NEW.estabelecimento_id, v_contato, COALESCE(v_contato_nome, v_nome, 'Empresa'),
          replace(replace(coalesce(nullif(v_cfg->>'titulo',''),'Novo vínculo: {empresa}'),'{empresa}',COALESCE(v_nome,'Empresa')),'{cliente}',COALESCE(v_contato_nome,'')),
          'Empresa vinculada ao usuário — realizar primeiro contato.', v_hoje + v_dias, coalesce(nullif(v_cfg->>'canal',''),'ligacao'), 'pending', true, v_hoje + v_dias);
  RETURN NEW;
EXCEPTION WHEN others THEN
  RAISE WARNING 'criar_tarefa_ao_vincular_empresa: %', SQLERRM;
  RETURN NEW;
END $function$;

-- Motor com condições ampliadas e relações
CREATE OR REPLACE FUNCTION public.executar_regras_agenda(_estab uuid, _gatilho text, _customer uuid, _usuario uuid, _contexto jsonb DEFAULT '{}'::jsonb)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; x record; v_resp uuid; v_nome text; v_emp record; v_dias int; v_titulo text; v_n int := 0;
  v_l jsonb; v_cust record; v_match uuid[] := '{}'; v_rel jsonb := '{}'; v_data date; v_hora time := (now() AT TIME ZONE 'America/Sao_Paulo')::time;
  v_hoje date := (now() AT TIME ZONE 'America/Sao_Paulo')::date; v_skip boolean; v_vinc uuid[];
BEGIN
  IF _estab IS NULL OR _customer IS NULL THEN RETURN 0; END IF;
  SELECT * INTO v_cust FROM customers WHERE id = _customer;
  v_nome := v_cust.nome;
  SELECT e.* INTO v_emp FROM empresas e WHERE e.id = v_cust.empresa_id;
  SELECT array_agg(usuario_id) INTO v_vinc FROM customer_vinculos WHERE customer_id = _customer;

  -- 1) regras cujas condições batem
  FOR r IN SELECT * FROM calendario_regras_automacao WHERE estabelecimento_id = _estab AND gatilho = _gatilho AND ativa AND executor = 'banco' AND NOT sistema ORDER BY prioridade, created_at LOOP
    v_l := r.condicoes->'canais'; IF jsonb_array_length(coalesce(v_l,'[]')) > 0 AND NOT (v_l ? coalesce(_contexto->>'canal','')) THEN CONTINUE; END IF;
    v_l := r.condicoes->'status'; IF jsonb_array_length(coalesce(v_l,'[]')) > 0 AND NOT (v_l ? coalesce(_contexto->>'status','')) THEN CONTINUE; END IF;
    IF coalesce(r.condicoes->>'texto_contem','') <> '' AND position(lower(r.condicoes->>'texto_contem') in lower(coalesce(_contexto->>'texto',''))) = 0 THEN CONTINUE; END IF;
    v_l := r.condicoes->'tipos_cliente'; IF jsonb_array_length(coalesce(v_l,'[]')) > 0 AND NOT (v_l ? coalesce(v_emp.tipo_cliente,'')) THEN CONTINUE; END IF;
    v_l := r.condicoes->'estados'; IF jsonb_array_length(coalesce(v_l,'[]')) > 0 AND NOT (v_l ? upper(coalesce(v_cust.estado, v_emp.estado,''))) THEN CONTINUE; END IF;
    v_l := r.condicoes->'cidades'; IF jsonb_array_length(coalesce(v_l,'[]')) > 0 AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements_text(v_l) c WHERE lower(c) = lower(coalesce(v_cust.cidade, v_emp.cidade,''))) THEN CONTINUE; END IF;
    v_l := r.condicoes->'usuarios'; IF jsonb_array_length(coalesce(v_l,'[]')) > 0 AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements_text(v_l) u WHERE u::uuid = ANY(coalesce(v_vinc,'{}'))) THEN CONTINUE; END IF;
    v_l := r.condicoes->'tags'; IF jsonb_array_length(coalesce(v_l,'[]')) > 0 AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements_text(v_l) t WHERE t = ANY(coalesce(v_cust.tags,'{}')::text[])) THEN CONTINUE; END IF;
    IF nullif(r.condicoes->>'valor_minimo','') IS NOT NULL AND coalesce(nullif(_contexto->>'valor','')::numeric, 0) < (r.condicoes->>'valor_minimo')::numeric THEN CONTINUE; END IF;
    v_l := r.condicoes->'dias_semana'; IF jsonb_array_length(coalesce(v_l,'[]')) > 0 AND NOT (v_l ? extract(dow from v_hoje)::int::text) THEN CONTINUE; END IF;
    IF nullif(r.condicoes->>'hora_de','') IS NOT NULL AND v_hora < (r.condicoes->>'hora_de')::time THEN CONTINUE; END IF;
    IF nullif(r.condicoes->>'hora_ate','') IS NOT NULL AND v_hora > (r.condicoes->>'hora_ate')::time THEN CONTINUE; END IF;
    IF r.condicoes->>'tem_tarefa_pendente' = 'sim' AND NOT EXISTS (SELECT 1 FROM calendario_tarefas WHERE contact_id = _customer AND status = 'pending') THEN CONTINUE; END IF;
    IF r.condicoes->>'tem_tarefa_pendente' = 'nao' AND EXISTS (SELECT 1 FROM calendario_tarefas WHERE contact_id = _customer AND status = 'pending') THEN CONTINUE; END IF;
    v_match := v_match || r.id;
  END LOOP;

  -- 2) aplica relações (sobrepor / ceder) e executa
  FOR r IN SELECT * FROM calendario_regras_automacao WHERE id = ANY(v_match) ORDER BY prioridade, created_at LOOP
    v_skip := false;
    FOR x IN SELECT id, relacoes FROM calendario_regras_automacao WHERE id = ANY(v_match) AND id <> r.id LOOP
      IF x.relacoes->>r.id::text = 'sobrepor' OR r.relacoes->>x.id::text = 'ceder' THEN v_skip := true; EXIT; END IF;
    END LOOP;
    IF v_skip THEN CONTINUE; END IF;

    v_dias := coalesce(nullif(r.acao_config->>'dias','')::int, 0);
    v_data := v_hoje + v_dias;
    IF coalesce((r.acao_config->>'dias_uteis')::boolean,false) THEN
      v_data := v_hoje; WHILE v_dias > 0 LOOP v_data := v_data + 1; IF extract(dow from v_data) NOT IN (0,6) THEN v_dias := v_dias - 1; END IF; END LOOP;
      WHILE extract(dow from v_data) IN (0,6) LOOP v_data := v_data + 1; END LOOP;
    END IF;
    IF coalesce(r.acao_config->>'responsavel','vinculado') = 'executor' AND _usuario IS NOT NULL THEN v_resp := _usuario;
    ELSIF nullif(r.acao_config->>'usuario_fixo','') IS NOT NULL THEN v_resp := (r.acao_config->>'usuario_fixo')::uuid;
    ELSE v_resp := coalesce(v_vinc[1], _usuario); END IF;

    IF r.acao = 'criar_tarefa' THEN
      IF v_resp IS NULL THEN CONTINUE; END IF;
      IF coalesce((r.acao_config->>'evitar_duplicada')::boolean, true) AND EXISTS (
        SELECT 1 FROM calendario_tarefas WHERE contact_id = _customer AND status = 'pending' AND date >= v_hoje) THEN CONTINUE; END IF;
      v_titulo := replace(replace(coalesce(nullif(r.acao_config->>'titulo',''), r.nome), '{cliente}', coalesce(v_nome,'')), '{empresa}', coalesce(v_emp.nome_fantasia, v_emp.nome, ''));
      INSERT INTO calendario_tarefas (user_id, estabelecimento_id, contact_id, contact_name, title, description, date, time, origem, status, is_all_day, data_original)
      VALUES (v_resp, _estab, _customer, v_nome, v_titulo, r.acao_config->>'descricao', v_data,
              nullif(r.acao_config->>'hora','')::time, coalesce(nullif(r.acao_config->>'canal',''),'regra'), 'pending',
              nullif(r.acao_config->>'hora','') IS NULL, v_data);
    ELSIF r.acao = 'remarcar_tarefa' THEN
      UPDATE calendario_tarefas SET data_original = coalesce(data_original, date), date = v_data, updated_at = now()
       WHERE contact_id = _customer AND status = 'pending';
    ELSIF r.acao = 'concluir_tarefas' THEN
      UPDATE calendario_tarefas SET status = 'completed', updated_at = now() WHERE contact_id = _customer AND status = 'pending' AND date <= v_hoje;
    ELSIF r.acao = 'cancelar_tarefas' THEN
      UPDATE calendario_tarefas SET status = 'cancelled', updated_at = now() WHERE contact_id = _customer AND status = 'pending' AND date > v_hoje;
    ELSIF r.acao = 'transferir_tarefas' THEN
      IF v_resp IS NULL THEN CONTINUE; END IF;
      UPDATE calendario_tarefas SET user_id = v_resp, updated_at = now() WHERE contact_id = _customer AND status = 'pending';
    ELSE CONTINUE; END IF;
    UPDATE calendario_regras_automacao SET execucoes = execucoes + 1, ultima_execucao = now() WHERE id = r.id;
    v_n := v_n + 1;
  END LOOP;
  RETURN v_n;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'executar_regras_agenda: %', SQLERRM; RETURN v_n;
END $$;
REVOKE ALL ON FUNCTION public.executar_regras_agenda(uuid,text,uuid,uuid,jsonb) FROM public, anon, authenticated;

-- valor do orçamento no contexto
CREATE OR REPLACE FUNCTION public.trg_regras_agenda_orc() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  BEGIN
    IF TG_OP = 'INSERT' THEN
      PERFORM executar_regras_agenda(NEW.estabelecimento_id, 'orcamento_criado', NEW.cliente_id, NEW.vendedor_id, jsonb_build_object('status', NEW.status, 'valor', NEW.valor_total));
    ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
      PERFORM executar_regras_agenda(NEW.estabelecimento_id, 'orcamento_status', NEW.cliente_id, NEW.vendedor_id, jsonb_build_object('status', NEW.status, 'valor', NEW.valor_total));
    END IF;
  EXCEPTION WHEN OTHERS THEN RAISE WARNING 'trg_regras_agenda_orc: %', SQLERRM; END;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.trg_regras_agenda_orc() FROM public, anon, authenticated;
DROP TRIGGER IF EXISTS regras_agenda_orcamentos ON public.orcamentos;
CREATE TRIGGER regras_agenda_orcamentos AFTER INSERT OR UPDATE OF status ON public.orcamentos FOR EACH ROW EXECUTE FUNCTION public.trg_regras_agenda_orc();