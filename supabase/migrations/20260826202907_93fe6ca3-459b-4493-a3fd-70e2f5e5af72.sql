-- 1) usuarios: remove leitura das colunas de credenciais para usuários comuns
REVOKE SELECT ON public.usuarios FROM authenticated, anon;
GRANT SELECT (id,nome,email,whatsapp,unidade_id,grupo_acesso_id,created_at,updated_at,estabelecimento_id,smtp,porta_smtp,pop,porta_pop,usar_autenticacao,hora_inicial,hora_final,auth_user_id,ramal,usuario_sip,imap,porta_imap,segmento_id,whatsapp_numero_id,ativo,tipo,whatsapp_status,whatsapp_status_at,whatsapp_status_reason)
  ON public.usuarios TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.usuarios TO authenticated;
GRANT ALL ON public.usuarios TO service_role;

-- 2) Tabelas de credenciais: somente admin/gestor
DROP POLICY IF EXISTS "Users can view their establishment AI keys" ON public.ai_api_keys;
DROP POLICY IF EXISTS "Users can insert AI keys for their establishment" ON public.ai_api_keys;
DROP POLICY IF EXISTS "Users can update their establishment AI keys" ON public.ai_api_keys;
DROP POLICY IF EXISTS "Users can delete their establishment AI keys" ON public.ai_api_keys;
CREATE POLICY "Admins/gestores manage AI keys" ON public.ai_api_keys
  FOR ALL TO authenticated
  USING (estabelecimento_id = get_auth_user_estabelecimento_id()
         AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'gestor'::app_role)))
  WITH CHECK (estabelecimento_id = get_auth_user_estabelecimento_id()
         AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'gestor'::app_role)));

DROP POLICY IF EXISTS "Users can view their establishment integration credentials" ON public.integration_credentials;
DROP POLICY IF EXISTS "Users can insert integration credentials for their establishmen" ON public.integration_credentials;
DROP POLICY IF EXISTS "Users can update their establishment integration credentials" ON public.integration_credentials;
DROP POLICY IF EXISTS "Users can delete their establishment integration credentials" ON public.integration_credentials;
CREATE POLICY "Admins/gestores manage integration credentials" ON public.integration_credentials
  FOR ALL TO authenticated
  USING (estabelecimento_id = get_auth_user_estabelecimento_id()
         AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'gestor'::app_role)))
  WITH CHECK (estabelecimento_id = get_auth_user_estabelecimento_id()
         AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'gestor'::app_role)));

DROP POLICY IF EXISTS "Users can view payment gateways of their establishment" ON public.payment_gateways;
DROP POLICY IF EXISTS "Users can insert payment gateways for their establishment" ON public.payment_gateways;
DROP POLICY IF EXISTS "Users can update payment gateways of their establishment" ON public.payment_gateways;
DROP POLICY IF EXISTS "Users can delete payment gateways of their establishment" ON public.payment_gateways;
CREATE POLICY "Admins/gestores manage payment gateways" ON public.payment_gateways
  FOR ALL TO authenticated
  USING (estabelecimento_id = get_auth_user_estabelecimento_id()
         AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'gestor'::app_role)))
  WITH CHECK (estabelecimento_id = get_auth_user_estabelecimento_id()
         AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'gestor'::app_role)));

DROP POLICY IF EXISTS "Users can view whatsapp config from same estabelecimento" ON public.whatsapp_config;
DROP POLICY IF EXISTS "whatsapp_config_select_policy" ON public.whatsapp_config;
CREATE POLICY "Admins/gestores view whatsapp config" ON public.whatsapp_config
  FOR SELECT TO authenticated
  USING (((estabelecimento_id = get_auth_user_estabelecimento_id())
          AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'gestor'::app_role)))
         OR EXISTS (SELECT 1 FROM administradores a WHERE a.id = auth.uid()));

-- 3) pedidos_ecommerce_itens: fechar janela de inserção cruzada
DROP POLICY IF EXISTS "Itens validados de pedido" ON public.pedidos_ecommerce_itens;
CREATE POLICY "Itens validados de pedido" ON public.pedidos_ecommerce_itens
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pedidos_ecommerce p
      WHERE p.id = pedidos_ecommerce_itens.pedido_id
        AND (
          p.estabelecimento_id = get_auth_user_estabelecimento_id()
          OR (
            p.created_at > now() - interval '5 minutes'
            AND p.status = 'pendente'
            AND (
              SELECT COALESCE(SUM(i.subtotal), 0) FROM pedidos_ecommerce_itens i WHERE i.pedido_id = p.id
            ) + pedidos_ecommerce_itens.subtotal <= COALESCE(p.valor_total, 0)
          )
        )
    )
    AND quantidade > 0 AND quantidade <= 100000
    AND preco_unitario >= 0 AND subtotal >= 0
    AND char_length(COALESCE(nome_produto,'')) <= 300
  );

-- 4) Revogar EXECUTE anônimo em funções SECURITY DEFINER internas
REVOKE EXECUTE ON FUNCTION public.ferr_create_overdue_notifications() FROM anon;
REVOKE EXECUTE ON FUNCTION public.ferr_get_user_company_id(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.ferr_is_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.ferr_is_almoxarifado(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.ferr_update_supply_stock() FROM anon;
REVOKE EXECUTE ON FUNCTION public.op_calculate_task_priority(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.port_has_role(uuid, port_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.port_is_gestor(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.port_is_staff(uuid) FROM anon;