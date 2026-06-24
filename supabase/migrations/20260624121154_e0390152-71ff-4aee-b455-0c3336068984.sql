
-- =========================================================
-- ONDA 1-4: Compliance CLT + Portaria 671 + Anti-fraude
-- =========================================================

-- 1) TABELA DE CONFIGURAÇÃO POR EMPRESA (tudo parametrizável)
CREATE TABLE IF NOT EXISTS public.ponto_clt_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL UNIQUE REFERENCES public.ponto_empresas(id) ON DELETE CASCADE,

  -- Limites de jornada (CLT)
  max_horas_extras_dia_min integer NOT NULL DEFAULT 120,          -- 2h em minutos
  max_jornada_total_dia_min integer NOT NULL DEFAULT 600,         -- 10h
  intervalo_intra_min_obrigatorio integer NOT NULL DEFAULT 60,    -- 1h se >6h trabalho
  intervalo_intra_min_curto integer NOT NULL DEFAULT 15,          -- 15min se 4-6h
  horas_trabalho_para_intra_longo integer NOT NULL DEFAULT 360,   -- 6h em min
  horas_trabalho_para_intra_curto integer NOT NULL DEFAULT 240,   -- 4h
  interjornada_min_horas numeric(4,2) NOT NULL DEFAULT 11.0,      -- 11h entre turnos
  dsr_max_dias_seguidos integer NOT NULL DEFAULT 6,               -- 1 folga a cada 7 dias

  -- Adicional noturno
  adic_noturno_inicio time NOT NULL DEFAULT '22:00',
  adic_noturno_fim time NOT NULL DEFAULT '05:00',
  adic_noturno_hora_ficta_min integer NOT NULL DEFAULT 53,        -- 52'30" arredondado
  adic_noturno_percentual numeric(5,2) NOT NULL DEFAULT 20.0,     -- 20% mínimo CLT

  -- Menor aprendiz
  menor_jornada_max_dia_min integer NOT NULL DEFAULT 360,         -- 6h
  menor_proibir_extras boolean NOT NULL DEFAULT true,

  -- Banco de horas
  banco_horas_prazo_dias integer NOT NULL DEFAULT 180,            -- 6 meses (acordo individual)
  banco_horas_auto_expirar boolean NOT NULL DEFAULT false,

  -- Anti-duplicidade de batida (Portaria 671)
  intervalo_min_entre_batidas_min integer NOT NULL DEFAULT 3,

  -- Time-lock para ajustes (evita ajuste no calor do momento)
  time_lock_ajuste_horas integer NOT NULL DEFAULT 0,              -- 0 = desligado

  -- Aprovação segura
  exigir_motivo_he_acima_min integer NOT NULL DEFAULT 120,
  exigir_anexo_he_acima_min integer NOT NULL DEFAULT 240,
  exigir_dupla_aprovacao_acima_min integer NOT NULL DEFAULT 240,
  proibir_auto_aprovacao boolean NOT NULL DEFAULT true,
  max_aprovacoes_em_lote integer NOT NULL DEFAULT 50,

  -- Notificações
  notificar_funcionario_alteracao boolean NOT NULL DEFAULT true,
  notificar_email boolean NOT NULL DEFAULT true,
  notificar_push boolean NOT NULL DEFAULT false,

  -- Comportamento das violações: 'bloquear' | 'alertar' | 'ignorar'
  acao_he_acima_limite text NOT NULL DEFAULT 'alertar' CHECK (acao_he_acima_limite IN ('bloquear','alertar','ignorar')),
  acao_jornada_acima_limite text NOT NULL DEFAULT 'alertar' CHECK (acao_jornada_acima_limite IN ('bloquear','alertar','ignorar')),
  acao_intervalo_violado text NOT NULL DEFAULT 'alertar' CHECK (acao_intervalo_violado IN ('bloquear','alertar','ignorar')),
  acao_interjornada_violada text NOT NULL DEFAULT 'alertar' CHECK (acao_interjornada_violada IN ('bloquear','alertar','ignorar')),
  acao_dsr_violado text NOT NULL DEFAULT 'alertar' CHECK (acao_dsr_violado IN ('bloquear','alertar','ignorar')),

  -- Detecção de fraude
  detectar_batida_simultanea boolean NOT NULL DEFAULT true,
  detectar_padrao_suspeito boolean NOT NULL DEFAULT true,
  geofence_violado_marca_revisao boolean NOT NULL DEFAULT true,

  -- Férias (Lei 13.467/17)
  ferias_aviso_dias_minimo integer NOT NULL DEFAULT 30,
  ferias_fracionamento_max integer NOT NULL DEFAULT 3,
  ferias_periodo_minimo_dias integer NOT NULL DEFAULT 14,
  ferias_periodo_secundario_min_dias integer NOT NULL DEFAULT 5,
  ferias_abono_max_dias integer NOT NULL DEFAULT 10,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_clt_config TO authenticated;
