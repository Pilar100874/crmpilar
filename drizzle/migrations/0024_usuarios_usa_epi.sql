ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS usa_epi boolean NOT NULL DEFAULT false;
ALTER TABLE public.epi_entregas ADD COLUMN IF NOT EXISTS usuario_id uuid REFERENCES public.usuarios(id) ON DELETE CASCADE;
ALTER TABLE public.epi_entregas ALTER COLUMN funcionario_id DROP NOT NULL;
CREATE INDEX IF NOT EXISTS epi_entregas_usuario_idx ON public.epi_entregas (usuario_id);