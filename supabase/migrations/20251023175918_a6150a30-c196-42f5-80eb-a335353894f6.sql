-- Fix RLS for seguranca_config to allow initial setup and proper admin/gestor access
-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage seguranca from same estabelecimento" ON public.seguranca_config;
DROP POLICY IF EXISTS "Users can view seguranca from same estabelecimento" ON public.seguranca_config;

-- Ensure RLS is enabled
ALTER TABLE public.seguranca_config ENABLE ROW LEVEL SECURITY;

-- Create improved manage policy (insert/update/delete)
CREATE POLICY "Manage seguranca (init or same estab)"
ON public.seguranca_config
FOR ALL
USING (
  (
    (
      estabelecimento_id IN (
        SELECT u.estabelecimento_id FROM public.usuarios u WHERE u.id = auth.uid()
      )
      AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'))
    )
    OR EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = auth.uid())
    OR NOT public.roles_present()
  )
)
WITH CHECK (
  (
    (
      estabelecimento_id IN (
        SELECT u.estabelecimento_id FROM public.usuarios u WHERE u.id = auth.uid()
      )
      AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'))
    )
    OR EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = auth.uid())
    OR NOT public.roles_present()
  )
);

-- Create improved select policy
CREATE POLICY "View seguranca (init or same estab)"
ON public.seguranca_config
FOR SELECT
USING (
  (
    estabelecimento_id IN (
      SELECT u.estabelecimento_id FROM public.usuarios u WHERE u.id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = auth.uid())
    OR NOT public.roles_present()
  )
);