GRANT ALL ON public.ponto_clt_config TO service_role;
ALTER TABLE public.ponto_clt_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "config CLT por estabelecimento" ON public.ponto_clt_config
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ponto_empresas pe WHERE pe.id = empresa_id AND pe.estabelecimento_id = public.get_auth_user_estabelecimento_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.ponto_empresas pe WHERE pe.id = empresa_id AND pe.estabelecimento_id = public.get_auth_user_estabelecimento_id()));

CREATE TRIGGER trg_ponto_clt_config_updated BEFORE UPDATE ON public.ponto_clt_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) TABELA DE ANOMALIAS DETECTADAS
CREATE TABLE IF NOT EXISTS public.ponto_anomalias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.ponto_empresas(id) ON DELETE CASCADE,
  funcionario_id uuid REFERENCES public.ponto_funcionarios(id) ON DELETE CASCADE,
  data date NOT NULL,
  tipo text NOT NULL, -- 'he_acima_limite' | 'jornada_acima_limite' | 'intervalo_violado' | 'interjornada_violada' | 'dsr_violado' | 'batida_duplicada' | 'batida_simultanea' | 'padrao_suspeito' | 'geofence_violado'
  severidade text NOT NULL DEFAULT 'media' CHECK (severidade IN ('baixa','media','alta','critica')),
  descricao text NOT NULL,
  detalhes jsonb DEFAULT '{}'::jsonb,
  resolvida boolean NOT NULL DEFAULT false,
  resolvida_em timestamptz,
  resolvida_por uuid,
  acao_aprovacao text, -- 'pendente_dupla' | 'aprovada' | 'rejeitada' | null
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_anomalias_empresa_data ON public.ponto_anomalias(empresa_id, data DESC);
CREATE INDEX IF NOT EXISTS idx_anomalias_funcionario ON public.ponto_anomalias(funcionario_id, data DESC);
CREATE INDEX IF NOT EXISTS idx_anomalias_nao_resolvidas ON public.ponto_anomalias(empresa_id) WHERE resolvida = false;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_anomalias TO authenticated;
GRANT ALL ON public.ponto_anomalias TO service_role;
ALTER TABLE public.ponto_anomalias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anomalias por estabelecimento" ON public.ponto_anomalias
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ponto_empresas pe WHERE pe.id = empresa_id AND pe.estabelecimento_id = public.get_auth_user_estabelecimento_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.ponto_empresas pe WHERE pe.id = empresa_id AND pe.estabelecimento_id = public.get_auth_user_estabelecimento_id()));

-- 3) FUNÇÃO: obter config (com default se não existir)
CREATE OR REPLACE FUNCTION public.ponto_get_clt_config(_empresa uuid)
RETURNS public.ponto_clt_config
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  cfg public.ponto_clt_config;
BEGIN
  SELECT * INTO cfg FROM public.ponto_clt_config WHERE empresa_id = _empresa;
  IF NOT FOUND THEN
    INSERT INTO public.ponto_clt_config(empresa_id) VALUES (_empresa) RETURNING * INTO cfg;
  END IF;
  RETURN cfg;
