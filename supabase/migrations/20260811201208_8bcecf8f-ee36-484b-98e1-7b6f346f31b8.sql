-- 1) Views: respeitar permissões de quem consulta
ALTER VIEW public.ponto_banco_horas_a_expirar SET (security_invoker = on);
ALTER VIEW public.ponto_compliance_dashboard SET (security_invoker = on);
ALTER VIEW public.ponto_dsr_detalhado SET (security_invoker = on);

-- 2) Credenciais em public.usuarios não podem ser lidas pelo cliente
REVOKE SELECT (senha_hash, senha_email, senha_sip, ramal_senha) ON public.usuarios FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_minhas_credenciais()
RETURNS TABLE (
  ramal text,
  usuario_sip text,
  senha_sip text,
  senha_email text,
  smtp text,
  porta_smtp integer,
  imap text,
  porta_imap integer,
  estabelecimento_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.ramal, u.usuario_sip, u.senha_sip, u.senha_email,
         u.smtp, u.porta_smtp, u.imap, u.porta_imap, u.estabelecimento_id
  FROM public.usuarios u
  WHERE u.auth_user_id = auth.uid()
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.get_minhas_credenciais() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_minhas_credenciais() TO authenticated, service_role;

-- Política de SELECT aberta ao papel public em usuarios
DROP POLICY IF EXISTS "Users can view usuarios from same estabelecimento" ON public.usuarios;

-- 3) Substituir políticas "true" por escopo de estabelecimento
-- ad_insights
DROP POLICY IF EXISTS "Sistema pode inserir insights" ON public.ad_insights;
CREATE POLICY "Inserir insights do estabelecimento" ON public.ad_insights
  FOR INSERT TO authenticated
  WITH CHECK (estabelecimento_id = get_auth_user_estabelecimento_id());

-- ads_platform_apps
DROP POLICY IF EXISTS "Autenticados gerenciam credenciais Ads do próprio estabelecime" ON public.ads_platform_apps;
CREATE POLICY "Ads apps do estabelecimento" ON public.ads_platform_apps
  FOR ALL TO authenticated
  USING (estabelecimento_id = get_auth_user_estabelecimento_id())
  WITH CHECK (estabelecimento_id = get_auth_user_estabelecimento_id());

-- bot_frase_uso
DROP POLICY IF EXISTS "auth manage bot_frase_uso" ON public.bot_frase_uso;
CREATE POLICY "bot_frase_uso tenant" ON public.bot_frase_uso
  FOR ALL TO authenticated
  USING (estabelecimento_id = get_auth_user_estabelecimento_id())
  WITH CHECK (estabelecimento_id = get_auth_user_estabelecimento_id());

-- chat_interno_conversas
DROP POLICY IF EXISTS "conversas_insert" ON public.chat_interno_conversas;
CREATE POLICY "conversas_insert" ON public.chat_interno_conversas
  FOR INSERT TO authenticated
  WITH CHECK (estabelecimento_id = get_auth_user_estabelecimento_id());

-- customer_canal_preferences
DROP POLICY IF EXISTS "Sistema gerencia preferências" ON public.customer_canal_preferences;
DROP POLICY IF EXISTS "Usuários veem preferências do estabelecimento" ON public.customer_canal_preferences;
CREATE POLICY "Preferencias de canal do estabelecimento" ON public.customer_canal_preferences
  FOR ALL TO authenticated
  USING (estabelecimento_id = get_auth_user_estabelecimento_id())
  WITH CHECK (estabelecimento_id = get_auth_user_estabelecimento_id());

-- ecom_usage_events (mantém inserção anônima da loja, exige tenant)
DROP POLICY IF EXISTS "ecom_usage_insert_auth" ON public.ecom_usage_events;
CREATE POLICY "ecom_usage_insert_auth" ON public.ecom_usage_events
  FOR INSERT TO authenticated
  WITH CHECK (estabelecimento_id IS NOT NULL);
DROP POLICY IF EXISTS "ecom_usage_insert_anon" ON public.ecom_usage_events;
CREATE POLICY "ecom_usage_insert_anon" ON public.ecom_usage_events
  FOR INSERT TO anon
  WITH CHECK (estabelecimento_id IS NOT NULL);

