
-- Ampliação de ponto_funcionarios
ALTER TABLE public.ponto_funcionarios
  ADD COLUMN IF NOT EXISTS sobrenome text,
  ADD COLUMN IF NOT EXISTS eh_clt boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS registra_ponto boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS tipo_registro_ponto text,
  ADD COLUMN IF NOT EXISTS matricula_esocial text,
  ADD COLUMN IF NOT EXISTS centro_custo text,
  ADD COLUMN IF NOT EXISTS pin text,
  ADD COLUMN IF NOT EXISTS foto_url text,
  ADD COLUMN IF NOT EXISTS data_nascimento date,
  ADD COLUMN IF NOT EXISTS eh_aposentado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pais_nascimento text,
  ADD COLUMN IF NOT EXISTS cidade_nascimento text,
  ADD COLUMN IF NOT EXISTS estado_civil text,
  ADD COLUMN IF NOT EXISTS genero text,
  ADD COLUMN IF NOT EXISTS nome_mae text,
  ADD COLUMN IF NOT EXISTS nome_pai text,
  ADD COLUMN IF NOT EXISTS etnia text,
  ADD COLUMN IF NOT EXISTS escolaridade text,
  ADD COLUMN IF NOT EXISTS notas text,
  ADD COLUMN IF NOT EXISTS telefone_alt text,
  ADD COLUMN IF NOT EXISTS email_alt text,
  ADD COLUMN IF NOT EXISTS cep text,
  ADD COLUMN IF NOT EXISTS cidade text,
  ADD COLUMN IF NOT EXISTS uf text,
  ADD COLUMN IF NOT EXISTS tipo_local text,
  ADD COLUMN IF NOT EXISTS endereco text,
  ADD COLUMN IF NOT EXISTS numero text,
  ADD COLUMN IF NOT EXISTS complemento text,
  ADD COLUMN IF NOT EXISTS bairro text,
  ADD COLUMN IF NOT EXISTS deficiencia_fisica boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deficiencia_mental boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deficiencia_auditiva boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deficiencia_intelectual boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deficiencia_visual boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reabilitado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notas_especiais text,
  ADD COLUMN IF NOT EXISTS config_controle_ponto text,
  ADD COLUMN IF NOT EXISTS data_inicio_ponto date,
  ADD COLUMN IF NOT EXISTS jornada_contratada_horas numeric,
  ADD COLUMN IF NOT EXISTS tipo_contrato text DEFAULT 'mensalista',
  ADD COLUMN IF NOT EXISTS valor_hora numeric,
  ADD COLUMN IF NOT EXISTS permitir_localizacao text DEFAULT 'conta',
  ADD COLUMN IF NOT EXISTS permitir_offline text DEFAULT 'conta',
  ADD COLUMN IF NOT EXISTS permitir_qualquer_dispositivo boolean NOT NULL DEFAULT false;

-- Dependentes
CREATE TABLE IF NOT EXISTS public.ponto_funcionario_dependentes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id uuid NOT NULL REFERENCES public.ponto_funcionarios(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  nome text NOT NULL,
  cpf text,
  data_nascimento date,
  deduz_irrf boolean NOT NULL DEFAULT false,
  salario_familia boolean NOT NULL DEFAULT false,
  previdenciario boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pf_dep_func ON public.ponto_funcionario_dependentes(funcionario_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_funcionario_dependentes TO authenticated;
GRANT ALL ON public.ponto_funcionario_dependentes TO service_role;
ALTER TABLE public.ponto_funcionario_dependentes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage dependentes" ON public.ponto_funcionario_dependentes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Documentos
CREATE TABLE IF NOT EXISTS public.ponto_funcionario_documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id uuid NOT NULL REFERENCES public.ponto_funcionarios(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  numero text NOT NULL,
  orgao_expedidor text,
  data_expedicao date,
  arquivo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pf_doc_func ON public.ponto_funcionario_documentos(funcionario_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_funcionario_documentos TO authenticated;
GRANT ALL ON public.ponto_funcionario_documentos TO service_role;
ALTER TABLE public.ponto_funcionario_documentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage documentos" ON public.ponto_funcionario_documentos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
