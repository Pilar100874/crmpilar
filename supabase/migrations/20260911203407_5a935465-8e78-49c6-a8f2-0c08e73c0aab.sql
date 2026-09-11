DROP POLICY IF EXISTS "push_notifications_log_tenant_select" ON public.push_notifications_log;
CREATE POLICY "push_notifications_log_tenant_select"
ON public.push_notifications_log
FOR SELECT TO authenticated
USING (
  (estabelecimento_id IS NOT NULL AND estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()))
  OR EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = auth.uid())
);