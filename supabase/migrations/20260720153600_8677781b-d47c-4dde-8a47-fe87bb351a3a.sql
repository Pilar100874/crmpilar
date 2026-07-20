
ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS contato_nome text,
  ADD COLUMN IF NOT EXISTS contato_cargo text,
  ADD COLUMN IF NOT EXISTS contato_email text,
  ADD COLUMN IF NOT EXISTS contato_telefone text,
  ADD COLUMN IF NOT EXISTS observacoes_internas text,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}'::text[];
