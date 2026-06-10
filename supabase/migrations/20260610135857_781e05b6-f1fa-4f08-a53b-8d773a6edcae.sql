
DROP POLICY IF EXISTS "Users can manage administradores" ON public.administradores;
DROP POLICY IF EXISTS "Admins and gestores can view administradores" ON public.administradores;
CREATE POLICY "Admins manage administradores" ON public.administradores
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR EXISTS (SELECT 1 FROM administradores a WHERE a.id = auth.uid()))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR EXISTS (SELECT 1 FROM administradores a WHERE a.id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete catalog AI images" ON public.catalog_ai_images;
DROP POLICY IF EXISTS "Users can insert catalog AI images" ON public.catalog_ai_images;
DROP POLICY IF EXISTS "Users can view their catalog AI images" ON public.catalog_ai_images;
CREATE POLICY "Auth manage catalog_ai_images" ON public.catalog_ai_images
  FOR ALL TO authenticated
  USING (estabelecimento_id = get_user_estabelecimento_id(auth.uid())::text)
  WITH CHECK (estabelecimento_id = get_user_estabelecimento_id(auth.uid())::text);

DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.customer_empresas;
CREATE POLICY "Auth manage customer_empresas" ON public.customer_empresas
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM customers c WHERE c.id = customer_empresas.customer_id AND c.estabelecimento_id = get_user_estabelecimento_id(auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM customers c WHERE c.id = customer_empresas.customer_id AND c.estabelecimento_id = get_user_estabelecimento_id(auth.uid())));

DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.customer_segmentos;
CREATE POLICY "Auth manage customer_segmentos" ON public.customer_segmentos
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM customers c WHERE c.id = customer_segmentos.customer_id AND c.estabelecimento_id = get_user_estabelecimento_id(auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM customers c WHERE c.id = customer_segmentos.customer_id AND c.estabelecimento_id = get_user_estabelecimento_id(auth.uid())));

DROP POLICY IF EXISTS "Authenticated users can view customer_vinculos" ON public.customer_vinculos;
CREATE POLICY "Auth view customer_vinculos scoped" ON public.customer_vinculos
  FOR SELECT TO authenticated
  USING (estabelecimento_id = get_user_estabelecimento_id(auth.uid()) OR EXISTS (SELECT 1 FROM administradores a WHERE a.id = auth.uid()));

DROP POLICY IF EXISTS "App pode buscar dispositivo pelo UUID" ON public.dispositivos_rastreamento;
DROP POLICY IF EXISTS "App pode atualizar ultimo_acesso do dispositivo" ON public.dispositivos_rastreamento;

DROP POLICY IF EXISTS "Authenticated users can view empresa_vinculos" ON public.empresa_vinculos;
CREATE POLICY "Auth view empresa_vinculos scoped" ON public.empresa_vinculos
  FOR SELECT TO authenticated
  USING (estabelecimento_id = get_user_estabelecimento_id(auth.uid()) OR EXISTS (SELECT 1 FROM administradores a WHERE a.id = auth.uid()));

DROP POLICY IF EXISTS "Everyone can view global variables" ON public.global_variables;
DROP POLICY IF EXISTS "Authenticated users can insert global variables" ON public.global_variables;
DROP POLICY IF EXISTS "Authenticated users can update global variables" ON public.global_variables;
DROP POLICY IF EXISTS "Authenticated users can delete global variables" ON public.global_variables;
CREATE POLICY "Auth view global_variables" ON public.global_variables
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert global_variables" ON public.global_variables
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update global_variables" ON public.global_variables
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth delete global_variables" ON public.global_variables
  FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "anon read heatmap_config" ON public.heatmap_config;

DROP POLICY IF EXISTS "Sistema pode gerenciar métricas" ON public.metricas_agregadas;
CREATE POLICY "Service role manage métricas" ON public.metricas_agregadas
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Usuários podem ver seus workflows" ON public.n8n_workflows;
DROP POLICY IF EXISTS "Usuários podem criar workflows" ON public.n8n_workflows;
DROP POLICY IF EXISTS "Usuários podem atualizar seus workflows" ON public.n8n_workflows;
DROP POLICY IF EXISTS "Usuários podem deletar seus workflows" ON public.n8n_workflows;
CREATE POLICY "Auth manage n8n_workflows scoped" ON public.n8n_workflows
  FOR ALL TO authenticated
  USING (estabelecimento_id = get_user_estabelecimento_id(auth.uid()) OR EXISTS (SELECT 1 FROM administradores a WHERE a.id = auth.uid()))
  WITH CHECK (estabelecimento_id = get_user_estabelecimento_id(auth.uid()) OR EXISTS (SELECT 1 FROM administradores a WHERE a.id = auth.uid()));

DROP POLICY IF EXISTS "Public access via token" ON public.orcamentos;
CREATE POLICY "Public access orcamentos via explicit token" ON public.orcamentos
  FOR SELECT TO anon, authenticated
  USING (token_compartilhamento IS NOT NULL AND token_compartilhamento = NULLIF(current_setting('request.headers.x-orcamento-token', true), ''));

DROP POLICY IF EXISTS "Public access orcamento_itens via token" ON public.orcamento_itens;
CREATE POLICY "Public access orcamento_itens via explicit token" ON public.orcamento_itens
  FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM orcamentos o WHERE o.id = orcamento_itens.orcamento_id
    AND o.token_compartilhamento IS NOT NULL
    AND o.token_compartilhamento = NULLIF(current_setting('request.headers.x-orcamento-token', true), '')));

DROP POLICY IF EXISTS "Public can view historico by pedido" ON public.pedido_tracking_historico;
CREATE POLICY "Public view historico by token" ON public.pedido_tracking_historico
  FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM pedido_tracking pt WHERE pt.id = pedido_tracking_historico.pedido_tracking_id
    AND pt.token_rastreamento IS NOT NULL
    AND pt.token_rastreamento = NULLIF(current_setting('request.headers.x-tracking-token', true), '')));

DROP POLICY IF EXISTS "Anyone can read orders by token" ON public.pedidos_ecommerce;
CREATE POLICY "Public read pedidos_ecommerce by token" ON public.pedidos_ecommerce
  FOR SELECT TO anon, authenticated
  USING (token_rastreamento IS NOT NULL
    AND token_rastreamento = NULLIF(current_setting('request.headers.x-tracking-token', true), ''));

DROP POLICY IF EXISTS "Anyone can read order items" ON public.pedidos_ecommerce_itens;
CREATE POLICY "Public read pedidos_ecommerce_itens by token" ON public.pedidos_ecommerce_itens
  FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM pedidos_ecommerce p WHERE p.id = pedidos_ecommerce_itens.pedido_id
    AND p.token_rastreamento IS NOT NULL
    AND p.token_rastreamento = NULLIF(current_setting('request.headers.x-tracking-token', true), '')));

DROP POLICY IF EXISTS "Users can insert studio gallery images" ON public.studio_gallery_images;
DROP POLICY IF EXISTS "Users can update studio gallery images" ON public.studio_gallery_images;
DROP POLICY IF EXISTS "Users can delete studio gallery images" ON public.studio_gallery_images;
CREATE POLICY "Auth manage studio_gallery_images" ON public.studio_gallery_images
  FOR ALL TO authenticated
  USING (estabelecimento_id = get_user_estabelecimento_id(auth.uid())::text)
  WITH CHECK (estabelecimento_id = get_user_estabelecimento_id(auth.uid())::text);
