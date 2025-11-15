-- Criar tabela resend_config se não existir
CREATE TABLE IF NOT EXISTS public.resend_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  api_key TEXT NOT NULL,
  from_email TEXT NOT NULL,
  from_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(estabelecimento_id)
);

-- Enable RLS
ALTER TABLE public.resend_config ENABLE ROW LEVEL SECURITY;

-- Policy para visualizar configurações do próprio estabelecimento
CREATE POLICY "Users can view resend config from same estabelecimento"
ON public.resend_config
FOR SELECT
USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id 
    FROM usuarios 
    WHERE id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM administradores WHERE id = auth.uid()
  )
  OR NOT roles_present()
);

-- Policy para inserir configurações
CREATE POLICY "Admins and gestores can insert resend config"
ON public.resend_config
FOR INSERT
WITH CHECK (
  (
    estabelecimento_id IN (
      SELECT estabelecimento_id 
      FROM usuarios 
      WHERE id = auth.uid()
    )
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gestor'))
  )
  OR EXISTS (
    SELECT 1 FROM administradores WHERE id = auth.uid()
  )
  OR NOT roles_present()
);

-- Policy para atualizar configurações
CREATE POLICY "Admins and gestores can update resend config"
ON public.resend_config
FOR UPDATE
USING (
  (
    estabelecimento_id IN (
      SELECT estabelecimento_id 
      FROM usuarios 
      WHERE id = auth.uid()
    )
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gestor'))
  )
  OR EXISTS (
    SELECT 1 FROM administradores WHERE id = auth.uid()
  )
  OR NOT roles_present()
)
WITH CHECK (
  (
    estabelecimento_id IN (
      SELECT estabelecimento_id 
      FROM usuarios 
      WHERE id = auth.uid()
    )
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gestor'))
  )
  OR EXISTS (
    SELECT 1 FROM administradores WHERE id = auth.uid()
  )
  OR NOT roles_present()
);

-- Policy para deletar configurações
CREATE POLICY "Admins and gestores can delete resend config"
ON public.resend_config
FOR DELETE
USING (
  (
    estabelecimento_id IN (
      SELECT estabelecimento_id 
      FROM usuarios 
      WHERE id = auth.uid()
    )
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gestor'))
  )
  OR EXISTS (
    SELECT 1 FROM administradores WHERE id = auth.uid()
  )
  OR NOT roles_present()
);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_resend_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS update_resend_config_updated_at_trigger ON public.resend_config;
CREATE TRIGGER update_resend_config_updated_at_trigger
  BEFORE UPDATE ON public.resend_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_resend_config_updated_at();