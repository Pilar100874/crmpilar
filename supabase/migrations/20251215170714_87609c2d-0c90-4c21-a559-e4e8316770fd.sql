-- Allow device app to update ultimo_acesso by device_uuid
CREATE POLICY "App pode atualizar ultimo_acesso do dispositivo"
ON public.dispositivos_rastreamento
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);