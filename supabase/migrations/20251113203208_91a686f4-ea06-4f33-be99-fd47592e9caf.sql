-- Remover política antiga de INSERT que impede admins de criar tarefas para outros usuários
DROP POLICY IF EXISTS "Usuários podem criar suas próprias tarefas" ON calendario_tarefas;

-- Criar nova política de INSERT que permite usuários criarem suas próprias tarefas
CREATE POLICY "Usuários podem criar suas próprias tarefas"
ON calendario_tarefas
FOR INSERT
TO public
WITH CHECK (auth.uid() = user_id);

-- Criar política adicional para admins criarem tarefas para qualquer usuário do mesmo estabelecimento
CREATE POLICY "Admins podem criar tarefas para usuários do estabelecimento"
ON calendario_tarefas
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM administradores
    WHERE administradores.id = auth.uid()
  )
  OR 
  EXISTS (
    SELECT 1 FROM usuarios u1
    WHERE u1.id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM usuarios u2
      WHERE u2.id = calendario_tarefas.user_id
      AND u2.estabelecimento_id = u1.estabelecimento_id
      AND (
        has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'gestor'::app_role)
      )
    )
  )
);