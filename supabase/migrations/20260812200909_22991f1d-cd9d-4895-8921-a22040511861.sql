
-- Helper: empresas de ponto acessíveis ao usuário atual
CREATE OR REPLACE FUNCTION public.ponto_user_empresa_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT e.id FROM public.ponto_empresas e
  WHERE e.estabelecimento_id = public.get_auth_user_estabelecimento_id()
  UNION
  SELECT f.empresa_id FROM public.ponto_funcionarios f
  WHERE f.auth_user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.ponto_user_funcionario_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT f.id FROM public.ponto_funcionarios f
  WHERE f.empresa_id IN (SELECT public.ponto_user_empresa_ids())
     OR f.auth_user_id = auth.uid()
$$;

REVOKE ALL ON FUNCTION public.ponto_user_empresa_ids() FROM anon;
REVOKE ALL ON FUNCTION public.ponto_user_funcionario_ids() FROM anon;

-- 2FA e tokens de assinatura
DROP POLICY IF EXISTS "auth manage 2fa" ON public.ponto_aprovador_2fa;
CREATE POLICY "2fa tenant" ON public.ponto_aprovador_2fa FOR ALL TO authenticated
USING (usuario_id IN (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid()))
WITH CHECK (usuario_id IN (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "auth manage tokens" ON public.ponto_assinatura_tokens;
CREATE POLICY "assinatura tokens tenant" ON public.ponto_assinatura_tokens FOR ALL TO authenticated
USING (funcionario_id IN (SELECT public.ponto_user_funcionario_ids()))
WITH CHECK (funcionario_id IN (SELECT public.ponto_user_funcionario_ids()));

-- Kiosk e backups
DROP POLICY IF EXISTS "auth manage kiosk" ON public.ponto_kiosk_sessoes;
CREATE POLICY "kiosk tenant" ON public.ponto_kiosk_sessoes FOR ALL TO authenticated
USING (equipamento_id IN (SELECT id FROM public.ponto_equipamentos WHERE empresa_id IN (SELECT public.ponto_user_empresa_ids())))
WITH CHECK (equipamento_id IN (SELECT id FROM public.ponto_equipamentos WHERE empresa_id IN (SELECT public.ponto_user_empresa_ids())));

DROP POLICY IF EXISTS "auth manage backups" ON public.ponto_backups;
CREATE POLICY "backups tenant" ON public.ponto_backups FOR ALL TO authenticated
USING (empresa_id IN (SELECT public.ponto_user_empresa_ids()))
WITH CHECK (empresa_id IN (SELECT public.ponto_user_empresa_ids()));

-- Tabelas com empresa_id
DROP POLICY IF EXISTS "sobreaviso_all_auth" ON public.ponto_sobreaviso;
CREATE POLICY "sobreaviso tenant" ON public.ponto_sobreaviso FOR ALL TO authenticated
USING (empresa_id IN (SELECT public.ponto_user_empresa_ids()))
WITH CHECK (empresa_id IN (SELECT public.ponto_user_empresa_ids()));

DROP POLICY IF EXISTS "aprov_fluxo_all_auth" ON public.ponto_aprovacao_fluxo;
CREATE POLICY "aprov fluxo tenant" ON public.ponto_aprovacao_fluxo FOR ALL TO authenticated
USING (empresa_id IN (SELECT public.ponto_user_empresa_ids()))
WITH CHECK (empresa_id IN (SELECT public.ponto_user_empresa_ids()));

DROP POLICY IF EXISTS "aprov_regras_all_auth" ON public.ponto_aprovacao_regras;
CREATE POLICY "aprov regras tenant" ON public.ponto_aprovacao_regras FOR ALL TO authenticated
USING (empresa_id IN (SELECT public.ponto_user_empresa_ids()))
WITH CHECK (empresa_id IN (SELECT public.ponto_user_empresa_ids()));

DROP POLICY IF EXISTS "auth manage sug escala" ON public.ponto_escala_sugestoes;
CREATE POLICY "sug escala tenant" ON public.ponto_escala_sugestoes FOR ALL TO authenticated
USING (empresa_id IN (SELECT public.ponto_user_empresa_ids()))
WITH CHECK (empresa_id IN (SELECT public.ponto_user_empresa_ids()));

DROP POLICY IF EXISTS "auth gerencia geofences" ON public.ponto_geofences;
CREATE POLICY "geofences tenant" ON public.ponto_geofences FOR ALL TO authenticated
USING (empresa_id IN (SELECT public.ponto_user_empresa_ids()))
WITH CHECK (empresa_id IN (SELECT public.ponto_user_empresa_ids()));

DROP POLICY IF EXISTS "Auth manage compensacao acordos" ON public.ponto_compensacao_acordos;
CREATE POLICY "compensacao acordos tenant" ON public.ponto_compensacao_acordos FOR ALL TO authenticated
USING (empresa_id IN (SELECT public.ponto_user_empresa_ids()))
WITH CHECK (empresa_id IN (SELECT public.ponto_user_empresa_ids()));

-- Tabelas com funcionario_id
DROP POLICY IF EXISTS "auth manage predicoes" ON public.ponto_predicoes_ia;
CREATE POLICY "predicoes tenant" ON public.ponto_predicoes_ia FOR ALL TO authenticated
USING (funcionario_id IN (SELECT public.ponto_user_funcionario_ids()))
WITH CHECK (funcionario_id IN (SELECT public.ponto_user_funcionario_ids()));

DROP POLICY IF EXISTS "auth manage lgpd" ON public.ponto_lgpd_solicitacoes;
CREATE POLICY "lgpd tenant" ON public.ponto_lgpd_solicitacoes FOR ALL TO authenticated
USING (funcionario_id IN (SELECT public.ponto_user_funcionario_ids()))
WITH CHECK (funcionario_id IN (SELECT public.ponto_user_funcionario_ids()));

DROP POLICY IF EXISTS "auth manage own push" ON public.ponto_push_subscriptions;
CREATE POLICY "push subs tenant" ON public.ponto_push_subscriptions FOR ALL TO authenticated
USING (funcionario_id IN (SELECT public.ponto_user_funcionario_ids()))
WITH CHECK (funcionario_id IN (SELECT public.ponto_user_funcionario_ids()));

DROP POLICY IF EXISTS "metodos auth all" ON public.ponto_funcionario_metodos;
CREATE POLICY "metodos tenant" ON public.ponto_funcionario_metodos FOR ALL TO authenticated
USING (funcionario_id IN (SELECT public.ponto_user_funcionario_ids()))
WITH CHECK (funcionario_id IN (SELECT public.ponto_user_funcionario_ids()));

DROP POLICY IF EXISTS "func_geo auth all" ON public.ponto_funcionario_geofences;
CREATE POLICY "func geo tenant" ON public.ponto_funcionario_geofences FOR ALL TO authenticated
USING (funcionario_id IN (SELECT public.ponto_user_funcionario_ids()))
WITH CHECK (funcionario_id IN (SELECT public.ponto_user_funcionario_ids()));

DROP POLICY IF EXISTS "ponto_func_esc_hist_all" ON public.ponto_funcionario_escala_historico;
CREATE POLICY "func esc hist tenant" ON public.ponto_funcionario_escala_historico FOR ALL TO authenticated
USING (funcionario_id IN (SELECT public.ponto_user_funcionario_ids()))
WITH CHECK (funcionario_id IN (SELECT public.ponto_user_funcionario_ids()));

DROP POLICY IF EXISTS "auth manage anexos" ON public.ponto_anexos;
CREATE POLICY "anexos tenant" ON public.ponto_anexos FOR ALL TO authenticated
USING (funcionario_id IN (SELECT public.ponto_user_funcionario_ids()))
WITH CHECK (funcionario_id IN (SELECT public.ponto_user_funcionario_ids()));

DROP POLICY IF EXISTS "auth manage documentos" ON public.ponto_funcionario_documentos;
CREATE POLICY "documentos tenant" ON public.ponto_funcionario_documentos FOR ALL TO authenticated
USING (funcionario_id IN (SELECT public.ponto_user_funcionario_ids()))
WITH CHECK (funcionario_id IN (SELECT public.ponto_user_funcionario_ids()));

DROP POLICY IF EXISTS "auth manage dependentes" ON public.ponto_funcionario_dependentes;
CREATE POLICY "dependentes tenant" ON public.ponto_funcionario_dependentes FOR ALL TO authenticated
USING (funcionario_id IN (SELECT public.ponto_user_funcionario_ids()))
WITH CHECK (funcionario_id IN (SELECT public.ponto_user_funcionario_ids()));

DROP POLICY IF EXISTS "Auth manage compensacao participantes" ON public.ponto_compensacao_participantes;
CREATE POLICY "compensacao participantes tenant" ON public.ponto_compensacao_participantes FOR ALL TO authenticated
USING (funcionario_id IN (SELECT public.ponto_user_funcionario_ids()))
WITH CHECK (funcionario_id IN (SELECT public.ponto_user_funcionario_ids()));

DROP POLICY IF EXISTS "Auth manage compensacao votos" ON public.ponto_compensacao_votos;
CREATE POLICY "compensacao votos tenant" ON public.ponto_compensacao_votos FOR ALL TO authenticated
USING (funcionario_id IN (SELECT public.ponto_user_funcionario_ids()))
WITH CHECK (funcionario_id IN (SELECT public.ponto_user_funcionario_ids()));

-- eSocial fila: escopo pelo evento
DROP POLICY IF EXISTS "auth manage esocial fila" ON public.ponto_esocial_fila;
CREATE POLICY "esocial fila tenant" ON public.ponto_esocial_fila FOR ALL TO authenticated
USING (evento_id IN (SELECT id FROM public.ponto_esocial_eventos WHERE estabelecimento_id = public.get_auth_user_estabelecimento_id()))
WITH CHECK (evento_id IN (SELECT id FROM public.ponto_esocial_eventos WHERE estabelecimento_id = public.get_auth_user_estabelecimento_id()));

-- Acordos coletivos: leitura para usuários autenticados do tenant; escrita apenas admins
DROP POLICY IF EXISTS "auth manage cct" ON public.ponto_acordos_coletivos;
CREATE POLICY "cct select" ON public.ponto_acordos_coletivos FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.ponto_user_empresa_ids()));
CREATE POLICY "cct write admin" ON public.ponto_acordos_coletivos FOR ALL TO authenticated
USING (public.has_role((SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid() LIMIT 1), 'admin'))
WITH CHECK (public.has_role((SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid() LIMIT 1), 'admin'));

