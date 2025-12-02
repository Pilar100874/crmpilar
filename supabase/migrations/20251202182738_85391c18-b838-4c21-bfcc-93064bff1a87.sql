-- Add resolvido fields to avisos_sistema
ALTER TABLE public.avisos_sistema 
ADD COLUMN IF NOT EXISTS resolvido boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS resolvido_por uuid REFERENCES usuarios(id),
ADD COLUMN IF NOT EXISTS resolvido_em timestamp with time zone;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_avisos_sistema_resolvido ON public.avisos_sistema(resolvido);
CREATE INDEX IF NOT EXISTS idx_avisos_sistema_estabelecimento ON public.avisos_sistema(estabelecimento_id);

-- Update RLS policies for avisos_sistema to allow updates
DROP POLICY IF EXISTS "avisos_sistema_update_policy" ON public.avisos_sistema;
CREATE POLICY "avisos_sistema_update_policy" ON public.avisos_sistema
FOR UPDATE USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM usuarios WHERE auth_user_id = auth.uid()
  )
);