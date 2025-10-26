-- Fix RLS to allow creating funis for admins or users from the same estabelecimento
alter table public.funis enable row level security;

-- Drop existing overly-permissive/incorrect insert policy if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'funis' AND policyname = 'Insert funis (authenticated)'
  ) THEN
    DROP POLICY "Insert funis (authenticated)" ON public.funis;
  END IF;
END $$;

-- Create precise insert policy: same estabelecimento OR admin/gestor
CREATE POLICY "Insert funis (same estab or admin)"
ON public.funis
FOR INSERT
TO authenticated
WITH CHECK (
  (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()))
  OR (EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = auth.uid()))
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'gestor'::public.app_role)
);
