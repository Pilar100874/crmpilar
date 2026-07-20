
-- Adiciona campos de qualificação e enriquecimento em prospeccao_empresas
ALTER TABLE public.prospeccao_empresas
  ADD COLUMN IF NOT EXISTS contato_nome text,
  ADD COLUMN IF NOT EXISTS contato_cargo text,
  ADD COLUMN IF NOT EXISTS contato_email text,
  ADD COLUMN IF NOT EXISTS contato_telefone text,
  ADD COLUMN IF NOT EXISTS porte text,
  ADD COLUMN IF NOT EXISTS faturamento_estimado text,
  ADD COLUMN IF NOT EXISTS funcionarios_estimado text,
  ADD COLUMN IF NOT EXISTS data_fundacao date,
  ADD COLUMN IF NOT EXISTS situacao_cadastral text,
  ADD COLUMN IF NOT EXISTS score integer,
  ADD COLUMN IF NOT EXISTS score_motivo text,
  ADD COLUMN IF NOT EXISTS produtos_interesse jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS prioridade text,
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric,
  ADD COLUMN IF NOT EXISTS tags jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS observacoes_internas text;

-- Campos correspondentes em empresas (os que ainda não existem)
ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS porte text,
  ADD COLUMN IF NOT EXISTS faturamento_estimado text,
  ADD COLUMN IF NOT EXISTS funcionarios_estimado text,
  ADD COLUMN IF NOT EXISTS data_fundacao date,
  ADD COLUMN IF NOT EXISTS situacao_cadastral text,
  ADD COLUMN IF NOT EXISTS score_prospect integer,
  ADD COLUMN IF NOT EXISTS score_motivo text,
  ADD COLUMN IF NOT EXISTS produtos_interesse jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS prioridade text;