END $$;

-- 4) TRIGGER: anti-duplicidade de batidas (Portaria 671)
CREATE OR REPLACE FUNCTION public.ponto_registros_anti_duplicidade()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_empresa uuid;
  v_intervalo int;
  v_existe boolean;
BEGIN
  SELECT empresa_id INTO v_empresa FROM ponto_funcionarios WHERE id = NEW.funcionario_id;
  IF v_empresa IS NULL THEN RETURN NEW; END IF;

  SELECT intervalo_min_entre_batidas_min INTO v_intervalo
    FROM public.ponto_get_clt_config(v_empresa);
  IF v_intervalo IS NULL OR v_intervalo <= 0 THEN RETURN NEW; END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.ponto_registros
    WHERE funcionario_id = NEW.funcionario_id
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND ABS(EXTRACT(EPOCH FROM (NEW.data_hora - data_hora))) < v_intervalo * 60
  ) INTO v_existe;

  IF v_existe THEN
    INSERT INTO public.ponto_anomalias(empresa_id, funcionario_id, data, tipo, severidade, descricao, detalhes)
    VALUES (v_empresa, NEW.funcionario_id, NEW.data_hora::date, 'batida_duplicada', 'alta',
      format('Batida em %s a menos de %s min de outra batida', NEW.data_hora::text, v_intervalo),
      jsonb_build_object('data_hora', NEW.data_hora, 'origem', NEW.origem));
    RAISE EXCEPTION 'Batida duplicada: intervalo mínimo de % minutos entre marcações.', v_intervalo
      USING ERRCODE = 'unique_violation';
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_ponto_registros_anti_dup ON public.ponto_registros;
CREATE TRIGGER trg_ponto_registros_anti_dup
  BEFORE INSERT OR UPDATE ON public.ponto_registros
  FOR EACH ROW EXECUTE FUNCTION public.ponto_registros_anti_duplicidade();

-- 5) TRIGGER: validação CLT em ajustes
CREATE OR REPLACE FUNCTION public.ponto_ajustes_validar_clt()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_empresa uuid;
  cfg public.ponto_clt_config;
  v_he int := COALESCE(NEW.extra_min, 0);
  v_jornada int := COALESCE(NEW.trabalho_min, 0);
BEGIN
  SELECT empresa_id INTO v_empresa FROM ponto_funcionarios WHERE id = NEW.funcionario_id;
  IF v_empresa IS NULL THEN RETURN NEW; END IF;
  cfg := public.ponto_get_clt_config(v_empresa);

  -- HE acima do limite
  IF v_he > cfg.max_horas_extras_dia_min THEN
    INSERT INTO public.ponto_anomalias(empresa_id, funcionario_id, data, tipo, severidade, descricao, detalhes)
    VALUES (v_empresa, NEW.funcionario_id, NEW.data, 'he_acima_limite',
      CASE WHEN v_he > cfg.max_horas_extras_dia_min * 2 THEN 'critica' ELSE 'alta' END,
      format('HE de %s min excede limite CLT de %s min', v_he, cfg.max_horas_extras_dia_min),
      jsonb_build_object('he_min', v_he, 'limite_min', cfg.max_horas_extras_dia_min));
    IF cfg.acao_he_acima_limite = 'bloquear' THEN
      RAISE EXCEPTION 'Horas extras (% min) excedem limite CLT de % min/dia. Acordo coletivo necessário.', v_he, cfg.max_horas_extras_dia_min
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  -- Jornada total acima do limite
  IF v_jornada > cfg.max_jornada_total_dia_min THEN
    INSERT INTO public.ponto_anomalias(empresa_id, funcionario_id, data, tipo, severidade, descricao, detalhes)
    VALUES (v_empresa, NEW.funcionario_id, NEW.data, 'jornada_acima_limite', 'alta',
      format('Jornada de %s min excede %s min/dia', v_jornada, cfg.max_jornada_total_dia_min),
      jsonb_build_object('jornada_min', v_jornada, 'limite_min', cfg.max_jornada_total_dia_min));
    IF cfg.acao_jornada_acima_limite = 'bloquear' THEN
      RAISE EXCEPTION 'Jornada (% min) excede % min/dia (CLT art. 59).', v_jornada, cfg.max_jornada_total_dia_min
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  -- Exigir motivo em HE acima do gatilho
  IF v_he >= cfg.exigir_motivo_he_acima_min AND COALESCE(NEW.motivo, '') = '' THEN
    RAISE EXCEPTION 'Motivo obrigatório para HE >= % min.', cfg.exigir_motivo_he_acima_min
      USING ERRCODE = 'check_violation';
  END IF;

  -- Time-lock
  IF cfg.time_lock_ajuste_horas > 0 AND NEW.data > (CURRENT_DATE - (cfg.time_lock_ajuste_horas || ' hours')::interval) THEN
    RAISE EXCEPTION 'Ajuste só permitido após % horas da batida (time-lock).', cfg.time_lock_ajuste_horas
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_ponto_ajustes_clt ON public.ponto_ajustes;
CREATE TRIGGER trg_ponto_ajustes_clt
  BEFORE INSERT OR UPDATE ON public.ponto_ajustes
  FOR EACH ROW EXECUTE FUNCTION public.ponto_ajustes_validar_clt();

