-- Remover políticas existentes se houver
DROP POLICY IF EXISTS "Users can view resend config from same estabelecimento" ON public.resend_config;
DROP POLICY IF EXISTS "Admins and gestores can insert resend config" ON public.resend_config;
DROP POLICY IF EXISTS "Admins and gestores can update resend config" ON public.resend_config;
DROP POLICY IF EXISTS "Admins and gestores can delete resend config" ON public.resend_config;

-- Recriar políticas corretas
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