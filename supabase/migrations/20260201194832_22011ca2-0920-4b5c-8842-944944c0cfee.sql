-- Adicionar campo para controlar quando há viewer ativo
ALTER TABLE public.screen_monitor_consent 
ADD COLUMN IF NOT EXISTS viewer_active boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS viewer_started_at timestamp with time zone;

-- Índice para consulta rápida
CREATE INDEX IF NOT EXISTS idx_screen_monitor_consent_viewer 
ON public.screen_monitor_consent(usuario_id, viewer_active);