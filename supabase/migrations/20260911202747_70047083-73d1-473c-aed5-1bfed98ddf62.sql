DROP POLICY IF EXISTS "Authenticated can view sms_envios" ON public.sms_envios;
DROP POLICY IF EXISTS "sms_envios_tenant_select" ON public.sms_envios;
CREATE POLICY "sms_envios_tenant_select"
ON public.sms_envios
FOR SELECT TO authenticated
USING (
  estabelecimento_id = public.get_user_estabelecimento_id(auth.uid())
  OR EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = auth.uid())
);

DROP POLICY IF EXISTS "Usuarios autenticados leem log" ON public.push_notifications_log;
DROP POLICY IF EXISTS "push_notifications_log_tenant_select" ON public.push_notifications_log;
CREATE POLICY "push_notifications_log_tenant_select"
ON public.push_notifications_log
FOR SELECT TO authenticated
USING (
  estabelecimento_id = public.get_user_estabelecimento_id(auth.uid())
  OR EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = auth.uid())
);

CREATE OR REPLACE FUNCTION public.salvar_etapas_funil(
  p_funil_id uuid,
  p_stages jsonb,
  p_moves jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_estabelecimento_id uuid;
  v_stage jsonb;
  v_move jsonb;
  v_input_id text;
  v_stage_id uuid;
  v_target_id uuid;
  v_mapping jsonb := '{}'::jsonb;
  v_keep_ids uuid[] := ARRAY[]::uuid[];
  v_count integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sessão obrigatória';
  END IF;

  SELECT f.estabelecimento_id INTO v_estabelecimento_id
  FROM public.funis f
  WHERE f.id = p_funil_id
  FOR UPDATE;

  IF v_estabelecimento_id IS NULL THEN
    RAISE EXCEPTION 'Funil não encontrado ou sem estabelecimento';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = auth.uid())
     AND NOT (
       v_estabelecimento_id = public.get_user_estabelecimento_id(auth.uid())
       AND (
         public.has_role(auth.uid(), 'admin'::public.app_role)
         OR public.has_role(auth.uid(), 'gestor'::public.app_role)
       )
     ) THEN
    RAISE EXCEPTION 'Sem permissão para configurar este funil';
  END IF;

  IF jsonb_typeof(p_stages) <> 'array' OR jsonb_array_length(p_stages) = 0 THEN
    RAISE EXCEPTION 'O funil deve possuir ao menos uma etapa';
  END IF;
  IF jsonb_typeof(p_moves) <> 'array' THEN
    RAISE EXCEPTION 'Movimentações inválidas';
  END IF;

  FOR v_stage IN SELECT value FROM jsonb_array_elements(p_stages)
  LOOP
    v_input_id := nullif(v_stage->>'id', '');
    IF nullif(btrim(v_stage->>'title'), '') IS NULL THEN
      RAISE EXCEPTION 'Toda etapa deve possuir um nome';
    END IF;

    v_stage_id := NULL;
    IF v_input_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
      SELECT s.id INTO v_stage_id
      FROM public.funil_stages s
      WHERE s.id = v_input_id::uuid AND s.funil_id = p_funil_id;
    END IF;

    IF v_stage_id IS NULL THEN
      INSERT INTO public.funil_stages (funil_id, nome, ordem)
      VALUES (p_funil_id, left(btrim(v_stage->>'title'), 200), v_count)
      RETURNING id INTO v_stage_id;
    ELSE
      UPDATE public.funil_stages
      SET nome = left(btrim(v_stage->>'title'), 200), ordem = v_count
      WHERE id = v_stage_id AND funil_id = p_funil_id;
    END IF;

    v_mapping := v_mapping || jsonb_build_object(v_input_id, v_stage_id::text);
    v_keep_ids := array_append(v_keep_ids, v_stage_id);
    v_count := v_count + 1;
  END LOOP;

  FOR v_move IN SELECT value FROM jsonb_array_elements(p_moves)
  LOOP
    v_target_id := NULL;
    IF v_mapping ? (v_move->>'to') THEN
      v_target_id := (v_mapping->>(v_move->>'to'))::uuid;
    ELSIF (v_move->>'to') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
      SELECT s.id INTO v_target_id FROM public.funil_stages s
      WHERE s.id = (v_move->>'to')::uuid AND s.funil_id = p_funil_id;
    END IF;

    IF v_target_id IS NULL THEN
      RAISE EXCEPTION 'Etapa de destino inválida';
    END IF;
    IF NOT ((v_move->>'from') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$') THEN
      RAISE EXCEPTION 'Etapa de origem inválida';
    END IF;

    UPDATE public.funil_deals
    SET stage_id = v_target_id, dias_parado = 0, ultima_interacao = now()
    WHERE funil_id = p_funil_id AND stage_id = (v_move->>'from')::uuid;
  END LOOP;

  IF EXISTS (
    SELECT 1 FROM public.funil_deals d
    WHERE d.funil_id = p_funil_id AND NOT (d.stage_id = ANY(v_keep_ids))
  ) THEN
    RAISE EXCEPTION 'Existem negócios em etapas removidas sem destino definido';
  END IF;

  DELETE FROM public.funil_stages s
  WHERE s.funil_id = p_funil_id AND NOT (s.id = ANY(v_keep_ids));

  RETURN jsonb_build_object('ok', true, 'mapping', v_mapping, 'total', v_count);
END;
$$;
REVOKE ALL ON FUNCTION public.salvar_etapas_funil(uuid, jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.salvar_etapas_funil(uuid, jsonb, jsonb) TO authenticated, service_role;