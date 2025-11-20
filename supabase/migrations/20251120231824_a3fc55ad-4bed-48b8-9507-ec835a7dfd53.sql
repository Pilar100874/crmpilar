-- Habilitar RLS na tabela fila_skills
ALTER TABLE fila_skills ENABLE ROW LEVEL SECURITY;

-- Política para SELECT: usuários podem ver skills de filas do seu estabelecimento
CREATE POLICY "Usuários podem ver skills de filas"
ON fila_skills
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM filas_atendimento
    WHERE filas_atendimento.id = fila_skills.fila_id
    AND (
      filas_atendimento.estabelecimento_id IN (
        SELECT estabelecimento_id FROM usuarios WHERE auth_user_id = auth.uid()
      )
      OR
      EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
    )
  )
);

-- Política para INSERT/UPDATE/DELETE: admins e gestores podem gerenciar
CREATE POLICY "Admins podem gerenciar skills de filas"
ON fila_skills
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM filas_atendimento
    WHERE filas_atendimento.id = fila_skills.fila_id
    AND (
      filas_atendimento.estabelecimento_id IN (
        SELECT estabelecimento_id FROM usuarios WHERE auth_user_id = auth.uid()
      )
      OR
      EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
    )
  )
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'gestor'::app_role) 
    OR NOT roles_present()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM filas_atendimento
    WHERE filas_atendimento.id = fila_skills.fila_id
    AND (
      filas_atendimento.estabelecimento_id IN (
        SELECT estabelecimento_id FROM usuarios WHERE auth_user_id = auth.uid()
      )
      OR
      EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
    )
  )
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'gestor'::app_role) 
    OR NOT roles_present()
  )
);