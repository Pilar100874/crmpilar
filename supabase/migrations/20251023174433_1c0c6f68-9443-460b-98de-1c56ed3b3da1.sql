-- Adjust webhooks RLS policies for initial setup and better permissions
DROP POLICY IF EXISTS "Users can manage webhooks from same estabelecimento" ON public.webhooks;

CREATE POLICY "Manage webhooks (init or same estab)"
ON public.webhooks
FOR ALL
USING (
  NOT public.roles_present()
  OR EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = auth.uid())
  OR (
    (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'gestor'::app_role))
    AND estabelecimento_id IN (
      SELECT u.estabelecimento_id FROM public.usuarios u WHERE u.id = auth.uid()
    )
  )
)
WITH CHECK (
  NOT public.roles_present()
  OR EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = auth.uid())
  OR (
    (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'gestor'::app_role))
    AND estabelecimento_id IN (
      SELECT u.estabelecimento_id FROM public.usuarios u WHERE u.id = auth.uid()
    )
  )
);