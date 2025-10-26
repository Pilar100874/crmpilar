-- Drop and recreate all funis policies with admin email pattern support

-- Primeiro remover todas as políticas existentes de funis
DO $$
BEGIN
  -- Remove all existing policies for funis
  DROP POLICY IF EXISTS "Insert funis (same estab or admin)" ON public.funis;
  DROP POLICY IF EXISTS "Insert funis (same estab or admin or admin_email)" ON public.funis;
  DROP POLICY IF EXISTS "Delete funis from same estabelecimento" ON public.funis;
  DROP POLICY IF EXISTS "Update funis from same estabelecimento" ON public.funis;
  DROP POLICY IF EXISTS "View funis from same estabelecimento" ON public.funis;
END $$;

-- Nova política que reconhece admins por email pattern
CREATE POLICY "View funis (same estab or admin)"
ON public.funis FOR SELECT
TO authenticated
USING (
  (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()))
  OR (EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
  OR ((auth.jwt() ->> 'email') ILIKE 'admin_%@sistema.local')
);

CREATE POLICY "Insert funis (admin email or estab)"
ON public.funis FOR INSERT
TO authenticated
WITH CHECK (
  ((auth.jwt() ->> 'email') ILIKE 'admin_%@sistema.local')
  OR (EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
  OR (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()) 
      AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'gestor'::public.app_role)))
);

CREATE POLICY "Update funis (admin email or estab)"
ON public.funis FOR UPDATE
TO authenticated
USING (
  ((auth.jwt() ->> 'email') ILIKE 'admin_%@sistema.local')
  OR (EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
  OR (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()) 
      AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'gestor'::public.app_role)))
)
WITH CHECK (
  ((auth.jwt() ->> 'email') ILIKE 'admin_%@sistema.local')
  OR (EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
  OR (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()) 
      AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'gestor'::public.app_role)))
);

CREATE POLICY "Delete funis (admin email or estab)"
ON public.funis FOR DELETE
TO authenticated
USING (
  ((auth.jwt() ->> 'email') ILIKE 'admin_%@sistema.local')
  OR (EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
  OR (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()) 
      AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'gestor'::public.app_role)))
);