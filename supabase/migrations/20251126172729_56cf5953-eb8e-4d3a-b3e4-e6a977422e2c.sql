-- Permitir que administradores do estabelecimento (role admin) modifiquem configurações
-- do próprio estabelecimento, não apenas administradores de sistema

-- Remover política atual restritiva
DROP POLICY IF EXISTS "Apenas administradores modificam estabelecimentos" ON public.estabelecimentos;

-- Criar nova política mais flexível
CREATE POLICY "Admins modificam estabelecimentos"
ON public.estabelecimentos
FOR UPDATE
TO authenticated
USING (
  -- Administrador de sistema pode modificar qualquer estabelecimento
  EXISTS (
    SELECT 1 FROM public.administradores 
    WHERE administradores.id = auth.uid()
  )
  OR
  -- Usuário com role 'admin' pode modificar seu próprio estabelecimento
  (
    has_role(auth.uid(), 'admin'::app_role)
    AND id IN (
      SELECT estabelecimento_id 
      FROM public.usuarios 
      WHERE auth_user_id = auth.uid()
    )
  )
)
WITH CHECK (
  -- Mesmas regras para validação após UPDATE
  EXISTS (
    SELECT 1 FROM public.administradores 
    WHERE administradores.id = auth.uid()
  )
  OR
  (
    has_role(auth.uid(), 'admin'::app_role)
    AND id IN (
      SELECT estabelecimento_id 
      FROM public.usuarios 
      WHERE auth_user_id = auth.uid()
    )
  )
);