-- ia_usage_log
DROP POLICY IF EXISTS "Sistema pode criar logs de uso de IA" ON public.ia_usage_log;
CREATE POLICY "Criar logs de IA do estabelecimento" ON public.ia_usage_log
  FOR INSERT TO authenticated
  WITH CHECK (estabelecimento_id = get_auth_user_estabelecimento_id());

-- interaction_events
DROP POLICY IF EXISTS "inter_events_insert_auth" ON public.interaction_events;
CREATE POLICY "inter_events_insert_auth" ON public.interaction_events
  FOR INSERT TO authenticated
  WITH CHECK (estabelecimento_id = get_auth_user_estabelecimento_id());

-- livro_encomendas / livro_ocorrencias
DROP POLICY IF EXISTS "Autenticados gerenciam encomendas" ON public.livro_encomendas;
CREATE POLICY "Encomendas do estabelecimento" ON public.livro_encomendas
  FOR ALL TO authenticated
  USING (estabelecimento_id = get_auth_user_estabelecimento_id())
  WITH CHECK (estabelecimento_id = get_auth_user_estabelecimento_id());

DROP POLICY IF EXISTS "Autenticados gerenciam ocorrências" ON public.livro_ocorrencias;
CREATE POLICY "Ocorrencias do estabelecimento" ON public.livro_ocorrencias
  FOR ALL TO authenticated
  USING (estabelecimento_id = get_auth_user_estabelecimento_id())
  WITH CHECK (estabelecimento_id = get_auth_user_estabelecimento_id());

-- logistica_grupos
DROP POLICY IF EXISTS "auth insert logistica_grupos" ON public.logistica_grupos;
DROP POLICY IF EXISTS "auth update logistica_grupos" ON public.logistica_grupos;
DROP POLICY IF EXISTS "auth delete logistica_grupos" ON public.logistica_grupos;
CREATE POLICY "logistica_grupos tenant write" ON public.logistica_grupos
  FOR ALL TO authenticated
  USING (estabelecimento_id = get_auth_user_estabelecimento_id())
  WITH CHECK (estabelecimento_id = get_auth_user_estabelecimento_id());

-- mensagens_grupo_produto
DROP POLICY IF EXISTS "auth manage mensagens grupo produto" ON public.mensagens_grupo_produto;
CREATE POLICY "mensagens grupo produto tenant" ON public.mensagens_grupo_produto
  FOR ALL TO authenticated
  USING (estabelecimento_id = get_auth_user_estabelecimento_id())
  WITH CHECK (estabelecimento_id = get_auth_user_estabelecimento_id());

-- pilar_hub_snapshots
DROP POLICY IF EXISTS "authenticated_delete_snapshots" ON public.pilar_hub_snapshots;
CREATE POLICY "authenticated_delete_snapshots" ON public.pilar_hub_snapshots
  FOR DELETE TO authenticated
  USING (estabelecimento_id = get_auth_user_estabelecimento_id());

-- ponto_notif_workflows
DROP POLICY IF EXISTS "auth manage ponto_notif_workflows" ON public.ponto_notif_workflows;
CREATE POLICY "ponto_notif_workflows tenant" ON public.ponto_notif_workflows
  FOR ALL TO authenticated
  USING (estabelecimento_id = get_auth_user_estabelecimento_id())
  WITH CHECK (estabelecimento_id = get_auth_user_estabelecimento_id());

-- sentiment_alerts
DROP POLICY IF EXISTS "Sistema pode criar alertas" ON public.sentiment_alerts;
CREATE POLICY "Criar alertas do estabelecimento" ON public.sentiment_alerts
  FOR INSERT TO authenticated
  WITH CHECK (estabelecimento_id = get_auth_user_estabelecimento_id());

-- skills
DROP POLICY IF EXISTS "Users can create skills" ON public.skills;
DROP POLICY IF EXISTS "Users can update skills" ON public.skills;
DROP POLICY IF EXISTS "Users can delete skills" ON public.skills;
CREATE POLICY "skills tenant write" ON public.skills
  FOR ALL TO authenticated
  USING (estabelecimento_id = get_auth_user_estabelecimento_id())
  WITH CHECK (estabelecimento_id = get_auth_user_estabelecimento_id());

-- sms_envios
DROP POLICY IF EXISTS "Authenticated can insert sms_envios" ON public.sms_envios;
CREATE POLICY "sms_envios insert tenant" ON public.sms_envios
  FOR INSERT TO authenticated
  WITH CHECK (estabelecimento_id = get_auth_user_estabelecimento_id());

