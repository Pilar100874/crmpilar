ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS whatsapp_numero_id uuid REFERENCES public.whatsapp_numeros(id) ON DELETE SET NULL;

ALTER TABLE public.bot_flows
  ADD COLUMN IF NOT EXISTS forward_to_numero_id uuid REFERENCES public.whatsapp_numeros(id) ON DELETE SET NULL;

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS whatsapp_numero_id uuid REFERENCES public.whatsapp_numeros(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_whatsapp_numero ON public.conversations(whatsapp_numero_id);
CREATE INDEX IF NOT EXISTS idx_bot_flows_forward_numero ON public.bot_flows(forward_to_numero_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_whatsapp_numero ON public.usuarios(whatsapp_numero_id);