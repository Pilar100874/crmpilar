
CREATE TABLE public.ponto_compensacao_acordos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL,
  titulo TEXT NOT NULL,
  motivo TEXT NOT NULL DEFAULT 'emenda_feriado',
  feriado_data DATE,
  data_inicio_compensacao DATE NOT NULL,
  data_fim_compensacao DATE NOT NULL,
  dias_dispensados JSONB NOT NULL DEFAULT '[]'::jsonb,
  dias_compensacao JSONB NOT NULL DEFAULT '[]'::jsonb,
  minutos_por_dia INTEGER NOT NULL DEFAULT 60,
  total_minutos_a_compensar INTEGER NOT NULL DEFAULT 0,
  usa_banco_horas BOOLEAN NOT NULL DEFAULT false,
  modalidade TEXT NOT NULL DEFAULT 'acordo_individual',
  base_legal TEXT DEFAULT 'CLT art. 59-B; CF art. 7º XIII; Súmula 85 TST',
  status TEXT NOT NULL DEFAULT 'rascunho',
  observacoes TEXT,
  anexo_url TEXT,
  criado_por UUID,
  aprovado_por UUID,
  aprovado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_compensacao_acordos TO authenticated;
GRANT ALL ON public.ponto_compensacao_acordos TO service_role;
ALTER TABLE public.ponto_compensacao_acordos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage compensacao acordos" ON public.ponto_compensacao_acordos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.ponto_compensacao_participantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  acordo_id UUID NOT NULL REFERENCES public.ponto_compensacao_acordos(id) ON DELETE CASCADE,
  funcionario_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  aceito_em TIMESTAMPTZ,
  assinatura_token TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(acordo_id, funcionario_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_compensacao_participantes TO authenticated;
GRANT ALL ON public.ponto_compensacao_participantes TO service_role;
ALTER TABLE public.ponto_compensacao_participantes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage compensacao participantes" ON public.ponto_compensacao_participantes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_comp_acordos_empresa ON public.ponto_compensacao_acordos(empresa_id, status);
CREATE INDEX idx_comp_participantes_acordo ON public.ponto_compensacao_participantes(acordo_id);
CREATE INDEX idx_comp_participantes_func ON public.ponto_compensacao_participantes(funcionario_id);

CREATE TRIGGER trg_comp_acordos_updated BEFORE UPDATE ON public.ponto_compensacao_acordos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_comp_partic_updated BEFORE UPDATE ON public.ponto_compensacao_participantes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
