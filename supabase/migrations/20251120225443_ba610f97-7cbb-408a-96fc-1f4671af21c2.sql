-- Criar políticas RLS para atendente_skills
DROP POLICY IF EXISTS "Atendentes podem gerenciar suas próprias skills" ON atendente_skills;
DROP POLICY IF EXISTS "Admins podem gerenciar skills de atendentes" ON atendente_skills;
DROP POLICY IF EXISTS "Usuários podem ver skills de atendentes" ON atendente_skills;

-- Permitir que admins e gestores gerenciem as skills dos atendentes
CREATE POLICY "Admins podem gerenciar skills de atendentes"
ON atendente_skills
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM atendentes a
    INNER JOIN usuarios u ON u.id = a.usuario_id
    WHERE a.id = atendente_skills.atendente_id
    AND u.estabelecimento_id IN (
      SELECT estabelecimento_id FROM usuarios WHERE id = auth.uid()
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
    SELECT 1 FROM atendentes a
    INNER JOIN usuarios u ON u.id = a.usuario_id
    WHERE a.id = atendente_skills.atendente_id
    AND u.estabelecimento_id IN (
      SELECT estabelecimento_id FROM usuarios WHERE id = auth.uid()
    )
  )
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'gestor'::app_role) 
    OR NOT roles_present()
  )
);

-- Permitir que usuários vejam skills de atendentes do mesmo estabelecimento
CREATE POLICY "Usuários podem ver skills de atendentes"
ON atendente_skills
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM atendentes a
    INNER JOIN usuarios u ON u.id = a.usuario_id
    WHERE a.id = atendente_skills.atendente_id
    AND u.estabelecimento_id IN (
      SELECT estabelecimento_id FROM usuarios WHERE id = auth.uid()
    )
  )
);