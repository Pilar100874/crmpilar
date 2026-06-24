
-- Helper: período bloqueado se houver fechamento mensal OU export "gerado"
CREATE OR REPLACE FUNCTION public.ponto_periodo_bloqueado(_empresa uuid, _data date)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.ponto_periodos_fechamento
    WHERE empresa_id = _empresa
      AND date_trunc('month', mes_referencia) = date_trunc('month', _data)
  ) OR EXISTS (
    SELECT 1 FROM public.ponto_export_logs
    WHERE empresa_id = _empresa
      AND status = 'gerado'
      AND _data BETWEEN periodo_inicio AND periodo_fim
  );
$$;

-- Bloqueio em ponto_registros
CREATE OR REPLACE FUNCTION public.ponto_registros_check_lock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa uuid;
  v_data date;
BEGIN
  v_data := COALESCE((NEW).data_hora::date, (OLD).data_hora::date);
  SELECT empresa_id INTO v_empresa FROM public.ponto_funcionarios
    WHERE id = COALESCE((NEW).funcionario_id, (OLD).funcionario_id);
  IF v_empresa IS NOT NULL AND public.ponto_periodo_bloqueado(v_empresa, v_data) THEN
    RAISE EXCEPTION 'Período bloqueado: a data % está em um mês fechado ou já exportado para folha. Reabra o período antes de alterar.', v_data
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS trg_ponto_registros_lock ON public.ponto_registros;
CREATE TRIGGER trg_ponto_registros_lock
  BEFORE INSERT OR UPDATE OR DELETE ON public.ponto_registros
  FOR EACH ROW EXECUTE FUNCTION public.ponto_registros_check_lock();

-- Bloqueio em ponto_ajustes
CREATE OR REPLACE FUNCTION public.ponto_ajustes_check_lock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa uuid;
  v_data date;
BEGIN
  v_data := COALESCE((NEW).data, (OLD).data);
  SELECT empresa_id INTO v_empresa FROM public.ponto_funcionarios
    WHERE id = COALESCE((NEW).funcionario_id, (OLD).funcionario_id);
  IF v_empresa IS NOT NULL AND public.ponto_periodo_bloqueado(v_empresa, v_data) THEN
    RAISE EXCEPTION 'Período bloqueado: ajuste em % não permitido (mês fechado ou já exportado). Reabra o período antes.', v_data
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS trg_ponto_ajustes_lock ON public.ponto_ajustes;
CREATE TRIGGER trg_ponto_ajustes_lock
  BEFORE INSERT OR UPDATE OR DELETE ON public.ponto_ajustes
  FOR EACH ROW EXECUTE FUNCTION public.ponto_ajustes_check_lock();

-- Bloqueio em ponto_ferias_afastamentos (qualquer dia do intervalo)
CREATE OR REPLACE FUNCTION public.ponto_ferias_check_lock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa uuid;
  v_ini date;
  v_fim date;
  d date;
BEGIN
  SELECT empresa_id INTO v_empresa FROM public.ponto_funcionarios
    WHERE id = COALESCE((NEW).funcionario_id, (OLD).funcionario_id);
  v_ini := COALESCE((NEW).data_inicio, (OLD).data_inicio);
  v_fim := COALESCE((NEW).data_fim, (OLD).data_fim);
  IF v_empresa IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  d := v_ini;
  WHILE d <= v_fim LOOP
    IF public.ponto_periodo_bloqueado(v_empresa, d) THEN
      RAISE EXCEPTION 'Período bloqueado: o intervalo % a % cobre um mês fechado ou exportado (%). Reabra antes de alterar.',
        v_ini, v_fim, d USING ERRCODE = 'check_violation';
    END IF;
    d := d + 1;
  END LOOP;
  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS trg_ponto_ferias_lock ON public.ponto_ferias_afastamentos;
CREATE TRIGGER trg_ponto_ferias_lock
  BEFORE INSERT OR UPDATE OR DELETE ON public.ponto_ferias_afastamentos
  FOR EACH ROW EXECUTE FUNCTION public.ponto_ferias_check_lock();

-- Bloqueio em mudança de escala/turno se vigência cobrir dia bloqueado
CREATE OR REPLACE FUNCTION public.ponto_escala_hist_check_lock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa uuid;
  v_ini date;
  v_fim date;
BEGIN
  v_empresa := COALESCE((NEW).empresa_id, (OLD).empresa_id);
  v_ini := COALESCE((NEW).data_inicio, (OLD).data_inicio);
  v_fim := COALESCE((NEW).data_fim, (OLD).data_fim, CURRENT_DATE);
  IF v_empresa IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  -- Bloqueia se algum mês do intervalo já está fechado ou exportado
  IF EXISTS (
    SELECT 1 FROM public.ponto_periodos_fechamento
    WHERE empresa_id = v_empresa
      AND mes_referencia BETWEEN date_trunc('month', v_ini)::date AND date_trunc('month', v_fim)::date
  ) OR EXISTS (
    SELECT 1 FROM public.ponto_export_logs
    WHERE empresa_id = v_empresa AND status = 'gerado'
      AND NOT (periodo_fim < v_ini OR periodo_inicio > v_fim)
  ) THEN
    RAISE EXCEPTION 'Não é permitido alterar escala/turno: a vigência cobre período fechado ou exportado. Reabra o período ou crie uma nova vigência a partir de uma data futura não bloqueada.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS trg_ponto_escala_hist_lock ON public.ponto_funcionario_escala_historico;
CREATE TRIGGER trg_ponto_escala_hist_lock
  BEFORE UPDATE OR DELETE ON public.ponto_funcionario_escala_historico
  FOR EACH ROW EXECUTE FUNCTION public.ponto_escala_hist_check_lock();

-- Impede apagar assinatura de espelho
CREATE OR REPLACE FUNCTION public.ponto_assinaturas_no_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Assinatura de espelho não pode ser removida. Reabra o período de fechamento se for necessário corrigir.'
    USING ERRCODE = 'check_violation';
END $$;

DROP TRIGGER IF EXISTS trg_ponto_assinaturas_no_delete ON public.ponto_assinaturas_espelho;
CREATE TRIGGER trg_ponto_assinaturas_no_delete
  BEFORE DELETE ON public.ponto_assinaturas_espelho
  FOR EACH ROW EXECUTE FUNCTION public.ponto_assinaturas_no_delete();
