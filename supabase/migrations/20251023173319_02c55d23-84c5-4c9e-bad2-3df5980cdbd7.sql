-- Relax global quick_attachments manage policy for initial setup while preserving role checks
DROP POLICY IF EXISTS "Users can manage global quick attachments from same estabelecim" ON public.quick_attachments;

CREATE POLICY "Users can manage global quick attachments (init or permitted)"
ON public.quick_attachments
FOR ALL
USING (
  (
    is_global = true AND (
      -- Allow during initial setup (no roles created yet)
      NOT public.roles_present()
      OR EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = auth.uid())
      OR (
        (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'gestor'::app_role))
        AND estabelecimento_id IN (
          SELECT u.estabelecimento_id FROM public.usuarios u WHERE u.id = auth.uid()
        )
      )
    )
  )
  OR 
  -- Preserve ability for users to manage their own non-global attachments
  ((user_id = auth.uid()) AND (is_global = false))
)
WITH CHECK (
  (
    is_global = true AND (
      NOT public.roles_present()
      OR EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = auth.uid())
      OR (
        (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'gestor'::app_role))
        AND estabelecimento_id IN (
          SELECT u.estabelecimento_id FROM public.usuarios u WHERE u.id = auth.uid()
        )
      )
    )
  )
  OR 
  ((user_id = auth.uid()) AND (is_global = false))
);
