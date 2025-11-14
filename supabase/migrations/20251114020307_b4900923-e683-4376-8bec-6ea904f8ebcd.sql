-- Criar políticas RLS para tarefas validadas por usuário

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Users can view their own tasks" ON calendario_tarefas;
DROP POLICY IF EXISTS "Users can create their own tasks" ON calendario_tarefas;
DROP POLICY IF EXISTS "Users can update their own tasks" ON calendario_tarefas;
DROP POLICY IF EXISTS "Users can delete their own tasks" ON calendario_tarefas;
DROP POLICY IF EXISTS "Admins can view all establishment tasks" ON calendario_tarefas;
DROP POLICY IF EXISTS "Admins can manage all establishment tasks" ON calendario_tarefas;

-- Política para visualizar tarefas
-- Usuários veem suas próprias tarefas OU tarefas do mesmo estabelecimento se forem admin/gestor
CREATE POLICY "Users can view their tasks"
ON calendario_tarefas
FOR SELECT
USING (
  -- Admin via email pattern
  (auth.jwt() ->> 'email') ILIKE 'admin_%@sistema.local'
  OR
  -- Admin na tabela administradores
  EXISTS (
    SELECT 1 FROM administradores 
    WHERE administradores.id = auth.uid()
  )
  OR
  -- Próprias tarefas do usuário
  user_id = auth.uid()
  OR
  -- Tarefas do mesmo estabelecimento se for admin/gestor
  (
    estabelecimento_id = get_user_estabelecimento_id(auth.uid())
    AND (
      has_role(auth.uid(), 'admin'::app_role) 
      OR has_role(auth.uid(), 'gestor'::app_role)
      OR NOT roles_present()
    )
  )
);

-- Política para criar tarefas
-- Usuários podem criar tarefas para si mesmos ou para outros do mesmo estabelecimento se forem admin/gestor
CREATE POLICY "Users can create tasks"
ON calendario_tarefas
FOR INSERT
WITH CHECK (
  -- Admin via email pattern
  (auth.jwt() ->> 'email') ILIKE 'admin_%@sistema.local'
  OR
  -- Admin na tabela administradores
  EXISTS (
    SELECT 1 FROM administradores 
    WHERE administradores.id = auth.uid()
  )
  OR
  -- Criar tarefa para si mesmo
  user_id = auth.uid()
  OR
  -- Criar tarefa para outros do mesmo estabelecimento se for admin/gestor
  (
    estabelecimento_id = get_user_estabelecimento_id(auth.uid())
    AND (
      has_role(auth.uid(), 'admin'::app_role) 
      OR has_role(auth.uid(), 'gestor'::app_role)
      OR NOT roles_present()
    )
  )
);

-- Política para atualizar tarefas
-- Usuários podem atualizar suas próprias tarefas OU tarefas do estabelecimento se forem admin/gestor
CREATE POLICY "Users can update tasks"
ON calendario_tarefas
FOR UPDATE
USING (
  -- Admin via email pattern
  (auth.jwt() ->> 'email') ILIKE 'admin_%@sistema.local'
  OR
  -- Admin na tabela administradores
  EXISTS (
    SELECT 1 FROM administradores 
    WHERE administradores.id = auth.uid()
  )
  OR
  -- Próprias tarefas
  user_id = auth.uid()
  OR
  -- Tarefas do estabelecimento se for admin/gestor
  (
    estabelecimento_id = get_user_estabelecimento_id(auth.uid())
    AND (
      has_role(auth.uid(), 'admin'::app_role) 
      OR has_role(auth.uid(), 'gestor'::app_role)
      OR NOT roles_present()
    )
  )
)
WITH CHECK (
  -- Mesmas regras para o WITH CHECK
  (auth.jwt() ->> 'email') ILIKE 'admin_%@sistema.local'
  OR
  EXISTS (
    SELECT 1 FROM administradores 
    WHERE administradores.id = auth.uid()
  )
  OR
  user_id = auth.uid()
  OR
  (
    estabelecimento_id = get_user_estabelecimento_id(auth.uid())
    AND (
      has_role(auth.uid(), 'admin'::app_role) 
      OR has_role(auth.uid(), 'gestor'::app_role)
      OR NOT roles_present()
    )
  )
);

-- Política para deletar tarefas
-- Usuários podem deletar suas próprias tarefas OU tarefas do estabelecimento se forem admin/gestor
CREATE POLICY "Users can delete tasks"
ON calendario_tarefas
FOR DELETE
USING (
  -- Admin via email pattern
  (auth.jwt() ->> 'email') ILIKE 'admin_%@sistema.local'
  OR
  -- Admin na tabela administradores
  EXISTS (
    SELECT 1 FROM administradores 
    WHERE administradores.id = auth.uid()
  )
  OR
  -- Próprias tarefas
  user_id = auth.uid()
  OR
  -- Tarefas do estabelecimento se for admin/gestor
  (
    estabelecimento_id = get_user_estabelecimento_id(auth.uid())
    AND (
      has_role(auth.uid(), 'admin'::app_role) 
      OR has_role(auth.uid(), 'gestor'::app_role)
      OR NOT roles_present()
    )
  )
);