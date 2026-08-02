
-- Função RBAC: quem pode gerenciar credenciais da organização
CREATE OR REPLACE FUNCTION public.aip_pode_gerenciar_credenciais()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_system_admin()
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'gestor'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.aip_permissions p
      WHERE p.recurso_tipo = 'credencial'
        AND p.estabelecimento_id = public.get_auth_user_estabelecimento_id()
        AND (p.usuario_id = auth.uid() OR p.usuario_id IS NULL)
        AND ('gerenciar' = ANY(p.acoes) OR 'admin' = ANY(p.acoes))
    );
$$;

CREATE TABLE public.aip_credenciais (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id uuid NOT NULL,
  provedor text NOT NULL,
  nome text NOT NULL,
  descricao text,
  ambiente text NOT NULL DEFAULT 'producao',
  dados jsonb NOT NULL DEFAULT '{}'::jsonb,
  segredo_cifrado text,
  mascara text,
  versao integer NOT NULL DEFAULT 1,
  rotacionado_em timestamptz,
  rotacionado_por uuid,
  rotacao_dias integer,
  expira_em timestamptz,
  ultimo_uso timestamptz,
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT aip_credenciais_provedor_chk CHECK (
    provedor IN ('playwright','remotion','higgsfield','claude_code','outro')
  ),
  CONSTRAINT aip_credenciais_ambiente_chk CHECK (ambiente IN ('producao','homologacao','desenvolvimento')),
  CONSTRAINT aip_credenciais_unica UNIQUE (estabelecimento_id, provedor, nome, ambiente)
);

CREATE INDEX idx_aip_credenciais_estab ON public.aip_credenciais(estabelecimento_id, provedor);

CREATE TABLE public.aip_credencial_versoes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  credencial_id uuid NOT NULL REFERENCES public.aip_credenciais(id) ON DELETE CASCADE,
  estabelecimento_id uuid NOT NULL,
  versao integer NOT NULL,
  mascara text,
  segredo_cifrado text,
  motivo text,
  criado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_aip_cred_versoes_cred ON public.aip_credencial_versoes(credencial_id, versao DESC);

-- Grants: o app nunca lê as colunas de segredo
GRANT SELECT (id, estabelecimento_id, provedor, nome, descricao, ambiente, dados, mascara,
              versao, rotacionado_em, rotacionado_por, rotacao_dias, expira_em, ultimo_uso,
              ativo, created_by, created_at, updated_at)
  ON public.aip_credenciais TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.aip_credenciais TO authenticated;
GRANT ALL ON public.aip_credenciais TO service_role;

GRANT SELECT (id, credencial_id, estabelecimento_id, versao, mascara, motivo, criado_por, created_at)
  ON public.aip_credencial_versoes TO authenticated;
GRANT ALL ON public.aip_credencial_versoes TO service_role;

ALTER TABLE public.aip_credenciais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aip_credencial_versoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "aip_credenciais_select_tenant" ON public.aip_credenciais
  FOR SELECT TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR public.is_system_admin());

CREATE POLICY "aip_credenciais_insert_rbac" ON public.aip_credenciais
  FOR INSERT TO authenticated
  WITH CHECK (
    (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR public.is_system_admin())
    AND public.aip_pode_gerenciar_credenciais()
  );

CREATE POLICY "aip_credenciais_update_rbac" ON public.aip_credenciais
  FOR UPDATE TO authenticated
  USING (
    (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR public.is_system_admin())
    AND public.aip_pode_gerenciar_credenciais()
  )
  WITH CHECK (
    (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR public.is_system_admin())
    AND public.aip_pode_gerenciar_credenciais()
  );

CREATE POLICY "aip_credenciais_delete_rbac" ON public.aip_credenciais
  FOR DELETE TO authenticated
  USING (
    (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR public.is_system_admin())
    AND public.aip_pode_gerenciar_credenciais()
  );

CREATE POLICY "aip_credencial_versoes_select_tenant" ON public.aip_credencial_versoes
  FOR SELECT TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR public.is_system_admin());

CREATE TRIGGER trg_aip_credenciais_upd BEFORE UPDATE ON public.aip_credenciais
  FOR EACH ROW EXECUTE FUNCTION public.aip_touch_updated_at();

-- Auditoria automática
CREATE OR REPLACE FUNCTION public.aip_credenciais_auditar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_row public.aip_credenciais;
BEGIN
  v_row := COALESCE(NEW, OLD);
  INSERT INTO public.aip_audit_log (estabelecimento_id, usuario_id, acao, recurso_tipo, recurso_id, detalhes)
  VALUES (
    v_row.estabelecimento_id,
    auth.uid(),
    'credencial_' || lower(TG_OP),
    'credencial',
    v_row.id,
    jsonb_build_object('provedor', v_row.provedor, 'nome', v_row.nome, 'versao', v_row.versao)
  );
  RETURN v_row;
END;
$$;

CREATE TRIGGER trg_aip_credenciais_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.aip_credenciais
  FOR EACH ROW EXECUTE FUNCTION public.aip_credenciais_auditar();
