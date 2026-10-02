REVOKE ALL ON FUNCTION public.executar_regras_agenda(uuid,text,uuid,uuid,jsonb) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.regras_agenda_cliente_por_telefone(uuid,text) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_regras_agenda() FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.disparar_regras_agenda(_gatilho text, _customer uuid, _contexto jsonb DEFAULT '{}'::jsonb)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_estab uuid := get_auth_user_estabelecimento_id();
BEGIN
  IF auth.uid() IS NULL OR v_estab IS NULL THEN RETURN 0; END IF;
  IF _gatilho NOT IN ('bloco_bot') THEN RETURN 0; END IF;
  IF NOT EXISTS (SELECT 1 FROM customers WHERE id = _customer AND estabelecimento_id = v_estab) THEN RETURN 0; END IF;
  RETURN executar_regras_agenda(v_estab, _gatilho, _customer, get_current_usuario_id_safe(), coalesce(_contexto,'{}'));
END $$;
REVOKE ALL ON FUNCTION public.disparar_regras_agenda(text,uuid,jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.disparar_regras_agenda(text,uuid,jsonb) TO authenticated;