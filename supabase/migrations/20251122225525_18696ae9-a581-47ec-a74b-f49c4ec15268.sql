-- Corrigir políticas RLS da tabela calendario_regras para usar auth_user_id
DROP POLICY IF EXISTS "View calendario_regras (same estab or admin)" ON public.calendario_regras;
DROP POLICY IF EXISTS "Manage calendario_regras (same estab or admin)" ON public.calendario_regras;

-- SELECT: Usuários veem regras do seu estabelecimento OU administradores do sistema veem todos
CREATE POLICY "View calendario_regras (same estab or admin)"
ON public.calendario_regras
FOR SELECT
TO public
USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id 
    FROM usuarios 
    WHERE auth_user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM administradores WHERE id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- ALL: Usuários com role admin/gestor podem gerenciar regras do seu estabelecimento OU administradores do sistema
CREATE POLICY "Manage calendario_regras (same estab or admin)"
ON public.calendario_regras
FOR ALL
TO public
USING (
  (
    estabelecimento_id IN (
      SELECT estabelecimento_id 
      FROM usuarios 
      WHERE auth_user_id = auth.uid()
    )
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role))
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
      WHERE auth_user_id = auth.uid()
    )
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role))
  )
  OR EXISTS (
    SELECT 1 FROM administradores WHERE id = auth.uid()
  )
  OR NOT roles_present()
);