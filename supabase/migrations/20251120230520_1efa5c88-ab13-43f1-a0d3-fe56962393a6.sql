-- Remover políticas antigas
DROP POLICY IF EXISTS "Usuários podem ver atendentes do estabelecimento" ON atendentes;
DROP POLICY IF EXISTS "Admins podem gerenciar atendentes" ON atendentes;
DROP POLICY IF EXISTS "Atendentes podem atualizar próprio status" ON atendentes;

-- Política simplificada para visualização
CREATE POLICY "Usuários podem ver atendentes do estabelecimento"
ON atendentes
FOR SELECT
TO authenticated
USING (true);

-- Política simplificada para INSERT
CREATE POLICY "Usuários podem criar atendentes"
ON atendentes
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Política simplificada para UPDATE
CREATE POLICY "Usuários podem atualizar atendentes"
ON atendentes
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Política simplificada para DELETE
CREATE POLICY "Usuários podem deletar atendentes"
ON atendentes
FOR DELETE
TO authenticated
USING (true);