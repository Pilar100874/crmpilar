-- Add segmento_id column to usuarios table for segment-based filtering
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS segmento_id UUID REFERENCES public.segmentos(id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_usuarios_segmento_id ON public.usuarios(segmento_id);