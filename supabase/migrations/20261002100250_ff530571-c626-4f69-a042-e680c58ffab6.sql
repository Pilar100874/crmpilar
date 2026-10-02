CREATE TABLE public.calendario_regras_automacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL,
  nome text NOT NULL,
  descricao text,
  gatilho text NOT NULL,
  condicoes jsonb NOT NULL DEFAULT '{}'::jsonb,
  acao text NOT NULL,
  acao_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  ativa boolean NOT NULL DEFAULT true,
  execucoes integer NOT NULL DEFAULT 0,
  ultima_execucao timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendario_regras_automacao TO authenticated;
GRANT ALL ON public.calendario_regras_automacao TO service_role;
ALTER TABLE public.calendario_regras_automacao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Regras do estabelecimento" ON public.calendario_regras_automacao FOR ALL TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id())
  WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id());
CREATE INDEX ON public.calendario_regras_automacao (estabelecimento_id, gatilho) WHERE ativa;
CREATE TRIGGER trg_cra_updated BEFORE UPDATE ON public.calendario_regras_automacao
  FOR EACH ROW EXECUTE FUNCTION public.aip_touch_updated_at();

-- Motor
CREATE OR REPLACE FUNCTION public.executar_regras_agenda(_estab uuid, _gatilho text, _customer uuid, _usuario uuid, _contexto jsonb DEFAULT '{}'::jsonb)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; v_resp uuid; v_nome text; v_dias int; v_titulo text; v_n int := 0; v_lista jsonb;
BEGIN
  IF _estab IS NULL THEN RETURN 0; END IF;
  IF _customer IS NOT NULL THEN SELECT nome INTO v_nome FROM customers WHERE id = _customer; END IF;
  FOR r IN SELECT * FROM calendario_regras_automacao WHERE estabelecimento_id = _estab AND gatilho = _gatilho AND ativa LOOP
    -- condições: listas de valores aceitos
    v_lista := r.condicoes->'canais';
    IF v_lista IS NOT NULL AND jsonb_array_length(v_lista) > 0 AND NOT (v_lista ? coalesce(_contexto->>'canal','')) THEN CONTINUE; END IF;
    v_lista := r.condicoes->'status';
    IF v_lista IS NOT NULL AND jsonb_array_length(v_lista) > 0 AND NOT (v_lista ? coalesce(_contexto->>'status','')) THEN CONTINUE; END IF;
    IF coalesce(r.condicoes->>'texto_contem','') <> '' AND position(lower(r.condicoes->>'texto_contem') in lower(coalesce(_contexto->>'texto',''))) = 0 THEN CONTINUE; END IF;
    IF _customer IS NULL THEN CONTINUE; END IF;

    v_dias := coalesce((r.acao_config->>'dias')::int, 0);
    IF coalesce(r.acao_config->>'responsavel','vinculado') = 'executor' AND _usuario IS NOT NULL THEN v_resp := _usuario;
    ELSE SELECT usuario_id INTO v_resp FROM customer_vinculos WHERE customer_id = _customer ORDER BY created_at LIMIT 1;
      v_resp := coalesce(v_resp, _usuario);
    END IF;

    IF r.acao = 'criar_tarefa' THEN
      IF v_resp IS NULL THEN CONTINUE; END IF;
      IF coalesce((r.acao_config->>'evitar_duplicada')::boolean, true) AND EXISTS (
        SELECT 1 FROM calendario_tarefas WHERE contact_id = _customer AND status = 'pending' AND date >= current_date) THEN CONTINUE; END IF;
      v_titulo := replace(coalesce(nullif(r.acao_config->>'titulo',''), r.nome), '{cliente}', coalesce(v_nome,''));
      INSERT INTO calendario_tarefas (user_id, estabelecimento_id, contact_id, contact_name, title, description, date, time, origem, status, is_all_day)
      VALUES (v_resp, _estab, _customer, v_nome, v_titulo, r.acao_config->>'descricao', current_date + v_dias,
              nullif(r.acao_config->>'hora','')::time, coalesce(nullif(r.acao_config->>'canal',''),'regra'), 'pending',
              nullif(r.acao_config->>'hora','') IS NULL);
    ELSIF r.acao = 'remarcar_tarefa' THEN
      UPDATE calendario_tarefas SET data_original = coalesce(data_original, date), date = current_date + v_dias, updated_at = now()
       WHERE contact_id = _customer AND status = 'pending';
    ELSIF r.acao = 'concluir_tarefas' THEN
      UPDATE calendario_tarefas SET status = 'completed', updated_at = now() WHERE contact_id = _customer AND status = 'pending' AND date <= current_date;
    ELSIF r.acao = 'cancelar_tarefas' THEN
      UPDATE calendario_tarefas SET status = 'cancelled', updated_at = now() WHERE contact_id = _customer AND status = 'pending' AND date > current_date;
    ELSE CONTINUE; END IF;
    UPDATE calendario_regras_automacao SET execucoes = execucoes + 1, ultima_execucao = now() WHERE id = r.id;
    v_n := v_n + 1;
  END LOOP;
  RETURN v_n;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'executar_regras_agenda: %', SQLERRM; RETURN v_n;
