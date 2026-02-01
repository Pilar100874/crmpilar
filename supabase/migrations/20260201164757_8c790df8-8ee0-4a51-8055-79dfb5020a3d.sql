-- Tabela para armazenar consentimento de monitoramento de tela
CREATE TABLE public.screen_monitor_consent (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  consent_given BOOLEAN NOT NULL DEFAULT true,
  consent_given_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_sharing BOOLEAN NOT NULL DEFAULT false,
  sharing_started_at TIMESTAMP WITH TIME ZONE,
  last_frame_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(usuario_id, estabelecimento_id)
);

-- Habilitar RLS
ALTER TABLE public.screen_monitor_consent ENABLE ROW LEVEL SECURITY;

-- Usuários podem gerenciar seu próprio consentimento
CREATE POLICY "Usuarios podem inserir proprio consentimento" 
ON public.screen_monitor_consent
FOR INSERT
WITH CHECK (
  usuario_id IN (
    SELECT id FROM usuarios WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "Usuarios podem atualizar proprio consentimento" 
ON public.screen_monitor_consent
FOR UPDATE
USING (
  usuario_id IN (
    SELECT id FROM usuarios WHERE auth_user_id = auth.uid()
  )
);

-- Admins e supervisores podem ver consentimentos do estabelecimento
CREATE POLICY "Admins podem ver consentimentos do estabelecimento" 
ON public.screen_monitor_consent
FOR SELECT
USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM usuarios WHERE auth_user_id = auth.uid()
  )
  OR public.is_system_admin()
);

-- Habilitar realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.screen_monitor_consent;