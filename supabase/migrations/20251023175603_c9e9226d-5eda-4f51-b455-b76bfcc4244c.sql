-- Fix RLS for canais_atendimento to allow initial setup and proper admin/gestor access
-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage canais from same estabelecimento" ON public.canais_atendimento;
DROP POLICY IF EXISTS "Users can view canais from same estabelecimento" ON public.canais_atendimento;

-- Ensure RLS is enabled
ALTER TABLE public.canais_atendimento ENABLE ROW LEVEL SECURITY;

-- Create improved manage policy (insert/update/delete)
CREATE POLICY "Manage canais (init or same estab)"
ON public.canais_atendimento
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
CREATE POLICY "View canais (init or same estab)"
ON public.canais_atendimento
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
