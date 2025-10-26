-- Strengthen funis and funil_stages policies to cover admin emails pattern

-- FUNIS INSERT
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'funis' AND policyname = 'Insert funis (same estab or admin)'
  ) THEN
    DROP POLICY "Insert funis (same estab or admin)" ON public.funis;
  END IF;
END $$;

CREATE POLICY "Insert funis (same estab or admin or admin_email)"
ON public.funis
FOR INSERT
TO authenticated
WITH CHECK (
  (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()))
  OR (EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = auth.uid()))
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'gestor'::public.app_role)
  OR (auth.jwt() ->> 'email') ILIKE 'admin_%@sistema.local'
);

-- FUNIL_STAGES INSERT/UPDATE/DELETE use same admin email bypass
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'funil_stages' AND policyname = 'Insert stages in same estabelecimento'
  ) THEN
    DROP POLICY "Insert stages in same estabelecimento" ON public.funil_stages;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'funil_stages' AND policyname = 'Update stages in same estabelecimento'
  ) THEN
    DROP POLICY "Update stages in same estabelecimento" ON public.funil_stages;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'funil_stages' AND policyname = 'Delete stages in same estabelecimento'
  ) THEN
    DROP POLICY "Delete stages in same estabelecimento" ON public.funil_stages;
  END IF;
END $$;

CREATE POLICY "Insert stages (same estab or admin or admin_email)"
ON public.funil_stages
FOR INSERT
TO authenticated
WITH CHECK (
  (funil_id IN (
    SELECT f.id FROM public.funis f
    WHERE f.id = funil_id AND (
      f.estabelecimento_id = public.get_user_estabelecimento_id(auth.uid())
      OR (EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = auth.uid()))
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'gestor'::public.app_role)
      OR (auth.jwt() ->> 'email') ILIKE 'admin_%@sistema.local'
    )
  ))
);

CREATE POLICY "Update stages (same estab or admin or admin_email)"
ON public.funil_stages
FOR UPDATE
TO authenticated
USING (
  funil_id IN (
    SELECT f.id FROM public.funis f
    WHERE f.id = funil_id AND (
      f.estabelecimento_id = public.get_user_estabelecimento_id(auth.uid())
      OR (EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = auth.uid()))
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'gestor'::public.app_role)
      OR (auth.jwt() ->> 'email') ILIKE 'admin_%@sistema.local'
    )
  )
)
WITH CHECK (
  funil_id IN (
    SELECT f.id FROM public.funis f
    WHERE f.id = funil_id AND (
      f.estabelecimento_id = public.get_user_estabelecimento_id(auth.uid())
      OR (EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = auth.uid()))
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'gestor'::public.app_role)
      OR (auth.jwt() ->> 'email') ILIKE 'admin_%@sistema.local'
    )
  )
);

CREATE POLICY "Delete stages (same estab or admin or admin_email)"
ON public.funil_stages
FOR DELETE
TO authenticated
USING (
  funil_id IN (
    SELECT f.id FROM public.funis f
    WHERE f.id = funil_id AND (
      f.estabelecimento_id = public.get_user_estabelecimento_id(auth.uid())
      OR (EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = auth.uid()))
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'gestor'::public.app_role)
      OR (auth.jwt() ->> 'email') ILIKE 'admin_%@sistema.local'
    )
  )
);