-- studio_visual_identity
DROP POLICY IF EXISTS "Authenticated users can create visual identity" ON public.studio_visual_identity;
DROP POLICY IF EXISTS "Authenticated users can update visual identity" ON public.studio_visual_identity;
DROP POLICY IF EXISTS "Authenticated users can delete visual identity" ON public.studio_visual_identity;
CREATE POLICY "studio_visual_identity tenant write" ON public.studio_visual_identity
  FOR ALL TO authenticated
  USING (estabelecimento_id = get_auth_user_estabelecimento_id()::text)
  WITH CHECK (estabelecimento_id = get_auth_user_estabelecimento_id()::text);

-- tabelas_preco
DROP POLICY IF EXISTS "tabelas_preco_auth_all" ON public.tabelas_preco;
CREATE POLICY "tabelas_preco tenant" ON public.tabelas_preco
  FOR ALL TO authenticated
  USING (estabelecimento_id = get_auth_user_estabelecimento_id())
  WITH CHECK (estabelecimento_id = get_auth_user_estabelecimento_id());

-- messages: inserir apenas em conversas do próprio estabelecimento
DROP POLICY IF EXISTS "Agentes can create messages" ON public.messages;
CREATE POLICY "Criar mensagens do estabelecimento" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND c.estabelecimento_id = get_user_estabelecimento_id(auth.uid())
  ));

-- atendentes: INSERT sem verificação
DROP POLICY IF EXISTS "Criar atendentes do estabelecimento" ON public.atendentes;
CREATE POLICY "Criar atendentes do estabelecimento" ON public.atendentes
  FOR INSERT TO authenticated
  WITH CHECK (estabelecimento_id = get_user_estabelecimento_id(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- 4) Trocar papel public por authenticated (licitações e afins)
DROP POLICY IF EXISTS "Users can view own establishment opportunities" ON public.licitacoes_opportunities;
CREATE POLICY "Users can view own establishment opportunities" ON public.licitacoes_opportunities
  FOR SELECT TO authenticated USING (estabelecimento_id = get_auth_user_estabelecimento_id());
DROP POLICY IF EXISTS "Users can insert own establishment opportunities" ON public.licitacoes_opportunities;
CREATE POLICY "Users can insert own establishment opportunities" ON public.licitacoes_opportunities
  FOR INSERT TO authenticated WITH CHECK (estabelecimento_id = get_auth_user_estabelecimento_id());
DROP POLICY IF EXISTS "Users can update own establishment opportunities" ON public.licitacoes_opportunities;
CREATE POLICY "Users can update own establishment opportunities" ON public.licitacoes_opportunities
  FOR UPDATE TO authenticated USING (estabelecimento_id = get_auth_user_estabelecimento_id())
  WITH CHECK (estabelecimento_id = get_auth_user_estabelecimento_id());
DROP POLICY IF EXISTS "Users can delete own establishment opportunities" ON public.licitacoes_opportunities;
CREATE POLICY "Users can delete own establishment opportunities" ON public.licitacoes_opportunities
  FOR DELETE TO authenticated USING (estabelecimento_id = get_auth_user_estabelecimento_id());

DROP POLICY IF EXISTS "Users can view own establishment config" ON public.licitacoes_config;
DROP POLICY IF EXISTS "Users can manage own establishment config" ON public.licitacoes_config;
CREATE POLICY "licitacoes_config tenant" ON public.licitacoes_config
  FOR ALL TO authenticated USING (estabelecimento_id = get_auth_user_estabelecimento_id())
  WITH CHECK (estabelecimento_id = get_auth_user_estabelecimento_id());

DROP POLICY IF EXISTS "Users can view own establishment runs" ON public.licitacoes_runs;
DROP POLICY IF EXISTS "Users can manage own establishment runs" ON public.licitacoes_runs;
CREATE POLICY "licitacoes_runs tenant" ON public.licitacoes_runs
  FOR ALL TO authenticated USING (estabelecimento_id = get_auth_user_estabelecimento_id())
  WITH CHECK (estabelecimento_id = get_auth_user_estabelecimento_id());

DROP POLICY IF EXISTS "Users can view own establishment score config" ON public.licitacoes_score_config;
DROP POLICY IF EXISTS "Users can manage own establishment score config" ON public.licitacoes_score_config;
CREATE POLICY "licitacoes_score_config tenant" ON public.licitacoes_score_config
  FOR ALL TO authenticated USING (estabelecimento_id = get_auth_user_estabelecimento_id())
  WITH CHECK (estabelecimento_id = get_auth_user_estabelecimento_id());

DROP POLICY IF EXISTS "Users can view own establishment alerts" ON public.licitacoes_alerts;
DROP POLICY IF EXISTS "Users can manage own establishment alerts" ON public.licitacoes_alerts;
CREATE POLICY "licitacoes_alerts tenant" ON public.licitacoes_alerts
  FOR ALL TO authenticated USING (estabelecimento_id = get_auth_user_estabelecimento_id())
  WITH CHECK (estabelecimento_id = get_auth_user_estabelecimento_id());

DROP POLICY IF EXISTS "Users can view own establishment keywords" ON public.licitacoes_keywords;
DROP POLICY IF EXISTS "Users can manage own establishment keywords" ON public.licitacoes_keywords;
CREATE POLICY "licitacoes_keywords tenant" ON public.licitacoes_keywords
  FOR ALL TO authenticated USING (estabelecimento_id = get_auth_user_estabelecimento_id())
  WITH CHECK (estabelecimento_id = get_auth_user_estabelecimento_id());

DROP POLICY IF EXISTS "Usuários podem ver fontes do seu estabelecimento" ON public.licitacoes_fontes;
DROP POLICY IF EXISTS "Usuários podem inserir fontes do seu estabelecimento" ON public.licitacoes_fontes;
DROP POLICY IF EXISTS "Usuários podem atualizar fontes do seu estabelecimento" ON public.licitacoes_fontes;
DROP POLICY IF EXISTS "Usuários podem deletar fontes do seu estabelecimento" ON public.licitacoes_fontes;
CREATE POLICY "licitacoes_fontes tenant" ON public.licitacoes_fontes
  FOR ALL TO authenticated USING (user_in_estabelecimento(estabelecimento_id))
  WITH CHECK (user_in_estabelecimento(estabelecimento_id));

-- linhas_arquivo_precos
DROP POLICY IF EXISTS "Usuários podem ver linhas via arquivo" ON public.linhas_arquivo_precos;
CREATE POLICY "Ver linhas via arquivo do estabelecimento" ON public.linhas_arquivo_precos
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.arquivos_precos_importados a
    WHERE a.id = linhas_arquivo_precos.arquivo_id
      AND a.estabelecimento_id = get_user_estabelecimento_id(auth.uid())
  ));

