-- Adiciona políticas para admins gerenciarem tarefas de outros usuários

-- Política UPDATE para admins (email admin_*)
CREATE POLICY "Admin email can update all tasks"
ON calendario_tarefas
FOR UPDATE
USING ((auth.jwt() ->> 'email'::text) ~~* 'admin_%@sistema.local'::text);

-- Política UPDATE para administradores (tabela administradores)
CREATE POLICY "Administradores podem atualizar todas as tarefas"
ON calendario_tarefas
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM administradores
  WHERE administradores.id = auth.uid()
));

-- Política UPDATE para admins/gestores do mesmo estabelecimento
CREATE POLICY "Admins podem atualizar tarefas do estabelecimento"
ON calendario_tarefas
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM usuarios u1
    WHERE u1.id = auth.uid()
    AND estabelecimento_id = u1.estabelecimento_id
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role))
  )
);

-- Política DELETE para admins (email admin_*)
CREATE POLICY "Admin email can delete all tasks"
ON calendario_tarefas
FOR DELETE
USING ((auth.jwt() ->> 'email'::text) ~~* 'admin_%@sistema.local'::text);

-- Política DELETE para administradores (tabela administradores)
CREATE POLICY "Administradores podem deletar todas as tarefas"
ON calendario_tarefas
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM administradores
  WHERE administradores.id = auth.uid()
));

-- Política DELETE para admins/gestores do mesmo estabelecimento
CREATE POLICY "Admins podem deletar tarefas do estabelecimento"
ON calendario_tarefas
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM usuarios u1
    WHERE u1.id = auth.uid()
    AND estabelecimento_id = u1.estabelecimento_id
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role))
  )
);