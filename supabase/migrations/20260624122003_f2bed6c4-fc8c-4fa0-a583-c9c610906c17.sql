
-- Recálculo automático de adicional noturno no espelho diário

CREATE OR REPLACE FUNCTION public.ponto_calcular_noturno_minutos(
  _entrada timestamptz,
  _saida timestamptz,
  _inicio time DEFAULT '22:00',
  _fim time DEFAULT '05:00'
) RETURNS integer
LANGUAGE plpgsql IMMUTABLE
SET search_path = public
AS $$
DECLARE
  d date;
  ini_ts timestamptz;
  fim_ts timestamptz;
  total_min integer := 0;
  overlap_start timestamptz;
  overlap_end timestamptz;
BEGIN
  IF _entrada IS NULL OR _saida IS NULL OR _saida <= _entrada THEN
    RETURN 0;
  END IF;
  d := date_trunc('day', _entrada)::date;
  -- Janela noturna que cruza meia-noite: [d 22:00, d+1 05:00)
  -- Calcula em até 3 janelas consecutivas para cobrir turnos longos
  FOR i IN -1..1 LOOP
    ini_ts := ((d + i) + _inicio)::timestamptz;
    IF _fim <= _inicio THEN
      fim_ts := ((d + i + 1) + _fim)::timestamptz;
    ELSE
      fim_ts := ((d + i) + _fim)::timestamptz;
    END IF;
    overlap_start := GREATEST(_entrada, ini_ts);
    overlap_end := LEAST(_saida, fim_ts);
    IF overlap_end > overlap_start THEN
      total_min := total_min + EXTRACT(EPOCH FROM (overlap_end - overlap_start))::int / 60;
    END IF;
  END LOOP;
  RETURN total_min;
END;
$$;

-- Trigger que recalcula noturno_min e noturno_min_reduzido sempre que o espelho for atualizado
CREATE OR REPLACE FUNCTION public.ponto_espelho_recalc_noturno()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  cfg record;
  total_not int := 0;
  ent timestamptz;
  sai timestamptz;
  reg record;
BEGIN
  SELECT adic_noturno_inicio, adic_noturno_fim, adic_noturno_hora_ficta_min
    INTO cfg FROM public.ponto_clt_config
    WHERE empresa_id = (SELECT empresa_id FROM public.ponto_funcionarios WHERE id = NEW.funcionario_id)
    LIMIT 1;
  IF cfg IS NULL THEN
    cfg.adic_noturno_inicio := '22:00'::time;
    cfg.adic_noturno_fim := '05:00'::time;
    cfg.adic_noturno_hora_ficta_min := 53;
  END IF;

  -- Soma pares entrada/saida do dia (registros)
  ent := NULL;
  FOR reg IN
    SELECT timestamp_registro, tipo FROM public.ponto_registros
    WHERE funcionario_id = NEW.funcionario_id
      AND timestamp_registro::date BETWEEN NEW.data - 1 AND NEW.data + 1
    ORDER BY timestamp_registro
  LOOP
    IF reg.tipo IN ('entrada','retorno_intervalo') THEN
      ent := reg.timestamp_registro;
    ELSIF reg.tipo IN ('saida','saida_intervalo') AND ent IS NOT NULL THEN
      total_not := total_not + public.ponto_calcular_noturno_minutos(ent, reg.timestamp_registro, cfg.adic_noturno_inicio, cfg.adic_noturno_fim);
      ent := NULL;
    END IF;
  END LOOP;

  NEW.noturno_min := total_not;
  -- Hora ficta: 52'30" = 52.5 min reais valem 60 min → reduzido = real * 60/52.5
  NEW.noturno_min_reduzido := ROUND(total_not * 60.0 / NULLIF(cfg.adic_noturno_hora_ficta_min,0));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ponto_espelho_recalc_noturno ON public.ponto_espelho_diario;
CREATE TRIGGER trg_ponto_espelho_recalc_noturno
  BEFORE INSERT OR UPDATE OF data, funcionario_id ON public.ponto_espelho_diario
  FOR EACH ROW EXECUTE FUNCTION public.ponto_espelho_recalc_noturno();