DROP POLICY IF EXISTS "auth manage cct vinc" ON public.ponto_acordos_vinculos;
CREATE POLICY "cct vinc select" ON public.ponto_acordos_vinculos FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.ponto_user_empresa_ids()));
CREATE POLICY "cct vinc write admin" ON public.ponto_acordos_vinculos FOR ALL TO authenticated
USING (public.has_role((SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid() LIMIT 1), 'admin'))
WITH CHECK (public.has_role((SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid() LIMIT 1), 'admin'));

-- Chat interno: só participantes podem inserir
DROP POLICY IF EXISTS "mensagens_insert" ON public.chat_interno_mensagens;
CREATE POLICY "mensagens_insert" ON public.chat_interno_mensagens FOR INSERT TO authenticated
WITH CHECK (
  conversa_id IN (SELECT public.get_user_conversation_ids(auth.uid()))
  AND remetente_id IN (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid())
);

-- Push log: inserts apenas via service_role
DROP POLICY IF EXISTS "Insert log" ON public.push_notifications_log;

-- Revogar execução anônima em funções SECURITY DEFINER internas
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
      AND has_function_privilege('anon', p.oid, 'execute')
      AND p.proname NOT IN ('admin_login','admins_present','roles_present',
        'lookup_orcamento_by_token','lookup_pedido_by_token','lookup_pedido_ecommerce_by_token',
        'lookup_pedido_ecommerce_itens_by_token','lookup_pedido_historico_by_token',
        'lookup_pedidos_ecommerce_by_tokens')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', r.sig);
  END LOOP;
END $$;
