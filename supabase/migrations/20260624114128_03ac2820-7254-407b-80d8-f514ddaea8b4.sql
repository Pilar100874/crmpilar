
-- 1) FERIADOS: bloquear alteração em período fechado/exportado
CREATE OR REPLACE FUNCTION public.ponto_feriados_check_lock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_empresa uuid;
  v_data date;
BEGIN
  v_empresa := COALESCE((NEW).empresa_id, (OLD).empresa_id);
  v_data := COALESCE((NEW).data, (OLD).data);
  IF v_empresa IS NOT NULL AND public.ponto_periodo_bloqueado(v_empresa, v_data) THEN
    RAISE EXCEPTION 'Período bloqueado: não é permitido alterar feriado em % (mês fechado ou exportado).', v_data
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS trg_ponto_feriados_lock ON public.ponto_feriados;
CREATE TRIGGER trg_ponto_feriados_lock
  BEFORE INSERT OR UPDATE OR DELETE ON public.ponto_feriados
  FOR EACH ROW EXECUTE FUNCTION public.ponto_feriados_check_lock();

-- 2) ATESTADOS: bloquear alteração em período fechado
CREATE OR REPLACE FUNCTION public.ponto_atestados_check_lock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_empresa uuid;
  v_ini date;
  v_fim date;
  d date;
BEGIN
  SELECT empresa_id INTO v_empresa FROM public.ponto_funcionarios
    WHERE id = COALESCE((NEW).funcionario_id, (OLD).funcionario_id);
  v_ini := COALESCE((NEW).data_inicio, (OLD).data_inicio);
  v_fim := COALESCE((NEW).data_fim, (OLD).data_fim, v_ini);
  IF v_empresa IS NULL OR v_ini IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  d := v_ini;
  WHILE d <= v_fim LOOP
    IF public.ponto_periodo_bloqueado(v_empresa, d) THEN
      RAISE EXCEPTION 'Período bloqueado: atestado cobre dia % em mês fechado/exportado. Reabra o período antes.', d
        USING ERRCODE = 'check_violation';
    END IF;
    d := d + 1;
  END LOOP;
  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS trg_ponto_atestados_lock ON public.ponto_atestados;
CREATE TRIGGER trg_ponto_atestados_lock
  BEFORE INSERT OR UPDATE OR DELETE ON public.ponto_atestados
  FOR EACH ROW EXECUTE FUNCTION public.ponto_atestados_check_lock();

-- 3) BANCO DE HORAS (lançamentos): bloquear em período fechado
CREATE OR REPLACE FUNCTION public.ponto_banco_horas_check_lock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_empresa uuid;
  v_data date;
BEGIN
  v_data := COALESCE((NEW).data, (OLD).data);
  SELECT empresa_id INTO v_empresa FROM public.ponto_funcionarios
    WHERE id = COALESCE((NEW).funcionario_id, (OLD).funcionario_id);
  IF v_empresa IS NOT NULL AND v_data IS NOT NULL
     AND public.ponto_periodo_bloqueado(v_empresa, v_data) THEN
    RAISE EXCEPTION 'Período bloqueado: lançamento de banco de horas em % não permitido (mês fechado/exportado).', v_data
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS trg_ponto_banco_horas_lock ON public.ponto_banco_horas_lancamentos;
CREATE TRIGGER trg_ponto_banco_horas_lock
  BEFORE INSERT OR UPDATE OR DELETE ON public.ponto_banco_horas_lancamentos
  FOR EACH ROW EXECUTE FUNCTION public.ponto_banco_horas_check_lock();

-- 4) ESPELHO DIÁRIO: bloquear alteração em período fechado
CREATE OR REPLACE FUNCTION public.ponto_espelho_check_lock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_empresa uuid;
  v_data date;
BEGIN
  v_data := COALESCE((NEW).data, (OLD).data);
  SELECT empresa_id INTO v_empresa FROM public.ponto_funcionarios
    WHERE id = COALESCE((NEW).funcionario_id, (OLD).funcionario_id);
  IF v_empresa IS NOT NULL AND v_data IS NOT NULL
     AND public.ponto_periodo_bloqueado(v_empresa, v_data) THEN
    RAISE EXCEPTION 'Período bloqueado: o espelho de % é somente leitura (mês fechado/exportado). Reabra o período para recalcular.', v_data
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS trg_ponto_espelho_lock ON public.ponto_espelho_diario;
CREATE TRIGGER trg_ponto_espelho_lock
  BEFORE UPDATE OR DELETE ON public.ponto_espelho_diario
  FOR EACH ROW EXECUTE FUNCTION public.ponto_espelho_check_lock();

