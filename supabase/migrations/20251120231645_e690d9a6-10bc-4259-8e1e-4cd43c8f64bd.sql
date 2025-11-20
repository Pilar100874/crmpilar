-- Corrigir política de SELECT para permitir que administradores vejam skills
-- do estabelecimento selecionado no localStorage
DROP POLICY IF EXISTS "Usuários podem ver skills" ON skills;

CREATE POLICY "Usuários podem ver skills"
ON skills
FOR SELECT
TO authenticated
USING (
  -- Usuários regulares: veem skills do seu estabelecimento
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM usuarios WHERE auth_user_id = auth.uid()
  )
  OR
  -- Administradores: sempre podem ver (estabelecimento é controlado pelo app)
  EXISTS (
    SELECT 1 FROM administradores WHERE id = auth.uid()
  )
);