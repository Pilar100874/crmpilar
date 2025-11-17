-- Create UCM configuration table
CREATE TABLE public.ucm_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  ucm_host TEXT NOT NULL,
  ucm_user TEXT NOT NULL,
  ucm_password TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(estabelecimento_id)
);

-- Enable RLS
ALTER TABLE public.ucm_config ENABLE ROW LEVEL SECURITY;

-- Policy for viewing (same establishment)
CREATE POLICY "Users can view their establishment UCM config"
ON public.ucm_config
FOR SELECT
USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM usuarios WHERE id = auth.uid()
  )
  OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
);

-- Policy for inserting (same establishment, admin/gestor)
CREATE POLICY "Admins and gestores can insert UCM config"
ON public.ucm_config
FOR INSERT
WITH CHECK (
  (
    estabelecimento_id IN (
      SELECT estabelecimento_id FROM usuarios WHERE id = auth.uid()
    )
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gestor'))
  )
  OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  OR NOT roles_present()
);

-- Policy for updating (same establishment, admin/gestor)
CREATE POLICY "Admins and gestores can update UCM config"
ON public.ucm_config
FOR UPDATE
USING (
  (
    estabelecimento_id IN (
      SELECT estabelecimento_id FROM usuarios WHERE id = auth.uid()
    )
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gestor'))
  )
  OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  OR NOT roles_present()
);

-- Policy for deleting (same establishment, admin/gestor)
CREATE POLICY "Admins and gestores can delete UCM config"
ON public.ucm_config
FOR DELETE
USING (
  (
    estabelecimento_id IN (
      SELECT estabelecimento_id FROM usuarios WHERE id = auth.uid()
    )
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gestor'))
  )
  OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  OR NOT roles_present()
);

-- Trigger for updated_at
CREATE TRIGGER update_ucm_config_updated_at
BEFORE UPDATE ON public.ucm_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();