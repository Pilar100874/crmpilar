CREATE OR REPLACE FUNCTION public.is_usuario_interno(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _uid IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.usuarios WHERE auth_user_id = _uid)
    OR EXISTS (SELECT 1 FROM public.ferr_user_roles WHERE user_id = _uid)
    OR EXISTS (SELECT 1 FROM public.op_user_roles WHERE user_id = _uid)
    OR EXISTS (SELECT 1 FROM public.port_user_roles WHERE user_id = _uid)
  )
$$;
REVOKE EXECUTE ON FUNCTION public.is_usuario_interno(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_usuario_interno(uuid) TO anon, authenticated, service_role;
ALTER POLICY "Todos podem ver plataformas" ON public.ad_platforms USING (public.is_usuario_interno(auth.uid()));
ALTER POLICY "Usuarios autenticados gerenciam blocos" ON public.automacao_blocos USING (public.is_usuario_interno(auth.uid())) WITH CHECK (public.is_usuario_interno(auth.uid()));
ALTER POLICY "Autenticados gerenciam grupos de câmeras" ON public.cameras_grupos USING (public.is_usuario_interno(auth.uid())) WITH CHECK (public.is_usuario_interno(auth.uid()));
ALTER POLICY "participantes_insert" ON public.chat_interno_participantes WITH CHECK (public.is_usuario_interno(auth.uid()));
ALTER POLICY "Authenticated can read cron_health" ON public.cron_health USING (public.is_usuario_interno(auth.uid()));
ALTER POLICY "Leitura pública de empresas_cnae_municipios" ON public.empresas_cnae_municipios USING (public.is_usuario_interno(auth.uid()));
ALTER POLICY "ferr_update_auth" ON public.ferr_kit_tools USING (public.is_usuario_interno(auth.uid())) WITH CHECK (public.is_usuario_interno(auth.uid()));
ALTER POLICY "ferr_update_auth" ON public.ferr_loan_renewals USING (public.is_usuario_interno(auth.uid())) WITH CHECK (public.is_usuario_interno(auth.uid()));
ALTER POLICY "ferr_update_auth" ON public.ferr_loan_request_items USING (public.is_usuario_interno(auth.uid())) WITH CHECK (public.is_usuario_interno(auth.uid()));
ALTER POLICY "ferr_select_auth" ON public.ferr_role_permissions USING (public.is_usuario_interno(auth.uid()));
ALTER POLICY "ferr_update_auth" ON public.ferr_user_warehouses USING (public.is_usuario_interno(auth.uid())) WITH CHECK (public.is_usuario_interno(auth.uid()));
ALTER POLICY "Usuários autenticados podem dar feedback" ON public.kb_feedback WITH CHECK (public.is_usuario_interno(auth.uid()));
ALTER POLICY "Usuários autenticados gerenciam palavras-chave" ON public.livro_palavras_chave USING (public.is_usuario_interno(auth.uid())) WITH CHECK (public.is_usuario_interno(auth.uid()));
ALTER POLICY "auth read logistica_grupos" ON public.logistica_grupos USING (public.is_usuario_interno(auth.uid()));
ALTER POLICY "Insert municipios_coordenadas autenticado" ON public.municipios_coordenadas WITH CHECK (public.is_usuario_interno(auth.uid()));
ALTER POLICY "Usuários autenticados podem atualizar municipios_renda" ON public.municipios_renda USING (public.is_usuario_interno(auth.uid()));
ALTER POLICY "Anyone can subscribe to newsletter" ON public.newsletter_subscribers WITH CHECK (email IS NOT NULL AND length(email) BETWEEN 5 AND 255 AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' AND (nome IS NULL OR length(nome) <= 200));
ALTER POLICY "Authenticated users can view op_task_dependencies" ON public.op_task_dependencies USING (public.is_usuario_interno(auth.uid()));
ALTER POLICY "Authenticated users can view op_task_template_materials" ON public.op_task_template_materials USING (public.is_usuario_interno(auth.uid()));
ALTER POLICY "Authenticated users can view op_task_template_tools" ON public.op_task_template_tools USING (public.is_usuario_interno(auth.uid()));
ALTER POLICY "Sistema pode atualizar respostas" ON public.pesquisas_respostas USING (public.is_usuario_interno(auth.uid()));
ALTER POLICY "authenticated_read_snapshots" ON public.pilar_hub_snapshots USING (public.is_usuario_interno(auth.uid()));
ALTER POLICY "Autenticados leem anexos" ON public.policy_attachments USING (public.is_usuario_interno(auth.uid()));
ALTER POLICY "Autenticados leem categorias" ON public.policy_categories USING (public.is_usuario_interno(auth.uid()));
ALTER POLICY "Autenticados leem chunks" ON public.policy_chunks USING (public.is_usuario_interno(auth.uid()));
ALTER POLICY "port_ap_select_auth" ON public.port_access_points USING (public.is_usuario_interno(auth.uid()));
ALTER POLICY "Autenticados gerenciam toques de campainha" ON public.port_campainha_eventos USING (public.is_usuario_interno(auth.uid())) WITH CHECK (public.is_usuario_interno(auth.uid()));
ALTER POLICY "Autenticados gerenciam config do interfone" ON public.port_interfone_config USING (public.is_usuario_interno(auth.uid())) WITH CHECK (public.is_usuario_interno(auth.uid()));
ALTER POLICY "port_settings_select_auth" ON public.port_settings USING (public.is_usuario_interno(auth.uid()));
ALTER POLICY "Read log" ON public.push_notifications_log USING (public.is_usuario_interno(auth.uid()));
ALTER POLICY "Delete own subscription" ON public.push_subscriptions USING (public.is_usuario_interno(auth.uid()));
ALTER POLICY "Usuários autenticados podem atualizar jobs" ON public.relatorio_jobs USING (public.is_usuario_interno(auth.uid()));
ALTER POLICY "Sistema pode criar execuções" ON public.relatorios_execucoes WITH CHECK (public.is_usuario_interno(auth.uid()));
ALTER POLICY "Users can insert artifact versions" ON public.strategy_artifact_versions WITH CHECK (public.is_usuario_interno(auth.uid()));
ALTER POLICY "Authenticated users can view visual identity for their establis" ON public.studio_visual_identity USING (public.is_usuario_interno(auth.uid()));
ALTER POLICY "Usuarios autenticados gerenciam config de vistoria transp" ON public.transp_inspection_config USING (public.is_usuario_interno(auth.uid())) WITH CHECK (public.is_usuario_interno(auth.uid()));
ALTER POLICY "Authenticated users can view usuario_segmentos" ON public.usuario_segmentos USING (public.is_usuario_interno(auth.uid()));
ALTER POLICY "Admin/Manager can delete task photos" ON storage.objects USING (((bucket_id = 'task-photos'::text)) AND public.is_usuario_interno(auth.uid()));
ALTER POLICY "Anyone can view task photos" ON storage.objects USING (((bucket_id = 'task-photos'::text)) AND public.is_usuario_interno(auth.uid()));
ALTER POLICY "Autenticados leem artefatos do playwright" ON storage.objects USING (((bucket_id = 'playwright-execucoes'::text)) AND public.is_usuario_interno(auth.uid()));
ALTER POLICY "Authenticated users can upload irregularity photos" ON storage.objects WITH CHECK (((bucket_id = 'irregularity-photos'::text)) AND public.is_usuario_interno(auth.uid()));
ALTER POLICY "Authenticated users can upload task photos" ON storage.objects WITH CHECK (((bucket_id = 'task-photos'::text)) AND public.is_usuario_interno(auth.uid()));
ALTER POLICY "Authenticated view op hub photos" ON storage.objects USING (((bucket_id = ANY (ARRAY['task-photos'::text, 'task-location-photos'::text, 'irregularity-photos'::text]))) AND public.is_usuario_interno(auth.uid()));
ALTER POLICY "Irregularity photos are publicly accessible" ON storage.objects USING (((bucket_id = 'irregularity-photos'::text)) AND public.is_usuario_interno(auth.uid()));
ALTER POLICY "Users can update own task photos" ON storage.objects USING (((bucket_id = 'task-photos'::text)) AND public.is_usuario_interno(auth.uid()));
ALTER POLICY "Usuários autenticados podem fazer upload" ON storage.objects WITH CHECK (((bucket_id = 'chat-attachments'::text)) AND public.is_usuario_interno(auth.uid()));
ALTER POLICY "apks_authenticated_delete" ON storage.objects USING (((bucket_id = 'apks'::text)) AND public.is_usuario_interno(auth.uid()));
ALTER POLICY "apks_authenticated_insert" ON storage.objects WITH CHECK (((bucket_id = 'apks'::text)) AND public.is_usuario_interno(auth.uid()));
ALTER POLICY "apks_authenticated_read" ON storage.objects USING (((bucket_id = 'apks'::text)) AND public.is_usuario_interno(auth.uid()));
ALTER POLICY "apks_authenticated_update" ON storage.objects USING (((bucket_id = 'apks'::text)) AND public.is_usuario_interno(auth.uid())) WITH CHECK (((bucket_id = 'apks'::text)) AND public.is_usuario_interno(auth.uid()));
ALTER POLICY "authenticated_read_pilar_hub_snapshots_storage" ON storage.objects USING (((bucket_id = 'pilar-hub-snapshots'::text)) AND public.is_usuario_interno(auth.uid()));
ALTER POLICY "automacao_imagens_delete" ON storage.objects USING (((bucket_id = 'automacao'::text)) AND public.is_usuario_interno(auth.uid()));
ALTER POLICY "automacao_imagens_insert" ON storage.objects WITH CHECK (((bucket_id = 'automacao'::text)) AND public.is_usuario_interno(auth.uid()));
ALTER POLICY "automacao_imagens_select" ON storage.objects USING (((bucket_id = 'automacao'::text)) AND public.is_usuario_interno(auth.uid()));
ALTER POLICY "automacao_imagens_update" ON storage.objects USING (((bucket_id = 'automacao'::text)) AND public.is_usuario_interno(auth.uid())) WITH CHECK (((bucket_id = 'automacao'::text)) AND public.is_usuario_interno(auth.uid()));
ALTER POLICY "ferr_bucket_delete" ON storage.objects USING (((bucket_id = ANY (ARRAY['ferr-tool-photos'::text, 'ferr-loan-photos'::text]))) AND public.is_usuario_interno(auth.uid()));
ALTER POLICY "ferr_bucket_insert" ON storage.objects WITH CHECK (((bucket_id = ANY (ARRAY['ferr-tool-photos'::text, 'ferr-loan-photos'::text]))) AND public.is_usuario_interno(auth.uid()));
ALTER POLICY "ferr_bucket_read" ON storage.objects USING (((bucket_id = ANY (ARRAY['ferr-tool-photos'::text, 'ferr-loan-photos'::text]))) AND public.is_usuario_interno(auth.uid()));
ALTER POLICY "ferr_bucket_update" ON storage.objects USING (((bucket_id = ANY (ARRAY['ferr-tool-photos'::text, 'ferr-loan-photos'::text]))) AND public.is_usuario_interno(auth.uid())) WITH CHECK (((bucket_id = ANY (ARRAY['ferr-tool-photos'::text, 'ferr-loan-photos'::text]))) AND public.is_usuario_interno(auth.uid()));
ALTER POLICY "heatmap_tenant_read" ON storage.objects USING ((((bucket_id = 'heatmap-screenshots'::text) AND (public.is_system_admin() OR ((storage.foldername(name))[2] = (public.get_auth_user_estabelecimento_id())::text) OR ((storage.foldername(name))[2] = 'global'::text)))) AND public.is_usuario_interno(auth.uid()));
ALTER POLICY "heatmap_tenant_update" ON storage.objects USING ((((bucket_id = 'heatmap-screenshots'::text) AND (public.is_system_admin() OR ((storage.foldername(name))[2] = (public.get_auth_user_estabelecimento_id())::text) OR ((storage.foldername(name))[2] = 'global'::text)))) AND public.is_usuario_interno(auth.uid()));
ALTER POLICY "heatmap_tenant_write" ON storage.objects WITH CHECK ((((bucket_id = 'heatmap-screenshots'::text) AND (public.is_system_admin() OR ((storage.foldername(name))[2] = (public.get_auth_user_estabelecimento_id())::text) OR ((storage.foldername(name))[2] = 'global'::text)))) AND public.is_usuario_interno(auth.uid()));
ALTER POLICY "policy_attachments read authenticated" ON storage.objects USING (((bucket_id = 'policy-attachments'::text)) AND public.is_usuario_interno(auth.uid()));