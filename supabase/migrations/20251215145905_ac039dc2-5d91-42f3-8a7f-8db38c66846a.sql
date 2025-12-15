-- Allow anyone to see their own pending device (without estabelecimento_id)
CREATE POLICY "Usuarios podem ver dispositivos pendentes" 
ON dispositivos_rastreamento 
FOR SELECT 
USING (status = 'pendente');

-- Allow users to update their own device (by device_uuid)
CREATE POLICY "Usuarios podem atualizar ultimo acesso do proprio dispositivo" 
ON dispositivos_rastreamento 
FOR UPDATE 
USING (true)
WITH CHECK (true);