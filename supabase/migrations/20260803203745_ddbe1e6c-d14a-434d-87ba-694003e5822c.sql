CREATE OR REPLACE FUNCTION public.limpar_historico_logistica(
  p_tipo text,
  p_data_inicio timestamptz,
  p_data_fim timestamptz
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_estab uuid;
  v_pos int := 0;
  v_par int := 0;
  v_est int := 0;
BEGIN
  v_estab := public.get_auth_user_estabelecimento_id();
  IF v_estab IS NULL THEN
    RAISE EXCEPTION 'Estabelecimento não encontrado para o usuário';
  END IF;
  IF p_data_inicio IS NULL OR p_data_fim IS NULL THEN
    RAISE EXCEPTION 'Período inválido';
  END IF;

  IF p_tipo IN ('posicoes','tudo') THEN
    DELETE FROM public.veiculo_posicoes vp
    USING public.logistica_veiculos lv
    WHERE vp.veiculo_id = lv.id
      AND lv.estabelecimento_id = v_estab
      AND vp.data_hora >= p_data_inicio
      AND vp.data_hora <= p_data_fim;
    GET DIAGNOSTICS v_pos = ROW_COUNT;
  END IF;

  IF p_tipo IN ('paradas','tudo') THEN
    DELETE FROM public.logistica_paradas_marcadas
    WHERE estabelecimento_id = v_estab
      AND created_at >= p_data_inicio
      AND created_at <= p_data_fim;
    GET DIAGNOSTICS v_par = ROW_COUNT;
  END IF;

  IF p_tipo IN ('workflow','tudo') THEN
    DELETE FROM public.logistica_workflow_state ws
    USING public.logistica_veiculos lv
    WHERE ws.veiculo_id = lv.id
      AND lv.estabelecimento_id = v_estab
      AND ws.updated_at >= p_data_inicio
      AND ws.updated_at <= p_data_fim;
    GET DIAGNOSTICS v_est = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object('posicoes', v_pos, 'paradas', v_par, 'workflow', v_est);
END;
$$;

GRANT EXECUTE ON FUNCTION public.limpar_historico_logistica(text, timestamptz, timestamptz) TO authenticated;