END $$;
REVOKE ALL ON FUNCTION public.executar_regras_agenda(uuid,text,uuid,uuid,jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.executar_regras_agenda(uuid,text,uuid,uuid,jsonb) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.regras_agenda_cliente_por_telefone(_estab uuid, _num text) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM customers WHERE (_estab IS NULL OR estabelecimento_id = _estab) AND length(regexp_replace(coalesce(_num,''),'\D','','g')) >= 8
   AND (right(regexp_replace(coalesce(telefone,''),'\D','','g'),8) = right(regexp_replace(_num,'\D','','g'),8)
     OR right(regexp_replace(coalesce(tel,''),'\D','','g'),8) = right(regexp_replace(_num,'\D','','g'),8)) LIMIT 1
$$;

-- Gatilhos de tabelas
CREATE OR REPLACE FUNCTION public.trg_regras_agenda() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cust uuid; v_estab uuid; v_usr uuid; v_canal text; v_tarefa record;
BEGIN
  BEGIN
  IF TG_TABLE_NAME = 'customers' THEN
    PERFORM executar_regras_agenda(NEW.estabelecimento_id, 'contato_criado', NEW.id, get_current_usuario_id_safe(), '{}');
  ELSIF TG_TABLE_NAME = 'empresas' THEN
    SELECT id INTO v_cust FROM customers WHERE empresa_id = NEW.id LIMIT 1;
    PERFORM executar_regras_agenda(NEW.estabelecimento_id, 'empresa_criada', v_cust, get_current_usuario_id_safe(), '{}');
  ELSIF TG_TABLE_NAME = 'atendimento_registros' THEN
    SELECT contact_id INTO v_cust FROM calendario_tarefas WHERE id = NEW.tarefa_id;
    PERFORM executar_regras_agenda(NEW.estabelecimento_id, 'atendimento_finalizado', v_cust, NEW.usuario_id,
      jsonb_build_object('canal', NEW.tipo_contato, 'texto', NEW.observacao));
  ELSIF TG_TABLE_NAME = 'orcamentos' THEN
    IF TG_OP = 'INSERT' THEN
      PERFORM executar_regras_agenda(NEW.estabelecimento_id, 'orcamento_criado', NEW.cliente_id, NEW.vendedor_id, jsonb_build_object('status', NEW.status));
    ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
      PERFORM executar_regras_agenda(NEW.estabelecimento_id, 'orcamento_status', NEW.cliente_id, NEW.vendedor_id, jsonb_build_object('status', NEW.status));
    END IF;
  ELSIF TG_TABLE_NAME = 'messages' THEN
    SELECT customer_id, estabelecimento_id, canal INTO v_cust, v_estab, v_canal FROM conversations WHERE id = NEW.conversation_id;
    IF NEW.sender = 'customer' THEN
      PERFORM executar_regras_agenda(v_estab, 'whatsapp_recebido', v_cust, NULL, jsonb_build_object('canal', v_canal, 'texto', NEW.text));
    ELSIF NEW.sender = 'agent' THEN
      PERFORM executar_regras_agenda(v_estab, 'whatsapp_enviado', v_cust, NULL, jsonb_build_object('canal', v_canal, 'texto', NEW.text));
    END IF;
  ELSIF TG_TABLE_NAME = 'emails' THEN
    SELECT id INTO v_usr FROM usuarios WHERE id = NEW.user_id OR auth_user_id = NEW.user_id LIMIT 1;
    SELECT estabelecimento_id INTO v_estab FROM usuarios WHERE id = v_usr;
    IF TG_OP = 'INSERT' AND coalesce(NEW.folder,'inbox') <> 'sent' THEN
      SELECT id INTO v_cust FROM customers WHERE estabelecimento_id = v_estab AND lower(email) = lower(substring(NEW.from_email from '[^<\s]+@[^>\s]+')) LIMIT 1;
      PERFORM executar_regras_agenda(v_estab, 'email_recebido', v_cust, v_usr, jsonb_build_object('canal','email','texto', NEW.subject));
    ELSIF TG_OP = 'INSERT' THEN
      SELECT id INTO v_cust FROM customers WHERE estabelecimento_id = v_estab AND lower(email) = lower(substring(NEW.to_email from '[^<\s,]+@[^>\s,]+')) LIMIT 1;
      PERFORM executar_regras_agenda(v_estab, 'email_enviado', v_cust, v_usr, jsonb_build_object('canal','email','texto', NEW.subject));
    ELSIF TG_OP = 'UPDATE' AND OLD.opened_at IS NULL AND NEW.opened_at IS NOT NULL THEN
      SELECT id INTO v_cust FROM customers WHERE estabelecimento_id = v_estab AND lower(email) = lower(substring(NEW.to_email from '[^<\s,]+@[^>\s,]+')) LIMIT 1;
      PERFORM executar_regras_agenda(v_estab, 'email_aberto', v_cust, v_usr, jsonb_build_object('canal','email','texto', NEW.subject));
    END IF;
  ELSIF TG_TABLE_NAME = 'calls' THEN
    IF NEW.direcao = 'inbound' THEN
      v_cust := regras_agenda_cliente_por_telefone(NEW.estabelecimento_id, NEW.numero_origem);
      PERFORM executar_regras_agenda(NEW.estabelecimento_id, 'ligacao_recebida', v_cust, NULL, jsonb_build_object('canal','telefone','status',NEW.status));
    ELSE
      v_cust := regras_agenda_cliente_por_telefone(NEW.estabelecimento_id, NEW.numero_destino);
      PERFORM executar_regras_agenda(NEW.estabelecimento_id, 'ligacao_realizada', v_cust, NULL, jsonb_build_object('canal','telefone','status',NEW.status));
    END IF;
  ELSIF TG_TABLE_NAME = 'pedidos_ecommerce' THEN
    SELECT id INTO v_cust FROM customers WHERE estabelecimento_id = NEW.estabelecimento_id
      AND ((NEW.email_cliente IS NOT NULL AND lower(email) = lower(NEW.email_cliente))) LIMIT 1;
    v_cust := coalesce(v_cust, regras_agenda_cliente_por_telefone(NEW.estabelecimento_id, NEW.telefone_cliente));
    IF TG_OP = 'INSERT' THEN
      PERFORM executar_regras_agenda(NEW.estabelecimento_id, 'pedido_criado', v_cust, NULL, jsonb_build_object('status', NEW.status));
    ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
      PERFORM executar_regras_agenda(NEW.estabelecimento_id, 'pedido_alterado', v_cust, NULL, jsonb_build_object('status', NEW.status));
      IF lower(NEW.status) IN ('aprovado','pago','confirmado') THEN
        PERFORM executar_regras_agenda(NEW.estabelecimento_id, 'pedido_aprovado', v_cust, NULL, jsonb_build_object('status', NEW.status));
      END IF;
    END IF;
  END IF;
  EXCEPTION WHEN OTHERS THEN RAISE WARNING 'trg_regras_agenda %: %', TG_TABLE_NAME, SQLERRM;
  END;
  RETURN NEW;
END $$;

CREATE TRIGGER regras_agenda_customers AFTER INSERT ON public.customers FOR EACH ROW EXECUTE FUNCTION public.trg_regras_agenda();
CREATE TRIGGER regras_agenda_empresas AFTER INSERT ON public.empresas FOR EACH ROW EXECUTE FUNCTION public.trg_regras_agenda();
CREATE TRIGGER regras_agenda_atendimento AFTER INSERT ON public.atendimento_registros FOR EACH ROW EXECUTE FUNCTION public.trg_regras_agenda();
CREATE TRIGGER regras_agenda_orcamentos AFTER INSERT OR UPDATE OF status ON public.orcamentos FOR EACH ROW EXECUTE FUNCTION public.trg_regras_agenda();
CREATE TRIGGER regras_agenda_messages AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.trg_regras_agenda();
CREATE TRIGGER regras_agenda_emails AFTER INSERT OR UPDATE OF opened_at ON public.emails FOR EACH ROW EXECUTE FUNCTION public.trg_regras_agenda();
CREATE TRIGGER regras_agenda_calls AFTER INSERT ON public.calls FOR EACH ROW EXECUTE FUNCTION public.trg_regras_agenda();
CREATE TRIGGER regras_agenda_pedidos AFTER INSERT OR UPDATE OF status ON public.pedidos_ecommerce FOR EACH ROW EXECUTE FUNCTION public.trg_regras_agenda();

-- Verificação diária: clientes sem contato há X dias
CREATE OR REPLACE FUNCTION public.verificar_regras_sem_contato() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; c record; v_n int := 0; v_dias int;
BEGIN
  FOR r IN SELECT * FROM calendario_regras_automacao WHERE ativa AND gatilho = 'sem_contato_dias' LOOP
    v_dias := coalesce((r.condicoes->>'dias_sem_contato')::int, 30);
    FOR c IN SELECT cu.id FROM customers cu WHERE cu.estabelecimento_id = r.estabelecimento_id AND coalesce(cu.ativo,true)
      AND EXISTS (SELECT 1 FROM customer_vinculos v WHERE v.customer_id = cu.id)
      AND NOT EXISTS (SELECT 1 FROM calendario_tarefas t WHERE t.contact_id = cu.id AND (t.date > current_date - v_dias))
      LIMIT 500 LOOP
      v_n := v_n + executar_regras_agenda(r.estabelecimento_id, 'sem_contato_dias', c.id, NULL, '{}');
    END LOOP;
  END LOOP;
  RETURN v_n;
END $$;
REVOKE ALL ON FUNCTION public.verificar_regras_sem_contato() FROM public, anon, authenticated;

SELECT cron.schedule('regras-agenda-sem-contato', '0 9 * * *', $$SELECT public.verificar_regras_sem_contato();$$);