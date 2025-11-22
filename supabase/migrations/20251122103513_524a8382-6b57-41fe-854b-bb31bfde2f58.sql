-- Corrigir políticas da tabela usuarios para evitar recursão infinita

DROP POLICY IF EXISTS "Admins have full access to usuarios" ON public.usuarios;
DROP POLICY IF EXISTS "Users can view usuarios in their estabelecimento" ON public.usuarios;
DROP POLICY IF EXISTS "Gestores can manage usuarios" ON public.usuarios;

-- Política 1: Admins têm acesso total
CREATE POLICY "Admins have full access to usuarios"
ON public.usuarios
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Política 2: Usuários podem ver usuarios do mesmo estabelecimento (usando função definer)
CREATE POLICY "Users can view usuarios in their estabelecimento"
ON public.usuarios
FOR SELECT
TO authenticated
USING (
  estabelecimento_id = public.get_user_estabelecimento_id(auth.uid())
);

-- Política 3: Gestores podem gerenciar usuarios do mesmo estabelecimento
CREATE POLICY "Gestores can manage usuarios in their estabelecimento"
ON public.usuarios
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'gestor'::app_role)
  AND estabelecimento_id = public.get_user_estabelecimento_id(auth.uid())
)
WITH CHECK (
  public.has_role(auth.uid(), 'gestor'::app_role)
  AND estabelecimento_id = public.get_user_estabelecimento_id(auth.uid())
);

-- Política 4: Permitir operações durante inicialização (quando não há roles ainda)
CREATE POLICY "Allow operations during initialization"
ON public.usuarios
FOR ALL
TO authenticated
USING (NOT public.roles_present())
WITH CHECK (NOT public.roles_present());