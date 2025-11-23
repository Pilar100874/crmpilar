-- Criar tabela para configuração do WhatsApp
CREATE TABLE IF NOT EXISTS public.whatsapp_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  api_url TEXT NOT NULL,
  api_key TEXT,
  session_name TEXT NOT NULL DEFAULT 'default',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(estabelecimento_id)
);

-- Habilitar RLS
ALTER TABLE public.whatsapp_config ENABLE ROW LEVEL SECURITY;

-- Política de SELECT: usuários autenticados podem ver a configuração do seu estabelecimento ou admins podem ver tudo
CREATE POLICY "whatsapp_config_select_policy" ON public.whatsapp_config
  FOR SELECT
  USING (
    estabelecimento_id = get_user_estabelecimento_id(auth.uid())
    OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  );

-- Política de INSERT: apenas admins de estabelecimento ou admins de sistema
CREATE POLICY "whatsapp_config_insert_policy" ON public.whatsapp_config
  FOR INSERT
  WITH CHECK (
    (estabelecimento_id = get_user_estabelecimento_id(auth.uid()) 
     AND has_role(auth.uid(), 'admin'::app_role))
    OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  );

-- Política de UPDATE: apenas admins de estabelecimento ou admins de sistema
CREATE POLICY "whatsapp_config_update_policy" ON public.whatsapp_config
  FOR UPDATE
  USING (
    (estabelecimento_id = get_user_estabelecimento_id(auth.uid()) 
     AND has_role(auth.uid(), 'admin'::app_role))
    OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  );

-- Política de DELETE: apenas admins de estabelecimento ou admins de sistema
CREATE POLICY "whatsapp_config_delete_policy" ON public.whatsapp_config
  FOR DELETE
  USING (
    (estabelecimento_id = get_user_estabelecimento_id(auth.uid()) 
     AND has_role(auth.uid(), 'admin'::app_role))
    OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  );

-- Trigger para atualizar updated_at
CREATE TRIGGER update_whatsapp_config_updated_at
  BEFORE UPDATE ON public.whatsapp_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índice para melhorar performance
CREATE INDEX idx_whatsapp_config_estabelecimento ON public.whatsapp_config(estabelecimento_id);