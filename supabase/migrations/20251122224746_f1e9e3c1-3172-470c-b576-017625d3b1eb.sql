-- Apenas administradores do sistema podem gerenciar estabelecimentos
-- Usuários regulares (incluindo admin) podem apenas ver seu próprio estabelecimento

-- Remover políticas antigas de estabelecimentos
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.estabelecimentos;
DROP POLICY IF EXISTS "estabelecimentos_auth_all" ON public.estabelecimentos;
DROP POLICY IF EXISTS "Simple policy for estabelecimentos" ON public.estabelecimentos;
DROP POLICY IF EXISTS "Usuarios podem ver estabelecimentos" ON public.estabelecimentos;

-- SELECT: Usuários veem apenas seu estabelecimento, administradores veem todos
CREATE POLICY "Usuarios veem seu estabelecimento"
ON public.estabelecimentos
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT estabelecimento_id 
    FROM usuarios 
    WHERE auth_user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM administradores WHERE id = auth.uid()
  )
);

-- INSERT: Apenas administradores do sistema podem criar estabelecimentos
CREATE POLICY "Apenas administradores criam estabelecimentos"
ON public.estabelecimentos
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM administradores WHERE id = auth.uid()
  )
);

-- UPDATE: Apenas administradores do sistema podem modificar estabelecimentos
CREATE POLICY "Apenas administradores modificam estabelecimentos"
ON public.estabelecimentos
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM administradores WHERE id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM administradores WHERE id = auth.uid()
  )
);

-- DELETE: Apenas administradores do sistema podem excluir estabelecimentos
CREATE POLICY "Apenas administradores excluem estabelecimentos"
ON public.estabelecimentos
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM administradores WHERE id = auth.uid()
  )
);