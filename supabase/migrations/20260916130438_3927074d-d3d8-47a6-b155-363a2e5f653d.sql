-- SMS
DROP POLICY IF EXISTS "sms_config_tenant_scoped" ON public.sms_config;
CREATE POLICY "sms_config_admin_gestor" ON public.sms_config
  FOR ALL TO authenticated
  USING (
    (estabelecimento_id = public.get_auth_user_estabelecimento_id()
      AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor')))
    OR EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = auth.uid())
  )
  WITH CHECK (
    (estabelecimento_id = public.get_auth_user_estabelecimento_id()
      AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor')))
    OR EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = auth.uid())
  );

-- Pedágio
DROP POLICY IF EXISTS "Users can view their establishment's toll config" ON public.pedagio_api_config;
DROP POLICY IF EXISTS "Users can insert toll config for their establishment" ON public.pedagio_api_config;
DROP POLICY IF EXISTS "Users can update toll config for their establishment" ON public.pedagio_api_config;
DROP POLICY IF EXISTS "Users can delete toll config for their establishment" ON public.pedagio_api_config;
CREATE POLICY "pedagio_config_admin_gestor" ON public.pedagio_api_config
  FOR ALL TO authenticated
  USING (
    (public.user_in_estabelecimento(estabelecimento_id)
      AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor')))
    OR EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = auth.uid())
  )
  WITH CHECK (
    (public.user_in_estabelecimento(estabelecimento_id)
      AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor')))
    OR EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = auth.uid())
  );

-- Frete de terceiros
DROP POLICY IF EXISTS "Users can view own frete config" ON public.frete_terceiros_config;
DROP POLICY IF EXISTS "Users can insert own frete config" ON public.frete_terceiros_config;
DROP POLICY IF EXISTS "Users can update own frete config" ON public.frete_terceiros_config;
DROP POLICY IF EXISTS "Users can delete own frete config" ON public.frete_terceiros_config;
CREATE POLICY "frete_config_admin_gestor" ON public.frete_terceiros_config
  FOR ALL TO authenticated
  USING (
    public.user_in_estabelecimento(estabelecimento_id)
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'))
  )
  WITH CHECK (
    public.user_in_estabelecimento(estabelecimento_id)
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'))
  );

-- Redes sociais
DROP POLICY IF EXISTS "Usuários do estabelecimento veem suas credenciais" ON public.social_media_credentials;
DROP POLICY IF EXISTS "Usuários do estabelecimento inserem credenciais" ON public.social_media_credentials;
DROP POLICY IF EXISTS "Usuários do estabelecimento atualizam credenciais" ON public.social_media_credentials;
DROP POLICY IF EXISTS "Usuários do estabelecimento removem credenciais" ON public.social_media_credentials;
CREATE POLICY "social_credentials_admin_gestor" ON public.social_media_credentials
  FOR ALL TO authenticated
  USING (
    estabelecimento_id = public.get_auth_user_estabelecimento_id()
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'))
  )
  WITH CHECK (
    estabelecimento_id = public.get_auth_user_estabelecimento_id()
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'))
  );

-- Fontes de licitações
DROP POLICY IF EXISTS "licitacoes_fontes tenant" ON public.licitacoes_fontes;
CREATE POLICY "licitacoes_fontes_admin_gestor" ON public.licitacoes_fontes
  FOR ALL TO authenticated
  USING (
    public.user_in_estabelecimento(estabelecimento_id)
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'))
  )
  WITH CHECK (
    public.user_in_estabelecimento(estabelecimento_id)
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'))
  );