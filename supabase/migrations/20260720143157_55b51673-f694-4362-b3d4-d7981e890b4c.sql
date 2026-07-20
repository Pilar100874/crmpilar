ALTER TABLE public.segmentos ADD COLUMN IF NOT EXISTS is_prospect boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_segmentos_is_prospect ON public.segmentos(is_prospect);