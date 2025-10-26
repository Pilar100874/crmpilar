-- Atualizar políticas de UPDATE e DELETE para funil_stages com mesmo padrão
DROP POLICY IF EXISTS "Update stages (same estab or admin or admin_email)" ON public.funil_stages;
DROP POLICY IF EXISTS "Delete stages (same estab or admin or admin_email)" ON public.funil_stages;

CREATE POLICY "Update stages (admin email bypass)"
ON public.funil_stages FOR UPDATE
TO authenticated
USING (
  ((auth.jwt() ->> 'email') ILIKE 'admin_%@sistema.local')
  OR (EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.funis f
    WHERE f.id = funil_stages.funil_id
    AND f.estabelecimento_id = public.get_user_estabelecimento_id(auth.uid())
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'gestor'::public.app_role)
    )
  )
)
WITH CHECK (
  ((auth.jwt() ->> 'email') ILIKE 'admin_%@sistema.local')
  OR (EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.funis f
    WHERE f.id = funil_stages.funil_id
    AND f.estabelecimento_id = public.get_user_estabelecimento_id(auth.uid())
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'gestor'::public.app_role)
    )
  )
);

CREATE POLICY "Delete stages (admin email bypass)"
ON public.funil_stages FOR DELETE
TO authenticated
USING (
  ((auth.jwt() ->> 'email') ILIKE 'admin_%@sistema.local')
  OR (EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.funis f
    WHERE f.id = funil_stages.funil_id
    AND f.estabelecimento_id = public.get_user_estabelecimento_id(auth.uid())
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'gestor'::public.app_role)
    )
  )
);