-- 5) FUNCIONÁRIO: bloquear alteração de admissão/demissão que afete período fechado
CREATE OR REPLACE FUNCTION public.ponto_funcionario_check_datas_lock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF COALESCE(NEW.admissao, '1900-01-01'::date) IS DISTINCT FROM COALESCE(OLD.admissao, '1900-01-01'::date) THEN
      IF OLD.admissao IS NOT NULL AND public.ponto_periodo_bloqueado(NEW.empresa_id, OLD.admissao) THEN
        RAISE EXCEPTION 'Não é permitido alterar a data de admissão: % está em período fechado/exportado.', OLD.admissao
          USING ERRCODE = 'check_violation';
      END IF;
      IF NEW.admissao IS NOT NULL AND public.ponto_periodo_bloqueado(NEW.empresa_id, NEW.admissao) THEN
        RAISE EXCEPTION 'Não é permitido definir admissão em % (período fechado/exportado).', NEW.admissao
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;
    IF COALESCE(NEW.demissao, '1900-01-01'::date) IS DISTINCT FROM COALESCE(OLD.demissao, '1900-01-01'::date) THEN
      IF OLD.demissao IS NOT NULL AND public.ponto_periodo_bloqueado(NEW.empresa_id, OLD.demissao) THEN
        RAISE EXCEPTION 'Não é permitido alterar a data de demissão: % está em período fechado/exportado.', OLD.demissao
          USING ERRCODE = 'check_violation';
      END IF;
      IF NEW.demissao IS NOT NULL AND public.ponto_periodo_bloqueado(NEW.empresa_id, NEW.demissao) THEN
        RAISE EXCEPTION 'Não é permitido registrar demissão em % (período fechado/exportado).', NEW.demissao
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_ponto_funcionario_datas_lock ON public.ponto_funcionarios;
CREATE TRIGGER trg_ponto_funcionario_datas_lock
  BEFORE UPDATE ON public.ponto_funcionarios
  FOR EACH ROW EXECUTE FUNCTION public.ponto_funcionario_check_datas_lock();

-- 6) ESCALAS (definição): bloquear alteração se em uso em período bloqueado
CREATE OR REPLACE FUNCTION public.ponto_escalas_check_lock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_escala_id uuid;
  v_bloqueada boolean;
BEGIN
  v_escala_id := COALESCE((OLD).id, (NEW).id);
  -- Se há funcionário com vigência usando essa escala em período bloqueado, impede alteração
  SELECT EXISTS (
    SELECT 1
    FROM public.ponto_funcionario_escala_historico h
    JOIN public.ponto_funcionarios f ON f.id = h.funcionario_id
    WHERE h.escala_id = v_escala_id
      AND (
        EXISTS (SELECT 1 FROM public.ponto_periodos_fechamento p
                WHERE p.empresa_id = f.empresa_id
                  AND p.mes_referencia BETWEEN date_trunc('month', h.data_inicio)::date
                  AND date_trunc('month', COALESCE(h.data_fim, CURRENT_DATE))::date)
        OR EXISTS (SELECT 1 FROM public.ponto_export_logs e
                   WHERE e.empresa_id = f.empresa_id AND e.status = 'gerado'
                     AND NOT (e.periodo_fim < h.data_inicio OR e.periodo_inicio > COALESCE(h.data_fim, CURRENT_DATE)))
      )
  ) INTO v_bloqueada;

  IF v_bloqueada THEN
    RAISE EXCEPTION 'Esta escala está vinculada a funcionários em período fechado/exportado. Crie uma nova escala ou reabra o período antes.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS trg_ponto_escalas_lock ON public.ponto_escalas;
CREATE TRIGGER trg_ponto_escalas_lock
  BEFORE UPDATE OR DELETE ON public.ponto_escalas
  FOR EACH ROW EXECUTE FUNCTION public.ponto_escalas_check_lock();

-- 7) REGRAS DE JORNADA: bloquear alteração se afeta período fechado
CREATE OR REPLACE FUNCTION public.ponto_regras_jornada_check_lock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_empresa uuid;
  v_existe boolean;
BEGIN
  v_empresa := COALESCE((NEW).empresa_id, (OLD).empresa_id);
  IF v_empresa IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  -- Bloqueia se houver QUALQUER fechamento existente para a empresa
  SELECT EXISTS (
    SELECT 1 FROM public.ponto_periodos_fechamento WHERE empresa_id = v_empresa
    UNION ALL
    SELECT 1 FROM public.ponto_export_logs WHERE empresa_id = v_empresa AND status = 'gerado'
  ) INTO v_existe;
  IF v_existe AND TG_OP <> 'INSERT' THEN
    RAISE EXCEPTION 'Existem períodos fechados/exportados. Para alterar regras de jornada, crie uma nova regra com vigência futura.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS trg_ponto_regras_jornada_lock ON public.ponto_regras_jornada;
CREATE TRIGGER trg_ponto_regras_jornada_lock
  BEFORE UPDATE OR DELETE ON public.ponto_regras_jornada
  FOR EACH ROW EXECUTE FUNCTION public.ponto_regras_jornada_check_lock();

-- 8) PERÍODOS DE FECHAMENTO: impedir sobreposição duplicada
CREATE OR REPLACE FUNCTION public.ponto_periodos_fechamento_check_dup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.ponto_periodos_fechamento
    WHERE empresa_id = NEW.empresa_id
      AND date_trunc('month', mes_referencia) = date_trunc('month', NEW.mes_referencia)
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'Já existe um fechamento para % nesta empresa.', to_char(NEW.mes_referencia, 'MM/YYYY')
      USING ERRCODE = 'unique_violation';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_ponto_periodos_fechamento_dup ON public.ponto_periodos_fechamento;
CREATE TRIGGER trg_ponto_periodos_fechamento_dup
  BEFORE INSERT OR UPDATE ON public.ponto_periodos_fechamento
  FOR EACH ROW EXECUTE FUNCTION public.ponto_periodos_fechamento_check_dup();
