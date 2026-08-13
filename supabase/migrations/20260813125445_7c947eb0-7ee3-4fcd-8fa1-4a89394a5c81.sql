ALTER TABLE public.broadcast_monitor ADD COLUMN IF NOT EXISTS pausado_em timestamptz;
GRANT UPDATE ON public.broadcast_monitor TO authenticated;
DROP POLICY IF EXISTS "broadcast_monitor_update_tenant" ON public.broadcast_monitor;
CREATE POLICY "broadcast_monitor_update_tenant" ON public.broadcast_monitor
FOR UPDATE TO authenticated
USING (estabelecimento_id = get_auth_user_estabelecimento_id())
WITH CHECK (estabelecimento_id = get_auth_user_estabelecimento_id());