-- Drop existing SELECT policies
DROP POLICY IF EXISTS "Admins podem ver todos os dispositivos" ON dispositivos_rastreamento;
DROP POLICY IF EXISTS "Usuarios podem ver dispositivos do seu estabelecimento" ON dispositivos_rastreamento;
DROP POLICY IF EXISTS "Usuarios podem ver dispositivos pendentes" ON dispositivos_rastreamento;

-- Create new SELECT policy that allows:
-- 1. System admins to see all devices
-- 2. Users to see devices from their establishment
-- 3. ALL users to see pending devices (for approval workflow)
CREATE POLICY "Admins podem ver todos os dispositivos" 
ON dispositivos_rastreamento 
FOR SELECT 
USING (is_system_admin());

CREATE POLICY "Usuarios podem ver dispositivos do seu estabelecimento" 
ON dispositivos_rastreamento 
FOR SELECT 
USING (estabelecimento_id = get_auth_user_estabelecimento_id());

CREATE POLICY "Usuarios autenticados podem ver dispositivos pendentes sem estabelecimento" 
ON dispositivos_rastreamento 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND estabelecimento_id IS NULL 
  AND status = 'pendente'
);

-- Also fix UPDATE policy to allow users to update devices they can see (for approval)
DROP POLICY IF EXISTS "Admins podem atualizar qualquer dispositivo" ON dispositivos_rastreamento;
DROP POLICY IF EXISTS "Usuarios podem atualizar dispositivos do seu estabelecimento" ON dispositivos_rastreamento;
DROP POLICY IF EXISTS "Usuarios podem atualizar ultimo acesso do proprio dispositivo" ON dispositivos_rastreamento;

CREATE POLICY "Admins podem atualizar qualquer dispositivo" 
ON dispositivos_rastreamento 
FOR UPDATE 
USING (is_system_admin());

CREATE POLICY "Usuarios podem atualizar dispositivos do seu estabelecimento" 
ON dispositivos_rastreamento 
FOR UPDATE 
USING (estabelecimento_id = get_auth_user_estabelecimento_id());

-- Allow users to update pending devices without estabelecimento (for approval/linking)
CREATE POLICY "Usuarios autenticados podem aprovar dispositivos pendentes" 
ON dispositivos_rastreamento 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL 
  AND estabelecimento_id IS NULL 
  AND status = 'pendente'
)
WITH CHECK (true);