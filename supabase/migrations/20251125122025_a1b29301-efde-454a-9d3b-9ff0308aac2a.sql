-- Corrigir políticas RLS da tabela sla_config
-- Problema: está usando usuarios.id em vez de usuarios.auth_user_id

-- Drop políticas antigas
DROP POLICY IF EXISTS "Usuários podem ver configs de SLA do estabelecimento" ON public.sla_config;
DROP POLICY IF EXISTS "Admins e gestores podem gerenciar configs de SLA" ON public.sla_config;

-- Criar políticas corretas
CREATE POLICY "Usuários podem ver configs de SLA do estabelecimento"
ON public.sla_config
FOR SELECT
TO public
USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id 
    FROM public.usuarios 
    WHERE auth_user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 
    FROM public.administradores 
    WHERE id = auth.uid()
  )
);

CREATE POLICY "Admins e gestores podem gerenciar configs de SLA"
ON public.sla_config
FOR ALL
TO public
USING (
  (
    estabelecimento_id IN (
      SELECT estabelecimento_id 
      FROM public.usuarios 
      WHERE auth_user_id = auth.uid()
    )
    AND (
      has_role(auth.uid(), 'admin'::app_role) 
      OR has_role(auth.uid(), 'gestor'::app_role)
    )
  )
  OR EXISTS (
    SELECT 1 
    FROM public.administradores 
    WHERE id = auth.uid()
  )
  OR NOT roles_present()
)
WITH CHECK (
  (
    estabelecimento_id IN (
      SELECT estabelecimento_id 
      FROM public.usuarios 
      WHERE auth_user_id = auth.uid()
    )
    AND (
      has_role(auth.uid(), 'admin'::app_role) 
      OR has_role(auth.uid(), 'gestor'::app_role)
    )
  )
  OR EXISTS (
    SELECT 1 
    FROM public.administradores 
    WHERE id = auth.uid()
  )
  OR NOT roles_present()
);