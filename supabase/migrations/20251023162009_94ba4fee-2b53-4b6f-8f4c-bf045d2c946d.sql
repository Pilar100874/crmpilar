-- Adjust RLS to allow inserts/updates for same estabelecimento with role, and bootstrap when no roles exist

-- redes_sociais
DROP POLICY IF EXISTS "Users can manage redes sociais from same estabelecimento" ON public.redes_sociais;
CREATE POLICY "Users can manage redes sociais from same estabelecimento"
ON public.redes_sociais
FOR ALL
USING (
  (
    estabelecimento_id = public.get_user_estabelecimento_id(auth.uid())
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'gestor'::app_role))
  )
  OR NOT public.roles_present()
)
WITH CHECK (
  (
    estabelecimento_id = public.get_user_estabelecimento_id(auth.uid())
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'gestor'::app_role))
  )
  OR NOT public.roles_present()
);

-- unidades
DROP POLICY IF EXISTS "Users can manage unidades from same estabelecimento" ON public.unidades;
CREATE POLICY "Users can manage unidades from same estabelecimento"
ON public.unidades
FOR ALL
USING (
  (
    estabelecimento_id = public.get_user_estabelecimento_id(auth.uid())
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'gestor'::app_role))
  )
  OR NOT public.roles_present()
)
WITH CHECK (
  (
    estabelecimento_id = public.get_user_estabelecimento_id(auth.uid())
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'gestor'::app_role))
  )
  OR NOT public.roles_present()
);

-- segmentos
DROP POLICY IF EXISTS "Users can manage segmentos from same estabelecimento" ON public.segmentos;
CREATE POLICY "Users can manage segmentos from same estabelecimento"
ON public.segmentos
FOR ALL
USING (
  (
    estabelecimento_id = public.get_user_estabelecimento_id(auth.uid())
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'gestor'::app_role))
  )
  OR NOT public.roles_present()
)
WITH CHECK (
  (
    estabelecimento_id = public.get_user_estabelecimento_id(auth.uid())
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'gestor'::app_role))
  )
  OR NOT public.roles_present()
);