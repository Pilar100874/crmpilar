
-- 1. Predições de IA
CREATE TABLE public.ponto_predicoes_ia (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funcionario_id UUID NOT NULL REFERENCES public.ponto_funcionarios(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL, -- 'absenteismo','turnover','horas_extras','atraso'
  score NUMERIC(5,2) NOT NULL, -- 0-100
  nivel TEXT NOT NULL, -- 'baixo','medio','alto','critico'
  fatores JSONB,
  recomendacoes TEXT[],
  modelo TEXT,
  periodo_analisado DATERANGE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_predicoes_func_tipo ON public.ponto_predicoes_ia(funcionario_id, tipo, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_predicoes_ia TO authenticated;
GRANT ALL ON public.ponto_predicoes_ia TO service_role;
ALTER TABLE public.ponto_predicoes_ia ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage predicoes" ON public.ponto_predicoes_ia FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. Sugestões de escala
CREATE TABLE public.ponto_escala_sugestoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID,
  filial_id UUID,
  departamento_id UUID,
  data DATE NOT NULL,
  turno TEXT,
  funcionarios_sugeridos UUID[],
  carga_estimada NUMERIC,
  fundamentacao TEXT,
  aplicada BOOLEAN NOT NULL DEFAULT false,
  aplicada_em TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_escala_sugestoes TO authenticated;
GRANT ALL ON public.ponto_escala_sugestoes TO service_role;
ALTER TABLE public.ponto_escala_sugestoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage sug escala" ON public.ponto_escala_sugestoes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. CCT/ACT (acordos coletivos)
CREATE TABLE public.ponto_acordos_coletivos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'CCT', -- CCT|ACT|PCT
  sindicato_nome TEXT,
  sindicato_cnpj TEXT,
  numero_registro_mte TEXT,
  vigencia_inicio DATE NOT NULL,
  vigencia_fim DATE NOT NULL,
  -- regras específicas
  he_multiplicador_50 NUMERIC(5,2) DEFAULT 1.5,
  he_multiplicador_100 NUMERIC(5,2) DEFAULT 2.0,
  adicional_noturno_percentual NUMERIC(5,2) DEFAULT 20.0,
  noturno_hora_inicio TIME DEFAULT '22:00',
  noturno_hora_fim TIME DEFAULT '05:00',
  hora_noturna_minutos INT DEFAULT 52, -- minuto reduzida 52'30"
  banco_horas_prazo_meses INT DEFAULT 6,
  banco_horas_limite_diario_min INT DEFAULT 120,
  intervalo_minimo_min INT DEFAULT 60,
  intervalo_maximo_min INT DEFAULT 120,
  dsr_percentual NUMERIC(5,2) DEFAULT 100,
  sobreaviso_percentual NUMERIC(5,2) DEFAULT 33.33,
  observacoes TEXT,
  arquivo_url TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_acordos_coletivos TO authenticated;
GRANT ALL ON public.ponto_acordos_coletivos TO service_role;
ALTER TABLE public.ponto_acordos_coletivos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage cct" ON public.ponto_acordos_coletivos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Vínculo CCT
CREATE TABLE public.ponto_acordos_vinculos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  acordo_id UUID NOT NULL REFERENCES public.ponto_acordos_coletivos(id) ON DELETE CASCADE,
  escopo TEXT NOT NULL, -- 'empresa','filial','departamento','cargo','funcionario'
  escopo_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(acordo_id, escopo, escopo_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_acordos_vinculos TO authenticated;
GRANT ALL ON public.ponto_acordos_vinculos TO service_role;
ALTER TABLE public.ponto_acordos_vinculos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage cct vinc" ON public.ponto_acordos_vinculos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. Função FIFO: consome banco de horas do lote mais antigo primeiro
CREATE OR REPLACE FUNCTION public.ponto_banco_horas_consumir_fifo(
  _funcionario_id UUID,
  _minutos_a_consumir INT,
  _motivo TEXT DEFAULT 'compensacao'
) RETURNS TABLE(lote_id UUID, minutos_consumidos INT, saldo_restante INT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_restante INT := _minutos_a_consumir;
  v_lote RECORD;
  v_consumir INT;
BEGIN
  FOR v_lote IN
    SELECT id, saldo_minutos FROM public.ponto_banco_horas_lancamentos
    WHERE funcionario_id = _funcionario_id AND saldo_minutos > 0
      AND (validade IS NULL OR validade >= CURRENT_DATE)
    ORDER BY validade NULLS LAST, created_at ASC
  LOOP
    EXIT WHEN v_restante <= 0;
    v_consumir := LEAST(v_restante, v_lote.saldo_minutos);
    UPDATE public.ponto_banco_horas_lancamentos
       SET saldo_minutos = saldo_minutos - v_consumir, updated_at = now()
     WHERE id = v_lote.id;
    lote_id := v_lote.id;
    minutos_consumidos := v_consumir;
    saldo_restante := v_lote.saldo_minutos - v_consumir;
    v_restante := v_restante - v_consumir;
    RETURN NEXT;
  END LOOP;
END;
$$;

-- 6. Cron de expiração FIFO automática diária (zera saldos vencidos)
CREATE OR REPLACE FUNCTION public.ponto_banco_horas_expirar_vencidos()
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_total INT;
BEGIN
  WITH vencidos AS (
    UPDATE public.ponto_banco_horas_lancamentos
       SET saldo_minutos = 0, updated_at = now()
     WHERE validade < CURRENT_DATE AND saldo_minutos > 0
     RETURNING id
  )
  SELECT COUNT(*) INTO v_total FROM vencidos;
  RETURN v_total;
END;
$$;
