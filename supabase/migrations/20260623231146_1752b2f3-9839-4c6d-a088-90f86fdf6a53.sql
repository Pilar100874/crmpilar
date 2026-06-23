ALTER TABLE public.ponto_departamentos ALTER COLUMN empresa_id DROP NOT NULL;
ALTER TABLE public.ponto_departamentos ADD COLUMN IF NOT EXISTS global boolean NOT NULL DEFAULT false;

ALTER TABLE public.ponto_cargos ALTER COLUMN empresa_id DROP NOT NULL;
ALTER TABLE public.ponto_cargos ADD COLUMN IF NOT EXISTS global boolean NOT NULL DEFAULT false;

ALTER TABLE public.ponto_equipes ALTER COLUMN empresa_id DROP NOT NULL;
ALTER TABLE public.ponto_equipes ADD COLUMN IF NOT EXISTS global boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_ponto_departamentos_global ON public.ponto_departamentos(global) WHERE global = true;
CREATE INDEX IF NOT EXISTS idx_ponto_cargos_global ON public.ponto_cargos(global) WHERE global = true;
CREATE INDEX IF NOT EXISTS idx_ponto_equipes_global ON public.ponto_equipes(global) WHERE global = true;