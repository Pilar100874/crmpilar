
-- 1. administradores
DROP POLICY IF EXISTS "Authenticated users can view administradores" ON public.administradores;
CREATE POLICY "Admins and gestores can view administradores"
  ON public.administradores FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR NOT roles_present());

-- 2. usuarios
DROP POLICY IF EXISTS "Anyone can view usuarios" ON public.usuarios;
DROP POLICY IF EXISTS "Authenticated users can view usuarios" ON public.usuarios;
DROP POLICY IF EXISTS "Authenticated users can manage usuarios" ON public.usuarios;

-- 3. ai_studio_workflows (text)
DROP POLICY IF EXISTS "Users can view their workflows" ON public.ai_studio_workflows;
DROP POLICY IF EXISTS "Users can create workflows" ON public.ai_studio_workflows;
DROP POLICY IF EXISTS "Users can update their workflows" ON public.ai_studio_workflows;
DROP POLICY IF EXISTS "Users can delete their workflows" ON public.ai_studio_workflows;
CREATE POLICY "Estab users view workflows" ON public.ai_studio_workflows FOR SELECT TO authenticated
  USING (estabelecimento_id = get_user_estabelecimento_id(auth.uid())::text);
CREATE POLICY "Estab users insert workflows" ON public.ai_studio_workflows FOR INSERT TO authenticated
  WITH CHECK (estabelecimento_id = get_user_estabelecimento_id(auth.uid())::text);
CREATE POLICY "Estab users update workflows" ON public.ai_studio_workflows FOR UPDATE TO authenticated
  USING (estabelecimento_id = get_user_estabelecimento_id(auth.uid())::text);
CREATE POLICY "Estab users delete workflows" ON public.ai_studio_workflows FOR DELETE TO authenticated
  USING (estabelecimento_id = get_user_estabelecimento_id(auth.uid())::text);

-- 4. catalogos_salvos (text)
DROP POLICY IF EXISTS "Estabelecimento pode ver seus catálogos" ON public.catalogos_salvos;
DROP POLICY IF EXISTS "Estabelecimento pode criar catálogos" ON public.catalogos_salvos;
DROP POLICY IF EXISTS "Estabelecimento pode atualizar seus catálogos" ON public.catalogos_salvos;
DROP POLICY IF EXISTS "Estabelecimento pode deletar seus catálogos" ON public.catalogos_salvos;
CREATE POLICY "Estab view catalogos" ON public.catalogos_salvos FOR SELECT TO authenticated
  USING (estabelecimento_id = get_user_estabelecimento_id(auth.uid())::text);
CREATE POLICY "Estab insert catalogos" ON public.catalogos_salvos FOR INSERT TO authenticated
  WITH CHECK (estabelecimento_id = get_user_estabelecimento_id(auth.uid())::text);
CREATE POLICY "Estab update catalogos" ON public.catalogos_salvos FOR UPDATE TO authenticated
  USING (estabelecimento_id = get_user_estabelecimento_id(auth.uid())::text);
CREATE POLICY "Estab delete catalogos" ON public.catalogos_salvos FOR DELETE TO authenticated
  USING (estabelecimento_id = get_user_estabelecimento_id(auth.uid())::text);

-- 5. chat_sessions: service_role only
DROP POLICY IF EXISTS "Users can manage their own sessions" ON public.chat_sessions;
CREATE POLICY "Service role manages chat sessions" ON public.chat_sessions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 6. database_connections (uuid)
DROP POLICY IF EXISTS "database_connections_auth_all" ON public.database_connections;
CREATE POLICY "Admins manage db connections in estab" ON public.database_connections FOR ALL TO authenticated
  USING (
    (estabelecimento_id = get_user_estabelecimento_id(auth.uid()))
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role))
  )
  WITH CHECK (
    (estabelecimento_id = get_user_estabelecimento_id(auth.uid()))
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role))
  );

-- 7. marketing_automations (uuid)
DROP POLICY IF EXISTS "Dev allow all on marketing_automations" ON public.marketing_automations;
CREATE POLICY "Estab manage marketing automations" ON public.marketing_automations FOR ALL TO authenticated
  USING (estabelecimento_id = get_user_estabelecimento_id(auth.uid()))
  WITH CHECK (estabelecimento_id = get_user_estabelecimento_id(auth.uid()));

-- 8. marketing_resource_presets (text)
DROP POLICY IF EXISTS "Allow all operations on marketing_resource_presets" ON public.marketing_resource_presets;
CREATE POLICY "Estab manage marketing presets" ON public.marketing_resource_presets FOR ALL TO authenticated
  USING (estabelecimento_id = get_user_estabelecimento_id(auth.uid())::text)
  WITH CHECK (estabelecimento_id = get_user_estabelecimento_id(auth.uid())::text);

-- 9. n8n_credenciais (uuid)
DROP POLICY IF EXISTS "Usuários podem ver suas credenciais" ON public.n8n_credenciais;
DROP POLICY IF EXISTS "Usuários podem criar credenciais" ON public.n8n_credenciais;
DROP POLICY IF EXISTS "Usuários podem atualizar suas credenciais" ON public.n8n_credenciais;
DROP POLICY IF EXISTS "Usuários podem deletar suas credenciais" ON public.n8n_credenciais;
CREATE POLICY "Estab manage n8n credenciais" ON public.n8n_credenciais FOR ALL TO authenticated
  USING (estabelecimento_id = get_user_estabelecimento_id(auth.uid()))
  WITH CHECK (estabelecimento_id = get_user_estabelecimento_id(auth.uid()));

-- 10. omnichannel_sessions (uuid)
DROP POLICY IF EXISTS "Sistema gerencia sessões" ON public.omnichannel_sessions;
CREATE POLICY "Service role manages omnichannel sessions" ON public.omnichannel_sessions FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "Estab view own omnichannel sessions" ON public.omnichannel_sessions FOR SELECT TO authenticated
  USING (estabelecimento_id = get_user_estabelecimento_id(auth.uid()));

-- 11. screen_monitor_consent
DROP POLICY IF EXISTS "Allow anonymous update of sharing status by usuario_id" ON public.screen_monitor_consent;

-- 12. twilio_config
DROP POLICY IF EXISTS "Allow all operations on twilio_config" ON public.twilio_config;
CREATE POLICY "Admins manage twilio config" ON public.twilio_config FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role manages twilio config" ON public.twilio_config FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 13. ucm_config
DROP POLICY IF EXISTS "ucm_config_auth_all" ON public.ucm_config;

-- 14. veiculo_posicoes
DROP POLICY IF EXISTS "Posições leitura pública para watch" ON public.veiculo_posicoes;

-- 15. bot-media storage
DROP POLICY IF EXISTS "Permitir upload público de mídia do bot" ON storage.objects;
DROP POLICY IF EXISTS "Permitir atualização de mídia do bot" ON storage.objects;
DROP POLICY IF EXISTS "Permitir exclusão de mídia do bot" ON storage.objects;
CREATE POLICY "Authenticated upload bot-media" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'bot-media');
CREATE POLICY "Authenticated update bot-media" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'bot-media') WITH CHECK (bucket_id = 'bot-media');
CREATE POLICY "Authenticated delete bot-media" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'bot-media');
