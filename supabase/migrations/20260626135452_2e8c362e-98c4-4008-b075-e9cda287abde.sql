ALTER TABLE public.ponto_compensacao_acordos 
ADD COLUMN IF NOT EXISTS tipo_dispensa text DEFAULT 'dia_completo',
ADD COLUMN IF NOT EXISTS minutos_dispensados integer DEFAULT 480;