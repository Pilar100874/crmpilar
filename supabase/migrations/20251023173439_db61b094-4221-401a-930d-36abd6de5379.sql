-- Broaden global manage policies to allow users from same estabelecimento (not only admin/gestor)
-- QUICK ATTACHMENTS
DROP POLICY IF EXISTS "Users can manage global quick attachments (init or permitted)" ON public.quick_attachments;

CREATE POLICY "Manage global quick attachments (same estab or init/admin)"
ON public.quick_attachments
FOR ALL
USING (
  (
    is_global = true AND (
      NOT public.roles_present()
      OR EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = auth.uid())
      OR (
        estabelecimento_id IN (
          SELECT u.estabelecimento_id FROM public.usuarios u WHERE u.id = auth.uid()
        )
      )
    )
  )
  OR ((user_id = auth.uid()) AND (is_global = false))
)
WITH CHECK (
  (
    is_global = true AND (
      NOT public.roles_present()
      OR EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = auth.uid())
      OR (
        estabelecimento_id IN (
          SELECT u.estabelecimento_id FROM public.usuarios u WHERE u.id = auth.uid()
        )
      )
    )
  )
  OR ((user_id = auth.uid()) AND (is_global = false))
);

-- QUICK REPLIES
DROP POLICY IF EXISTS "Users can manage global quick replies (init or permitted)" ON public.quick_replies;

CREATE POLICY "Manage global quick replies (same estab or init/admin)"
ON public.quick_replies
FOR ALL
USING (
  (
    is_global = true AND (
      NOT public.roles_present()
      OR EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = auth.uid())
      OR (
        estabelecimento_id IN (
          SELECT u.estabelecimento_id FROM public.usuarios u WHERE u.id = auth.uid()
        )
      )
    )
  )
  OR ((user_id = auth.uid()) AND (is_global = false))
)
WITH CHECK (
  (
    is_global = true AND (
      NOT public.roles_present()
      OR EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = auth.uid())
      OR (
        estabelecimento_id IN (
          SELECT u.estabelecimento_id FROM public.usuarios u WHERE u.id = auth.uid()
        )
      )
    )
  )
  OR ((user_id = auth.uid()) AND (is_global = false))
);