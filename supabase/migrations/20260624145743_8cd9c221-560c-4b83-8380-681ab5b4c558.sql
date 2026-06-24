
-- ============ EXTENSÃO ponto_clt_config ============
ALTER TABLE public.ponto_clt_config
  ADD COLUMN IF NOT EXISTS escalonamento_sla_horas integer NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS escalonamento_max_niveis integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS sobreaviso_percentual numeric(5,2) NOT NULL DEFAULT 33.33,
  ADD COLUMN IF NOT EXISTS prontidao_percentual numeric(5,2) NOT NULL DEFAULT 66.66,
  ADD COLUMN IF NOT EXISTS adic_noturno_percentual numeric(5,2) NOT NULL DEFAULT 20.00,
  ADD COLUMN IF NOT EXISTS reflexo_dsr_he boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS reflexo_dsr_noturno boolean NOT NULL DEFAULT true;

-- ============ ponto_aprovacao_regras ============
CREATE TABLE IF NOT EXISTS public.ponto_aprovacao_regras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  nome text NOT NULL,
  tipo_anomalia text NOT NULL, -- 'he_acima_limite' | 'jornada_acima_limite' | 'atraso' | 'falta' | 'ajuste_manual' | 'ferias' | 'qualquer'
  valor_min_min integer NOT NULL DEFAULT 0,
  valor_max_min integer,
  niveis jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{ordem:1, papel:"gestor_direto"|"rh"|"diretoria"|"usuario_id", usuario_id:uuid?, sla_horas:int}]
  ativo boolean NOT NULL DEFAULT true,
  prioridade integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_aprovacao_regras TO authenticated;
GRANT ALL ON public.ponto_aprovacao_regras TO service_role;
ALTER TABLE public.ponto_aprovacao_regras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aprov_regras_all_auth" ON public.ponto_aprovacao_regras
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_aprov_regras_upd BEFORE UPDATE ON public.ponto_aprovacao_regras
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ ponto_aprovacao_fluxo ============
CREATE TABLE IF NOT EXISTS public.ponto_aprovacao_fluxo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  origem text NOT NULL, -- 'ajuste' | 'ferias' | 'atestado' | 'banco_horas'
  origem_id uuid NOT NULL,
  regra_id uuid REFERENCES public.ponto_aprovacao_regras(id) ON DELETE SET NULL,
  nivel_atual integer NOT NULL DEFAULT 1,
  nivel_total integer NOT NULL DEFAULT 1,
  aprovador_atual_id uuid,
  papel_atual text,
  status text NOT NULL DEFAULT 'pendente', -- 'pendente'|'aprovado'|'rejeitado'|'escalado'|'cancelado'
  sla_horas integer NOT NULL DEFAULT 24,
  prazo_em timestamptz,
  escalado_em timestamptz,
  niveis_executados jsonb NOT NULL DEFAULT '[]'::jsonb,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_aprovacao_fluxo TO authenticated;
GRANT ALL ON public.ponto_aprovacao_fluxo TO service_role;
ALTER TABLE public.ponto_aprovacao_fluxo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aprov_fluxo_all_auth" ON public.ponto_aprovacao_fluxo
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_aprov_fluxo_pendente ON public.ponto_aprovacao_fluxo(status, prazo_em) WHERE status = 'pendente';
CREATE INDEX IF NOT EXISTS idx_aprov_fluxo_origem ON public.ponto_aprovacao_fluxo(origem, origem_id);
CREATE TRIGGER trg_aprov_fluxo_upd BEFORE UPDATE ON public.ponto_aprovacao_fluxo
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ ponto_sobreaviso ============
CREATE TABLE IF NOT EXISTS public.ponto_sobreaviso (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  funcionario_id uuid NOT NULL REFERENCES public.ponto_funcionarios(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('sobreaviso','prontidao')),
  data_inicio timestamptz NOT NULL,
  data_fim timestamptz NOT NULL,
  horas_totais numeric(8,2) GENERATED ALWAYS AS (EXTRACT(EPOCH FROM (data_fim - data_inicio))/3600) STORED,
  acionado boolean NOT NULL DEFAULT false,
  acionado_inicio timestamptz,
  acionado_fim timestamptz,
  observacao text,
  status text NOT NULL DEFAULT 'agendado', -- agendado | em_andamento | concluido | cancelado
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_sobreaviso TO authenticated;
GRANT ALL ON public.ponto_sobreaviso TO service_role;
ALTER TABLE public.ponto_sobreaviso ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sobreaviso_all_auth" ON public.ponto_sobreaviso
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_sobreaviso_func_data ON public.ponto_sobreaviso(funcionario_id, data_inicio);
CREATE TRIGGER trg_sobreaviso_upd BEFORE UPDATE ON public.ponto_sobreaviso
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ VIEW ponto_dsr_detalhado ============
CREATE OR REPLACE VIEW public.ponto_dsr_detalhado AS
SELECT
  f.id AS funcionario_id,
  f.nome,
  f.empresa_id,
  date_trunc('month', e.data)::date AS mes,
  COUNT(DISTINCT e.data) FILTER (WHERE EXTRACT(DOW FROM e.data) NOT IN (0)) AS dias_uteis,
  COUNT(DISTINCT e.data) FILTER (WHERE EXTRACT(DOW FROM e.data) = 0) AS domingos,
  COALESCE(SUM(e.extra_min), 0) AS he_total_min,
  COALESCE(SUM(e.noturno_min), 0) AS noturno_total_min,
  COALESCE(SUM(e.noturno_min_reduzido), 0) AS noturno_reduzido_min,
  public.ponto_calcular_dsr_mensal(f.id, date_trunc('month', e.data)::date) AS dsr_calculado_min
FROM public.ponto_funcionarios f
LEFT JOIN public.ponto_espelho_diario e ON e.funcionario_id = f.id
WHERE e.data IS NOT NULL
GROUP BY f.id, f.nome, f.empresa_id, date_trunc('month', e.data);

GRANT SELECT ON public.ponto_dsr_detalhado TO authenticated;
GRANT SELECT ON public.ponto_dsr_detalhado TO service_role;
