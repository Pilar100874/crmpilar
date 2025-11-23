-- Corrigir políticas RLS da tabela estabelecimentos para permitir visualização apropriada

-- Remover política antiga se existir
DROP POLICY IF EXISTS "View estabelecimentos (same estab or admin)" ON public.estabelecimentos;

-- SELECT: Usuários veem seu próprio estabelecimento OU administradores de sistema veem todos
CREATE POLICY "View estabelecimentos (same estab or admin)"
ON public.estabelecimentos
FOR SELECT
TO public
USING (
  -- Administradores de sistema veem todos
  EXISTS (
    SELECT 1 FROM administradores WHERE id = auth.uid()
  )
  OR
  -- Usuários veem apenas o estabelecimento ao qual estão vinculados
  id IN (
    SELECT estabelecimento_id 
    FROM usuarios 
    WHERE auth_user_id = auth.uid()
  )
  OR
  -- Usuários com role admin veem todos do seu estabelecimento
  (
    has_role(auth.uid(), 'admin'::app_role)
    AND id IN (
      SELECT estabelecimento_id 
      FROM usuarios 
      WHERE auth_user_id = auth.uid()
    )
  )
);