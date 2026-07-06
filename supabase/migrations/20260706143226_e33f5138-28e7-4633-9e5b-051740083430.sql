
-- 1. visita_formularios
CREATE TABLE public.visita_formularios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id UUID NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.visita_formularios TO authenticated;
GRANT ALL ON public.visita_formularios TO service_role;
ALTER TABLE public.visita_formularios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vf_select" ON public.visita_formularios FOR SELECT TO authenticated
  USING (estabelecimento_id IN (SELECT u.estabelecimento_id FROM public.usuarios u WHERE u.auth_user_id = auth.uid()));
CREATE POLICY "vf_insert" ON public.visita_formularios FOR INSERT TO authenticated
  WITH CHECK (estabelecimento_id IN (SELECT u.estabelecimento_id FROM public.usuarios u WHERE u.auth_user_id = auth.uid()));
CREATE POLICY "vf_update" ON public.visita_formularios FOR UPDATE TO authenticated
  USING (estabelecimento_id IN (SELECT u.estabelecimento_id FROM public.usuarios u WHERE u.auth_user_id = auth.uid()));
CREATE POLICY "vf_delete" ON public.visita_formularios FOR DELETE TO authenticated
  USING (estabelecimento_id IN (SELECT u.estabelecimento_id FROM public.usuarios u WHERE u.auth_user_id = auth.uid()));
CREATE TRIGGER trg_vf_updated BEFORE UPDATE ON public.visita_formularios FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. visita_formulario_campos
CREATE TABLE public.visita_formulario_campos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formulario_id UUID NOT NULL REFERENCES public.visita_formularios(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  rotulo TEXT NOT NULL,
  chave TEXT NOT NULL,
  obrigatorio BOOLEAN NOT NULL DEFAULT false,
  ordem INT NOT NULL DEFAULT 0,
  opcoes JSONB,
  condicional JSONB,
  placeholder TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (formulario_id, chave)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.visita_formulario_campos TO authenticated;
GRANT ALL ON public.visita_formulario_campos TO service_role;
ALTER TABLE public.visita_formulario_campos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vfc_all" ON public.visita_formulario_campos FOR ALL TO authenticated
  USING (formulario_id IN (SELECT id FROM public.visita_formularios WHERE estabelecimento_id IN (SELECT u.estabelecimento_id FROM public.usuarios u WHERE u.auth_user_id = auth.uid())))
  WITH CHECK (formulario_id IN (SELECT id FROM public.visita_formularios WHERE estabelecimento_id IN (SELECT u.estabelecimento_id FROM public.usuarios u WHERE u.auth_user_id = auth.uid())));
CREATE TRIGGER trg_vfc_updated BEFORE UPDATE ON public.visita_formulario_campos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. visita_formulario_regras
CREATE TABLE public.visita_formulario_regras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id UUID NOT NULL,
  formulario_id UUID NOT NULL REFERENCES public.visita_formularios(id) ON DELETE CASCADE,
  escopo TEXT NOT NULL CHECK (escopo IN ('usuario','filial','segmento','global')),
  usuario_id UUID,
  filial_id UUID,
  segmento_id UUID,
  obrigatorio_encerrar BOOLEAN NOT NULL DEFAULT false,
  prioridade INT NOT NULL DEFAULT 0,
  ativa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.visita_formulario_regras TO authenticated;
GRANT ALL ON public.visita_formulario_regras TO service_role;
ALTER TABLE public.visita_formulario_regras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vfr_all" ON public.visita_formulario_regras FOR ALL TO authenticated
  USING (estabelecimento_id IN (SELECT u.estabelecimento_id FROM public.usuarios u WHERE u.auth_user_id = auth.uid()))
  WITH CHECK (estabelecimento_id IN (SELECT u.estabelecimento_id FROM public.usuarios u WHERE u.auth_user_id = auth.uid()));
CREATE TRIGGER trg_vfr_updated BEFORE UPDATE ON public.visita_formulario_regras FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. visita_formulario_respostas
CREATE TABLE public.visita_formulario_respostas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id UUID NOT NULL,
  ocorrencia_id UUID NOT NULL REFERENCES public.visita_ocorrencias(id) ON DELETE CASCADE,
  formulario_id UUID NOT NULL REFERENCES public.visita_formularios(id),
  respostas JSONB NOT NULL DEFAULT '{}'::jsonb,
  anexos JSONB,
  lat NUMERIC,
  lng NUMERIC,
  preenchido_por UUID,
  preenchido_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.visita_formulario_respostas TO authenticated;
GRANT ALL ON public.visita_formulario_respostas TO service_role;
ALTER TABLE public.visita_formulario_respostas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vfresp_all" ON public.visita_formulario_respostas FOR ALL TO authenticated
  USING (estabelecimento_id IN (SELECT u.estabelecimento_id FROM public.usuarios u WHERE u.auth_user_id = auth.uid()))
  WITH CHECK (estabelecimento_id IN (SELECT u.estabelecimento_id FROM public.usuarios u WHERE u.auth_user_id = auth.uid()));
CREATE TRIGGER trg_vfresp_updated BEFORE UPDATE ON public.visita_formulario_respostas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_vfresp_ocorrencia ON public.visita_formulario_respostas(ocorrencia_id);

-- 5. Extensão em visita_ocorrencias
ALTER TABLE public.visita_ocorrencias
  ADD COLUMN IF NOT EXISTS origem TEXT NOT NULL DEFAULT 'programada' CHECK (origem IN ('programada','espontanea')),
  ADD COLUMN IF NOT EXISTS formulario_id UUID REFERENCES public.visita_formularios(id),
  ADD COLUMN IF NOT EXISTS formulario_status TEXT NOT NULL DEFAULT 'nao_aplicavel' CHECK (formulario_status IN ('nao_aplicavel','pendente','preenchido'));

-- (hora_saida já existe conforme plano anterior; garantimos coluna caso ausente)
ALTER TABLE public.visita_ocorrencias
  ADD COLUMN IF NOT EXISTS customer_id UUID;

-- 6. Extensão em visita_regras_monitoramento
ALTER TABLE public.visita_regras_monitoramento
  ADD COLUMN IF NOT EXISTS detectar_espontanea BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS espontanea_ignorar_propria_filial BOOLEAN NOT NULL DEFAULT true;

-- Índices auxiliares
CREATE INDEX IF NOT EXISTS idx_visita_ocorrencias_origem ON public.visita_ocorrencias(origem, data_prevista);
CREATE INDEX IF NOT EXISTS idx_visita_ocorrencias_customer ON public.visita_ocorrencias(customer_id, data_prevista);
