-- 1) Redes autorizadas do ponto: escopo por empresa
DROP POLICY IF EXISTS "auth gerencia redes autorizadas" ON public.ponto_redes_autorizadas;
CREATE POLICY "Empresa gerencia redes autorizadas"
ON public.ponto_redes_autorizadas
FOR ALL
TO authenticated
USING (empresa_id IN (SELECT public.ponto_user_empresa_ids()))
WITH CHECK (empresa_id IN (SELECT public.ponto_user_empresa_ids()));

-- 2) Comandos de voz: admin apenas dentro do proprio estabelecimento
DROP POLICY IF EXISTS "Admins gerenciam comandos voz" ON public.assistente_voz_comandos;
CREATE POLICY "Admins gerenciam comandos voz do estabelecimento"
ON public.assistente_voz_comandos
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND estabelecimento_id = public.get_auth_user_estabelecimento_id()
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  AND estabelecimento_id = public.get_auth_user_estabelecimento_id()
);

DROP POLICY IF EXISTS "Usuarios do estab veem comandos voz" ON public.assistente_voz_comandos;
CREATE POLICY "Usuarios do estab veem comandos voz"
ON public.assistente_voz_comandos
FOR SELECT
TO authenticated
USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());

-- 3) Segredos de apps de anuncios: somente admin/gestor do estabelecimento
DROP POLICY IF EXISTS "Ads apps do estabelecimento" ON public.ads_platform_apps;
CREATE POLICY "Admins gerenciam ads apps do estabelecimento"
ON public.ads_platform_apps
FOR ALL
TO authenticated
USING (
  estabelecimento_id = public.get_auth_user_estabelecimento_id()
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role))
)
WITH CHECK (
  estabelecimento_id = public.get_auth_user_estabelecimento_id()
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role))
);

-- 4) Credenciais n8n: somente admin/gestor do estabelecimento
DROP POLICY IF EXISTS "Estab manage n8n credenciais" ON public.n8n_credenciais;
CREATE POLICY "Admins gerenciam n8n credenciais"
ON public.n8n_credenciais
FOR ALL
TO authenticated
USING (
  estabelecimento_id = public.get_user_estabelecimento_id(auth.uid())
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role))
)
WITH CHECK (
  estabelecimento_id = public.get_user_estabelecimento_id(auth.uid())
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role))
);

-- 5) Fim do fail-open: papeis ausentes passam a negar acesso
CREATE OR REPLACE FUNCTION public.roles_present()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT true;
$function$;

CREATE OR REPLACE FUNCTION public.port_is_gestor(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT _user_id IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.port_user_roles WHERE user_id = _user_id AND role IN ('super_admin','admin'))
    OR EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = _user_id)
  )
$function$;

CREATE OR REPLACE FUNCTION public.port_is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT _user_id IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.port_user_roles WHERE user_id = _user_id AND role IN ('super_admin','admin','porteiro'))
    OR EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = _user_id)
  )
$function$;