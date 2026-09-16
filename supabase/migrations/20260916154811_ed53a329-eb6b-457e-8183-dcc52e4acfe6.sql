ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS sip_porta INTEGER DEFAULT 8089;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS sip_porta_alternativa INTEGER DEFAULT 8089;
ALTER TABLE public.usuarios ALTER COLUMN sip_porta SET DEFAULT 8089;
ALTER TABLE public.usuarios ALTER COLUMN sip_porta_alternativa SET DEFAULT 8089;
UPDATE public.usuarios SET sip_porta = 8089 WHERE sip_porta IS NULL;
UPDATE public.usuarios SET sip_porta_alternativa = 8089 WHERE sip_porta_alternativa IS NULL;