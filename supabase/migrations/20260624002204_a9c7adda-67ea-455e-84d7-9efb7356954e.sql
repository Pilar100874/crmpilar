
DROP POLICY IF EXISTS "ponto_dept tenant" ON public.ponto_departamentos;
CREATE POLICY "ponto_dept tenant" ON public.ponto_departamentos FOR ALL
USING (
  global = true
  OR EXISTS (SELECT 1 FROM ponto_empresas e WHERE e.id = ponto_departamentos.empresa_id AND e.estabelecimento_id = get_auth_user_estabelecimento_id())
)
WITH CHECK (
  (global = true AND empresa_id IS NULL)
  OR EXISTS (SELECT 1 FROM ponto_empresas e WHERE e.id = ponto_departamentos.empresa_id AND e.estabelecimento_id = get_auth_user_estabelecimento_id())
);

DROP POLICY IF EXISTS "ponto_cargos tenant" ON public.ponto_cargos;
CREATE POLICY "ponto_cargos tenant" ON public.ponto_cargos FOR ALL
USING (
  global = true
  OR EXISTS (SELECT 1 FROM ponto_empresas e WHERE e.id = ponto_cargos.empresa_id AND e.estabelecimento_id = get_auth_user_estabelecimento_id())
)
WITH CHECK (
  (global = true AND empresa_id IS NULL)
  OR EXISTS (SELECT 1 FROM ponto_empresas e WHERE e.id = ponto_cargos.empresa_id AND e.estabelecimento_id = get_auth_user_estabelecimento_id())
);

DROP POLICY IF EXISTS "ponto_equipes tenant" ON public.ponto_equipes;
CREATE POLICY "ponto_equipes tenant" ON public.ponto_equipes FOR ALL
USING (
  global = true
  OR EXISTS (SELECT 1 FROM ponto_empresas e WHERE e.id = ponto_equipes.empresa_id AND e.estabelecimento_id = get_auth_user_estabelecimento_id())
)
WITH CHECK (
  (global = true AND empresa_id IS NULL)
  OR EXISTS (SELECT 1 FROM ponto_empresas e WHERE e.id = ponto_equipes.empresa_id AND e.estabelecimento_id = get_auth_user_estabelecimento_id())
);
