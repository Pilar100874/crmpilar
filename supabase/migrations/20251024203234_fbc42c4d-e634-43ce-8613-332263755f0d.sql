-- Criar tabela de configuração Resend por estabelecimento
CREATE TABLE IF NOT EXISTS public.resend_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  api_key TEXT NOT NULL,
  from_email TEXT NOT NULL,
  from_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(estabelecimento_id)
);

-- Enable RLS
ALTER TABLE public.resend_config ENABLE ROW LEVEL SECURITY;

-- Policy para visualizar configurações do mesmo estabelecimento
CREATE POLICY "Users can view resend config from same estabelecimento"
ON public.resend_config
FOR SELECT
USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.administradores WHERE id = auth.uid()
  )
);

-- Policy para gerenciar configurações (admin e gestor do estabelecimento)
CREATE POLICY "Admins and gestores can manage resend config"
ON public.resend_config
FOR ALL
USING (
  (
    estabelecimento_id IN (
      SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
    )
    AND (
      has_role(auth.uid(), 'admin'::app_role) 
      OR has_role(auth.uid(), 'gestor'::app_role)
    )
  )
  OR EXISTS (
    SELECT 1 FROM public.administradores WHERE id = auth.uid()
  )
  OR NOT roles_present()
)
WITH CHECK (
  (
    estabelecimento_id IN (
      SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
    )
    AND (
      has_role(auth.uid(), 'admin'::app_role) 
      OR has_role(auth.uid(), 'gestor'::app_role)
    )
  )
  OR EXISTS (
    SELECT 1 FROM public.administradores WHERE id = auth.uid()
  )
  OR NOT roles_present()
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_resend_config_updated_at
  BEFORE UPDATE ON public.resend_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();