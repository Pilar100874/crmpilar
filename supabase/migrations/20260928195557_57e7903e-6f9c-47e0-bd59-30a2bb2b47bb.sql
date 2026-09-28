CREATE OR REPLACE FUNCTION public.criar_contato_temporario_empresa()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_id uuid; v_nome text;
BEGIN
  v_nome := COALESCE(NULLIF(NEW.nome_fantasia,''), NEW.nome, 'Empresa');
  INSERT INTO customers (nome, telefone, tel, email, estabelecimento_id, empresa_id, ativo, custom_fields)
  VALUES (v_nome, COALESCE(NULLIF(NEW.whatsapp,''), NEW.telefone, ''), NEW.telefone, COALESCE(NEW.email,''),
          NEW.estabelecimento_id, NEW.id, true, jsonb_build_object('contato_temporario', true))
  RETURNING id INTO v_id;
  INSERT INTO customer_empresas (customer_id, empresa_id, is_primary) VALUES (v_id, NEW.id, true);
  RETURN NEW;
EXCEPTION WHEN others THEN
  RAISE WARNING 'criar_contato_temporario_empresa: %', SQLERRM; RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_contato_temporario_empresa ON public.empresas;
CREATE TRIGGER trg_contato_temporario_empresa AFTER INSERT ON public.empresas
FOR EACH ROW EXECUTE FUNCTION public.criar_contato_temporario_empresa();

CREATE OR REPLACE FUNCTION public.substituir_contato_temporario()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r record; v_real_nome text;
BEGIN
  IF EXISTS (SELECT 1 FROM customers WHERE id = NEW.customer_id AND COALESCE((custom_fields->>'contato_temporario')::boolean,false)) THEN
    RETURN NEW;
  END IF;
  SELECT nome INTO v_real_nome FROM customers WHERE id = NEW.customer_id;
  FOR r IN SELECT c.id FROM customer_empresas ce JOIN customers c ON c.id = ce.customer_id
           WHERE ce.empresa_id = NEW.empresa_id AND COALESCE((c.custom_fields->>'contato_temporario')::boolean,false)
  LOOP
    UPDATE calendario_tarefas SET contact_id = NEW.customer_id, contact_name = v_real_nome WHERE contact_id = r.id;
    INSERT INTO customer_vinculos (customer_id, usuario_id, segmento_id, estabelecimento_id)
      SELECT NEW.customer_id, v.usuario_id, v.segmento_id, v.estabelecimento_id FROM customer_vinculos v
      WHERE v.customer_id = r.id AND NOT EXISTS (SELECT 1 FROM customer_vinculos x WHERE x.customer_id = NEW.customer_id AND x.usuario_id IS NOT DISTINCT FROM v.usuario_id);
    BEGIN
      DELETE FROM customer_vinculos WHERE customer_id = r.id;
      DELETE FROM customer_empresas WHERE customer_id = r.id;
      DELETE FROM customers WHERE id = r.id;
    EXCEPTION WHEN others THEN
      UPDATE customers SET ativo = false WHERE id = r.id;
    END;
  END LOOP;
  RETURN NEW;
EXCEPTION WHEN others THEN
  RAISE WARNING 'substituir_contato_temporario: %', SQLERRM; RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_substituir_contato_temporario ON public.customer_empresas;
CREATE TRIGGER trg_substituir_contato_temporario AFTER INSERT ON public.customer_empresas
FOR EACH ROW EXECUTE FUNCTION public.substituir_contato_temporario();

CREATE OR REPLACE FUNCTION public.criar_tarefa_acompanhamento_contato()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_nome text; v_hoje date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
BEGIN
  IF NEW.usuario_id IS NULL THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM calendario_tarefas WHERE user_id = NEW.usuario_id AND contact_id = NEW.customer_id AND status = 'pending') THEN
    RETURN NEW;
  END IF;
  SELECT nome INTO v_nome FROM customers WHERE id = NEW.customer_id;
  INSERT INTO calendario_tarefas (user_id, estabelecimento_id, contact_id, contact_name, title, description, date, origem, status, is_all_day, data_original)
  VALUES (NEW.usuario_id, NEW.estabelecimento_id, NEW.customer_id, COALESCE(v_nome,'Contato'),
          'Acompanhamento: ' || COALESCE(v_nome,'Contato'), 'Tarefa de acompanhamento criada ao vincular o contato ao gerente.',
          v_hoje, 'ligacao', 'pending', true, v_hoje);
  RETURN NEW;
EXCEPTION WHEN others THEN
  RAISE WARNING 'criar_tarefa_acompanhamento_contato: %', SQLERRM; RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_tarefa_acompanhamento_contato ON public.customer_vinculos;
CREATE TRIGGER trg_tarefa_acompanhamento_contato AFTER INSERT ON public.customer_vinculos
FOR EACH ROW EXECUTE FUNCTION public.criar_tarefa_acompanhamento_contato();