-- Trigger em ponto_registros: ao inserir/atualizar/deletar, marca espelho do dia para recálculo (touch)
CREATE OR REPLACE FUNCTION public.ponto_registros_touch_espelho()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  reg_data date;
  fid uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    reg_data := OLD.timestamp_registro::date;
    fid := OLD.funcionario_id;
  ELSE
    reg_data := NEW.timestamp_registro::date;
    fid := NEW.funcionario_id;
  END IF;
  UPDATE public.ponto_espelho_diario
    SET updated_at = now()
    WHERE funcionario_id = fid AND data = reg_data;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_ponto_registros_touch_espelho ON public.ponto_registros;
CREATE TRIGGER trg_ponto_registros_touch_espelho
  AFTER INSERT OR UPDATE OR DELETE ON public.ponto_registros
  FOR EACH ROW EXECUTE FUNCTION public.ponto_registros_touch_espelho();

-- =====================================================
-- Validação de fracionamento de férias (Lei 13.467/17)
-- =====================================================
CREATE OR REPLACE FUNCTION public.ponto_validar_ferias()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  cfg record;
  dias_total int;
  periodos_count int;
  tem_periodo_14 boolean;
  emp_id uuid;
  data_aviso int;
BEGIN
  IF NEW.tipo <> 'ferias' THEN
    RETURN NEW;
  END IF;

  SELECT empresa_id INTO emp_id FROM public.ponto_funcionarios WHERE id = NEW.funcionario_id;
  SELECT * INTO cfg FROM public.ponto_clt_config WHERE empresa_id = emp_id LIMIT 1;

  dias_total := (NEW.data_fim - NEW.data_inicio) + 1;
  data_aviso := COALESCE(NEW.data_inicio - CURRENT_DATE, 0);

  -- Aviso mínimo de 30 dias (CLT art. 135)
  IF COALESCE(cfg.ferias_aviso_minimo_dias, 30) > 0
     AND data_aviso < COALESCE(cfg.ferias_aviso_minimo_dias, 30)
     AND NEW.status = 'aprovado' THEN
    RAISE EXCEPTION 'Férias devem ser comunicadas com pelo menos % dias de antecedência (aviso atual: % dias)',
      COALESCE(cfg.ferias_aviso_minimo_dias,30), data_aviso;
  END IF;

  -- Fracionamento: máximo 3 períodos, um deles ≥ 14 dias, demais ≥ 5 dias
  SELECT COUNT(*),
         BOOL_OR((data_fim - data_inicio + 1) >= 14)
    INTO periodos_count, tem_periodo_14
    FROM public.ponto_ferias_afastamentos
   WHERE funcionario_id = NEW.funcionario_id
     AND tipo = 'ferias'
     AND status IN ('aprovado','pendente')
     AND data_inicio >= (NEW.data_inicio - INTERVAL '11 months')
     AND (NEW.id IS NULL OR id <> NEW.id);

  periodos_count := COALESCE(periodos_count,0) + 1;
  tem_periodo_14 := COALESCE(tem_periodo_14,false) OR dias_total >= 14;

  IF periodos_count > COALESCE(cfg.ferias_max_fracionamentos, 3) THEN
    RAISE EXCEPTION 'Férias podem ser fracionadas em no máximo % períodos no aquisitivo', COALESCE(cfg.ferias_max_fracionamentos,3);
  END IF;

  IF dias_total < COALESCE(cfg.ferias_minimo_periodo_dias, 5) THEN
    RAISE EXCEPTION 'Cada período de férias deve ter no mínimo % dias', COALESCE(cfg.ferias_minimo_periodo_dias,5);
  END IF;

  IF periodos_count > 1 AND NOT tem_periodo_14 THEN
    RAISE EXCEPTION 'Quando fracionadas, um dos períodos deve ter no mínimo 14 dias corridos';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ponto_validar_ferias ON public.ponto_ferias_afastamentos;
CREATE TRIGGER trg_ponto_validar_ferias
  BEFORE INSERT OR UPDATE ON public.ponto_ferias_afastamentos
  FOR EACH ROW EXECUTE FUNCTION public.ponto_validar_ferias();

-- Adiciona colunas de configuração de férias se ainda não existem
ALTER TABLE public.ponto_clt_config
  ADD COLUMN IF NOT EXISTS ferias_aviso_minimo_dias int NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS ferias_max_fracionamentos int NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS ferias_minimo_periodo_dias int NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS ferias_abono_max_dias int NOT NULL DEFAULT 10;