-- 6) TRIGGER: impedir auto-aprovação de ajustes
CREATE OR REPLACE FUNCTION public.ponto_ajustes_no_self_approve()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_empresa uuid;
  v_proibir boolean;
  v_aprovador_usuario uuid;
  v_func_usuario uuid;
BEGIN
  IF NEW.aprovado_por IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.aprovado_por IS NOT DISTINCT FROM NEW.aprovado_por THEN RETURN NEW; END IF;

  SELECT empresa_id INTO v_empresa FROM ponto_funcionarios WHERE id = NEW.funcionario_id;
  SELECT proibir_auto_aprovacao INTO v_proibir FROM public.ponto_get_clt_config(v_empresa);
  IF NOT v_proibir THEN RETURN NEW; END IF;

  SELECT auth_user_id INTO v_func_usuario FROM public.ponto_funcionarios WHERE id = NEW.funcionario_id;
  IF v_func_usuario IS NOT NULL AND NEW.aprovado_por = v_func_usuario THEN
    RAISE EXCEPTION 'Aprovação proibida: funcionário não pode aprovar o próprio ajuste (segregação de função).'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_ponto_ajustes_no_self ON public.ponto_ajustes;
CREATE TRIGGER trg_ponto_ajustes_no_self
  BEFORE INSERT OR UPDATE ON public.ponto_ajustes
  FOR EACH ROW EXECUTE FUNCTION public.ponto_ajustes_no_self_approve();

-- 7) FUNÇÃO: cálculo de período aquisitivo de férias
CREATE OR REPLACE FUNCTION public.ponto_calcular_periodo_aquisitivo(_func_id uuid)
RETURNS TABLE(aquisitivo_inicio date, aquisitivo_fim date, concessivo_fim date, dias_direito int, vencido boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_admissao date;
  v_anos int;
  v_inicio date;
  v_fim date;
BEGIN
  SELECT admissao INTO v_admissao FROM public.ponto_funcionarios WHERE id = _func_id;
  IF v_admissao IS NULL THEN RETURN; END IF;
  v_anos := EXTRACT(YEAR FROM age(CURRENT_DATE, v_admissao))::int;
  FOR i IN 0..v_anos LOOP
    v_inicio := v_admissao + (i || ' years')::interval;
    v_fim := v_inicio + interval '1 year' - interval '1 day';
    aquisitivo_inicio := v_inicio;
    aquisitivo_fim := v_fim;
    concessivo_fim := v_fim + interval '1 year';
    dias_direito := 30;
    vencido := CURRENT_DATE > concessivo_fim;
    RETURN NEXT;
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION public.ponto_get_clt_config TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ponto_calcular_periodo_aquisitivo TO authenticated, service_role;
