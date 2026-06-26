
-- atendente_filas: restrict SELECT
DROP POLICY IF EXISTS "Usuários podem ver atendente filas" ON public.atendente_filas;
CREATE POLICY "Autenticados veem atendente_filas do estabelecimento"
ON public.atendente_filas FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.filas_atendimento f
  WHERE f.id = atendente_filas.fila_id
    AND f.estabelecimento_id = public.get_user_estabelecimento_id(auth.uid())
));

-- atendentes: drop permissive policies
DROP POLICY IF EXISTS "Users can view atendentes" ON public.atendentes;
DROP POLICY IF EXISTS "Usuários podem atualizar atendentes" ON public.atendentes;
DROP POLICY IF EXISTS "Usuários podem criar atendentes" ON public.atendentes;
DROP POLICY IF EXISTS "Usuários podem deletar atendentes" ON public.atendentes;
DROP POLICY IF EXISTS "Usuários podem ver atendentes do estabelecimento" ON public.atendentes;

CREATE POLICY "Ver atendentes do estabelecimento"
ON public.atendentes FOR SELECT TO authenticated
USING (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid())
       OR public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Criar atendentes do estabelecimento"
ON public.atendentes FOR INSERT TO authenticated
WITH CHECK (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid())
            OR public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Atualizar atendentes do estabelecimento"
ON public.atendentes FOR UPDATE TO authenticated
USING (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid())
       OR public.has_role(auth.uid(),'admin'::app_role))
WITH CHECK (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid())
            OR public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Deletar atendentes do estabelecimento"
ON public.atendentes FOR DELETE TO authenticated
USING (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid())
       OR public.has_role(auth.uid(),'admin'::app_role));

-- chat_tags_aplicadas: restrict SELECT
DROP POLICY IF EXISTS "Usuários podem ver tags aplicadas" ON public.chat_tags_aplicadas;
CREATE POLICY "Autenticados veem tags aplicadas"
ON public.chat_tags_aplicadas FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

-- ecom_active_carts: remove anon SELECT/UPDATE
DROP POLICY IF EXISTS "ecom_carts_anon_select" ON public.ecom_active_carts;
DROP POLICY IF EXISTS "ecom_carts_anon_update" ON public.ecom_active_carts;
DROP POLICY IF EXISTS "ecom_carts_anon_upsert" ON public.ecom_active_carts;
-- keep ecom_carts_auth_all for authenticated tenant users
-- anonymous cart operations should go via edge function with service role

-- filas_atendimento: scope writes
DROP POLICY IF EXISTS "Users can create filas" ON public.filas_atendimento;
DROP POLICY IF EXISTS "Users can delete filas" ON public.filas_atendimento;
DROP POLICY IF EXISTS "Users can update filas" ON public.filas_atendimento;
DROP POLICY IF EXISTS "Users can view filas" ON public.filas_atendimento;

CREATE POLICY "Criar filas do estabelecimento"
ON public.filas_atendimento FOR INSERT TO authenticated
WITH CHECK (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid())
            OR public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Atualizar filas do estabelecimento"
ON public.filas_atendimento FOR UPDATE TO authenticated
USING (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid())
       OR public.has_role(auth.uid(),'admin'::app_role))
WITH CHECK (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid())
            OR public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Deletar filas do estabelecimento"
ON public.filas_atendimento FOR DELETE TO authenticated
USING (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid())
       OR public.has_role(auth.uid(),'admin'::app_role));

-- licitacoes_*: fix "Service role full access" policies
DROP POLICY IF EXISTS "Service role full access alerts" ON public.licitacoes_alerts;
DROP POLICY IF EXISTS "Service role full access config" ON public.licitacoes_config;
DROP POLICY IF EXISTS "Service role full access keywords" ON public.licitacoes_keywords;
DROP POLICY IF EXISTS "Service role full access opportunities" ON public.licitacoes_opportunities;
DROP POLICY IF EXISTS "Service role full access runs" ON public.licitacoes_runs;
DROP POLICY IF EXISTS "Service role full access score_config" ON public.licitacoes_score_config;

CREATE POLICY "Service role licitacoes_alerts" ON public.licitacoes_alerts FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role licitacoes_config" ON public.licitacoes_config FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role licitacoes_keywords" ON public.licitacoes_keywords FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role licitacoes_opportunities" ON public.licitacoes_opportunities FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role licitacoes_runs" ON public.licitacoes_runs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role licitacoes_score_config" ON public.licitacoes_score_config FOR ALL TO service_role USING (true) WITH CHECK (true);

-- linhas_arquivo_precos: restrict writes to service role
DROP POLICY IF EXISTS "Sistema pode gerenciar linhas" ON public.linhas_arquivo_precos;
CREATE POLICY "Service role gerencia linhas" ON public.linhas_arquivo_precos
FOR ALL TO service_role USING (true) WITH CHECK (true);

-- messages: tenant-scope reads
DROP POLICY IF EXISTS "Authenticated users can view messages" ON public.messages;
CREATE POLICY "Ver mensagens do estabelecimento"
ON public.messages FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.conversations c
  WHERE c.id = messages.conversation_id
    AND c.estabelecimento_id = public.get_user_estabelecimento_id(auth.uid())
));

-- ponto_espelho_envios: drop anon policies
DROP POLICY IF EXISTS "envios por token" ON public.ponto_espelho_envios;
DROP POLICY IF EXISTS "envios update token" ON public.ponto_espelho_envios;

-- portal_ticket_respostas: restrict SELECT
DROP POLICY IF EXISTS "Usuários veem respostas de seus tickets" ON public.portal_ticket_respostas;
CREATE POLICY "Ver respostas de tickets autorizados"
ON public.portal_ticket_respostas FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.portal_tickets t
  WHERE t.id = portal_ticket_respostas.ticket_id
    AND (t.customer_id = auth.uid()
         OR EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid()))
));

-- sentiment_conversation_summary: restrict writes to service role
DROP POLICY IF EXISTS "Sistema pode gerenciar resumos" ON public.sentiment_conversation_summary;
CREATE POLICY "Service role gerencia resumos" ON public.sentiment_conversation_summary
FOR ALL TO service_role USING (true) WITH CHECK (true);

-- studio_gallery_images: drop permissive public write/select policies
DROP POLICY IF EXISTS "Users can delete gallery images" ON public.studio_gallery_images;
DROP POLICY IF EXISTS "Users can insert gallery images" ON public.studio_gallery_images;
DROP POLICY IF EXISTS "Users can update gallery images" ON public.studio_gallery_images;
DROP POLICY IF EXISTS "Users can view gallery images for their establishment" ON public.studio_gallery_images;
-- "Auth manage studio_gallery_images" (authenticated, tenant-scoped) remains
