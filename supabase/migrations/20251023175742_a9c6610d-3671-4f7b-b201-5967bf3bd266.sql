-- Fix RLS for notificacoes_config to allow initial setup and proper admin/gestor access
-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage notificacoes from same estabelecimento" ON public.notificacoes_config;
DROP POLICY IF EXISTS "Users can view notificacoes from same estabelecimento" ON public.notificacoes_config;

-- Ensure RLS is enabled
ALTER TABLE public.notificacoes_config ENABLE ROW LEVEL SECURITY;

-- Create improved manage policy (insert/update/delete)
CREATE POLICY "Manage notificacoes (init or same estab)"
ON public.notificacoes_config
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
CREATE POLICY "View notificacoes (init or same estab)"
ON public.notificacoes_config
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