-- sentiment_conversation_summary
DROP POLICY IF EXISTS "Usuários podem ver resumos do seu estabelecimento" ON public.sentiment_conversation_summary;
CREATE POLICY "Ver resumos do estabelecimento" ON public.sentiment_conversation_summary
  FOR SELECT TO authenticated
  USING (estabelecimento_id = get_user_estabelecimento_id(auth.uid()));

-- portal_ticket_respostas: SELECT restrito ao ticket do próprio estabelecimento/cliente
DROP POLICY IF EXISTS "Ver respostas de tickets autorizados" ON public.portal_ticket_respostas;
CREATE POLICY "Ver respostas de tickets autorizados" ON public.portal_ticket_respostas
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.portal_tickets t
    WHERE t.id = portal_ticket_respostas.ticket_id
      AND (
        t.customer_id = auth.uid()
        OR t.estabelecimento_id = get_user_estabelecimento_id(auth.uid())
      )
  ));

-- 5) Funções SECURITY DEFINER: remover execução por visitantes anônimos
DO $$
DECLARE
  f record;
  anon_ok text[] := ARRAY[
    'admin_login','admins_present','roles_present',
    'lookup_orcamento_by_token','lookup_pedido_by_token',
    'lookup_pedido_ecommerce_by_token','lookup_pedido_ecommerce_itens_by_token',
    'lookup_pedido_historico_by_token','lookup_pedidos_ecommerce_by_tokens',
    'mark_bot_response'
  ];
  somente_servico text[] := ARRAY['execute_sql','exec_readonly_select'];
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig, p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', f.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.sig);
    IF NOT (f.proname = ANY(somente_servico)) THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f.sig);
    END IF;
    IF f.proname = ANY(anon_ok) THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon', f.sig);
    END IF;
  END LOOP;
END;
$$;