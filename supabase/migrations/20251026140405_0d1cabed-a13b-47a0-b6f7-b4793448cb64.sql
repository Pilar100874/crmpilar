-- Simplificar política de INSERT para funil_stages
DROP POLICY IF EXISTS "Insert stages (same estab or admin or admin_email)" ON public.funil_stages;

-- Nova política simplificada que permite inserção para admins via email
CREATE POLICY "Insert stages (admin email bypass)"
ON public.funil_stages FOR INSERT
TO authenticated
WITH CHECK (
  -- Permite se o email é admin
  ((auth.jwt() ->> 'email') ILIKE 'admin_%@sistema.local')
  OR
  -- Ou se é um admin na tabela administradores
  (EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
  OR
  -- Ou se o funil pertence ao estabelecimento do usuário e ele tem role apropriada
  EXISTS (
    SELECT 1 FROM public.funis f
    WHERE f.id = funil_stages.funil_id
    AND f.estabelecimento_id = public.get_user_estabelecimento_id(auth.uid())
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'gestor'::public.app_role)
    )
  )
);