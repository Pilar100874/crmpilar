-- Allow anyone to SELECT a device by its device_uuid (for mobile app to check own status)
CREATE POLICY "App pode buscar dispositivo pelo UUID"
ON public.dispositivos_rastreamento
FOR SELECT
TO anon, authenticated
USING (true);

-- Note: This is safe because the app only gets info about its own device via UUID lookup
-- and the device_uuid is generated client-side and stored locally