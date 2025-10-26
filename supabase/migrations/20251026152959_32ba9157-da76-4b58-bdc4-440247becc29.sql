-- Add admin email bypass to bot_flows policies for INSERT
DROP POLICY IF EXISTS "Manage bot flows (same estab admin/gestor or admin)" ON public.bot_flows;

CREATE POLICY "Insert bot flows (admin email bypass)"
ON public.bot_flows
FOR INSERT
TO authenticated
WITH CHECK (
  (auth.jwt() ->> 'email'::text) ILIKE 'admin_%@sistema.local'
  OR (EXISTS (SELECT 1 FROM administradores WHERE administradores.id = auth.uid()))
  OR (
    estabelecimento_id = get_user_estabelecimento_id(auth.uid())
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role))
  )
);

CREATE POLICY "Update bot flows (admin email bypass)"
ON public.bot_flows
FOR UPDATE
TO authenticated
USING (
  (auth.jwt() ->> 'email'::text) ILIKE 'admin_%@sistema.local'
  OR (EXISTS (SELECT 1 FROM administradores WHERE administradores.id = auth.uid()))
  OR (
    estabelecimento_id = get_user_estabelecimento_id(auth.uid())
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role))
  )
)
WITH CHECK (
  (auth.jwt() ->> 'email'::text) ILIKE 'admin_%@sistema.local'
  OR (EXISTS (SELECT 1 FROM administradores WHERE administradores.id = auth.uid()))
  OR (
    estabelecimento_id = get_user_estabelecimento_id(auth.uid())
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role))
  )
);

CREATE POLICY "Delete bot flows (admin email bypass)"
ON public.bot_flows
FOR DELETE
TO authenticated
USING (
  (auth.jwt() ->> 'email'::text) ILIKE 'admin_%@sistema.local'
  OR (EXISTS (SELECT 1 FROM administradores WHERE administradores.id = auth.uid()))
  OR (
    estabelecimento_id = get_user_estabelecimento_id(auth.uid())
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role))
  )
);