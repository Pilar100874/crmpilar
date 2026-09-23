CREATE OR REPLACE FUNCTION public.criar_tarefa_ao_vincular_empresa()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_nome text; v_contato uuid; v_contato_nome text;
  v_hoje date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
BEGIN
  IF NEW.usuario_id IS NULL THEN RETURN NEW; END IF;
  SELECT COALESCE(NULLIF(nome_fantasia,''), nome) INTO v_nome FROM empresas WHERE id = NEW.empresa_id;
  SELECT c.id, c.nome INTO v_contato, v_contato_nome
    FROM customer_empresas ce JOIN customers c ON c.id = ce.customer_id
    WHERE ce.empresa_id = NEW.empresa_id ORDER BY c.created_at LIMIT 1;
  IF EXISTS (
    SELECT 1 FROM calendario_tarefas
    WHERE user_id = NEW.usuario_id AND date = v_hoje AND status = 'pending'
      AND ((v_contato IS NOT NULL AND contact_id = v_contato) OR title = 'Novo vínculo: ' || COALESCE(v_nome,'Empresa'))
  ) THEN RETURN NEW; END IF;
  INSERT INTO calendario_tarefas (user_id, estabelecimento_id, contact_id, contact_name, title, description, date, origem, status, is_all_day, data_original)
  VALUES (NEW.usuario_id, NEW.estabelecimento_id, v_contato, COALESCE(v_contato_nome, v_nome, 'Empresa'),
          'Novo vínculo: ' || COALESCE(v_nome,'Empresa'),
          'Empresa vinculada ao usuário — realizar primeiro contato.', v_hoje, 'ligacao', 'pending', true, v_hoje);
  RETURN NEW;
EXCEPTION WHEN others THEN
  RAISE WARNING 'criar_tarefa_ao_vincular_empresa: %', SQLERRM;
  RETURN NEW;
END $function$;
REVOKE EXECUTE ON FUNCTION public.criar_tarefa_ao_vincular_empresa() FROM PUBLIC, anon, authenticated;