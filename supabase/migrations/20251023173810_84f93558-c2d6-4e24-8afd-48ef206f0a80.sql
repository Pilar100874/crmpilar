-- Add estabelecimento_id to database_connections if not exists
ALTER TABLE public.database_connections
ADD COLUMN IF NOT EXISTS estabelecimento_id uuid REFERENCES public.estabelecimentos(id);

-- Update RLS policies for database_connections to filter by estabelecimento
DROP POLICY IF EXISTS "Authenticated users can view database connections" ON public.database_connections;
DROP POLICY IF EXISTS "Users can manage database connections" ON public.database_connections;

-- View policy
CREATE POLICY "View database connections (init or same estab)"
ON public.database_connections
FOR SELECT
USING (
  NOT public.roles_present()
  OR EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = auth.uid())
  OR (
    estabelecimento_id IN (
      SELECT u.estabelecimento_id FROM public.usuarios u WHERE u.id = auth.uid()
    )
  )
);

-- Manage policy
CREATE POLICY "Manage database connections (init or permitted)"
ON public.database_connections
FOR ALL
USING (
  NOT public.roles_present()
  OR EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = auth.uid())
  OR (
    (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'gestor'::app_role))
    AND estabelecimento_id IN (
      SELECT u.estabelecimento_id FROM public.usuarios u WHERE u.id = auth.uid()
    )
  )
)
WITH CHECK (
  NOT public.roles_present()
  OR EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = auth.uid())
  OR (
    (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'gestor'::app_role))
    AND estabelecimento_id IN (
      SELECT u.estabelecimento_id FROM public.usuarios u WHERE u.id = auth.uid()
    )
  )
);