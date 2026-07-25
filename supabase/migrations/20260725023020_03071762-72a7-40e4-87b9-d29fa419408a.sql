
-- =========================================================
-- 1) conversations: remove admin email bypass + global admin
-- =========================================================
DROP POLICY IF EXISTS "View conversations (admin email bypass)" ON public.conversations;
DROP POLICY IF EXISTS "Admins have full access to conversations" ON public.conversations;

-- =========================================================
-- 2) funis: remove admin email bypass policies
-- =========================================================
DROP POLICY IF EXISTS "Insert funis (admin email fallback)" ON public.funis;

-- Rewrite funis policies to drop email pattern
DROP POLICY IF EXISTS "Delete funis (admin email or estab)" ON public.funis;
CREATE POLICY "Delete funis (same estab admin/gestor)"
ON public.funis FOR DELETE TO authenticated
USING (
  (EXISTS (SELECT 1 FROM administradores WHERE administradores.id = auth.uid()))
  OR (
    estabelecimento_id = get_user_estabelecimento_id(auth.uid())
    AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'gestor'::app_role) OR NOT roles_present())
  )
);

DROP POLICY IF EXISTS "Insert funis (admin email or estab)" ON public.funis;
CREATE POLICY "Insert funis (same estab admin/gestor)"
ON public.funis FOR INSERT TO authenticated
WITH CHECK (
  (EXISTS (SELECT 1 FROM administradores WHERE administradores.id = auth.uid()))
  OR (
    estabelecimento_id = get_user_estabelecimento_id(auth.uid())
    AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'gestor'::app_role) OR NOT roles_present())
  )
);

DROP POLICY IF EXISTS "Update funis (admin email or estab)" ON public.funis;
CREATE POLICY "Update funis (same estab admin/gestor)"
ON public.funis FOR UPDATE TO authenticated
USING (
  (EXISTS (SELECT 1 FROM administradores WHERE administradores.id = auth.uid()))
  OR (
    estabelecimento_id = get_user_estabelecimento_id(auth.uid())
    AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'gestor'::app_role) OR NOT roles_present())
  )
)
WITH CHECK (
  (EXISTS (SELECT 1 FROM administradores WHERE administradores.id = auth.uid()))
  OR (
    estabelecimento_id = get_user_estabelecimento_id(auth.uid())
    AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'gestor'::app_role) OR NOT roles_present())
  )
);

DROP POLICY IF EXISTS "View funis (same estab or admin)" ON public.funis;
CREATE POLICY "View funis (same estab or admin)"
ON public.funis FOR SELECT TO authenticated
USING (
  estabelecimento_id = get_user_estabelecimento_id(auth.uid())
  OR (EXISTS (SELECT 1 FROM administradores WHERE administradores.id = auth.uid()))
);

-- =========================================================
-- 3) calendario_tarefas: drop email-pattern bypasses and duplicates
-- =========================================================
DROP POLICY IF EXISTS "Admin email can delete all tasks" ON public.calendario_tarefas;
DROP POLICY IF EXISTS "Admin email can update all tasks" ON public.calendario_tarefas;
DROP POLICY IF EXISTS "Admin email can view all tasks" ON public.calendario_tarefas;
DROP POLICY IF EXISTS "Users can view their tasks" ON public.calendario_tarefas;
DROP POLICY IF EXISTS "Users can create tasks" ON public.calendario_tarefas;
DROP POLICY IF EXISTS "Users can update tasks" ON public.calendario_tarefas;
DROP POLICY IF EXISTS "Users can delete tasks" ON public.calendario_tarefas;
-- Duplicated per-user policies
DROP POLICY IF EXISTS "Users can view own tasks" ON public.calendario_tarefas;
-- Keep 'Administradores table can view all tasks' or 'Admins can view all tasks' -> keep only one
DROP POLICY IF EXISTS "Administradores table can view all tasks" ON public.calendario_tarefas;

-- =========================================================
-- 4) customers, atendentes, usuarios, empresas: remove untenanted admin ALL
-- =========================================================
DROP POLICY IF EXISTS "Admins have full access to customers" ON public.customers;
DROP POLICY IF EXISTS "Users can manage customers" ON public.customers;

DROP POLICY IF EXISTS "Admins have full access to atendentes" ON public.atendentes;
DROP POLICY IF EXISTS "Gestores can manage atendentes" ON public.atendentes;

DROP POLICY IF EXISTS "Admins have full access to usuarios" ON public.usuarios;

DROP POLICY IF EXISTS "Admins have full access to empresas" ON public.empresas;
DROP POLICY IF EXISTS "Users can manage empresas" ON public.empresas;

-- Add tenant-scoped admin manage policies where they didn't already exist
CREATE POLICY "Tenant admins manage customers"
ON public.customers FOR ALL TO authenticated
USING (
  estabelecimento_id = get_user_estabelecimento_id(auth.uid())
  AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'gestor'::app_role) OR NOT roles_present())
)
WITH CHECK (
  estabelecimento_id = get_user_estabelecimento_id(auth.uid())
  AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'gestor'::app_role) OR NOT roles_present())
);

CREATE POLICY "Tenant gestores manage atendentes"
ON public.atendentes FOR ALL TO authenticated
USING (
  estabelecimento_id = get_user_estabelecimento_id(auth.uid())
  AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'gestor'::app_role))
)
WITH CHECK (
  estabelecimento_id = get_user_estabelecimento_id(auth.uid())
  AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'gestor'::app_role))
);

-- =========================================================
-- 5) form_field_configs: remove admin email pattern
-- =========================================================
DROP POLICY IF EXISTS "Allow admin email to manage configs" ON public.form_field_configs;

-- =========================================================
-- 6) portal_tickets + portal_ticket_respostas: stronger identity binding
-- =========================================================
DROP POLICY IF EXISTS "Clientes veem seus tickets" ON public.portal_tickets;
CREATE POLICY "Clientes veem seus tickets"
ON public.portal_tickets FOR SELECT TO authenticated
USING (
  customer_id IS NOT NULL
  AND (auth.jwt() ->> 'phone') IS NOT NULL
  AND length(auth.jwt() ->> 'phone') > 0
  AND customer_id IN (
    SELECT c.id FROM public.customers c
    WHERE c.telefone IS NOT NULL
      AND length(c.telefone) > 0
      AND c.telefone = (auth.jwt() ->> 'phone')
  )
);

DROP POLICY IF EXISTS "Sistema pode criar respostas" ON public.portal_ticket_respostas;
CREATE POLICY "Autenticados criam respostas em tickets autorizados"
ON public.portal_ticket_respostas FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.portal_tickets t
    WHERE t.id = ticket_id
      AND (
        -- staff do estabelecimento
        (t.estabelecimento_id = get_user_estabelecimento_id(auth.uid()))
        OR (EXISTS (SELECT 1 FROM administradores a WHERE a.id = auth.uid()))
        -- ou cliente do ticket, se identificado por phone
        OR (
          t.customer_id IS NOT NULL
          AND (auth.jwt() ->> 'phone') IS NOT NULL
          AND t.customer_id IN (
            SELECT c.id FROM public.customers c
            WHERE c.telefone = (auth.jwt() ->> 'phone')
              AND c.telefone IS NOT NULL
              AND length(c.telefone) > 0
          )
        )
      )
  )
);

-- =========================================================
-- 7) push_subscriptions: require ownership (drop contato_id bypass)
-- =========================================================
DROP POLICY IF EXISTS "Insert push subscription owned" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Usuarios inserem suas proprias subscriptions" ON public.push_subscriptions;

CREATE POLICY "Insert push subscription (owned by auth user)"
ON public.push_subscriptions FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND usuario_id = (SELECT u.id FROM public.usuarios u WHERE u.auth_user_id = auth.uid())
);

-- =========================================================
-- 8) Restrict "system" INSERT policies to caller's tenant
-- =========================================================
-- ads_logs_coleta
DROP POLICY IF EXISTS "Sistema pode inserir logs" ON public.ads_logs_coleta;
CREATE POLICY "Insert ads logs (own estab)"
ON public.ads_logs_coleta FOR INSERT TO authenticated
WITH CHECK (estabelecimento_id = get_user_estabelecimento_id(auth.uid()));

-- automacoes_vendas_log
DROP POLICY IF EXISTS "Sistema pode inserir logs de automações" ON public.automacoes_vendas_log;
CREATE POLICY "Insert automacoes log (own estab automation)"
ON public.automacoes_vendas_log FOR INSERT TO authenticated
WITH CHECK (
  automacao_id IN (
    SELECT a.id FROM public.automacoes_vendas a
    WHERE a.estabelecimento_id = get_user_estabelecimento_id(auth.uid())
  )
);

-- canal_transitions
DROP POLICY IF EXISTS "Sistema cria transições" ON public.canal_transitions;
CREATE POLICY "Insert canal_transitions (own estab)"
ON public.canal_transitions FOR INSERT TO authenticated
WITH CHECK (estabelecimento_id = get_user_estabelecimento_id(auth.uid()));

-- historico_precos_concorrentes
DROP POLICY IF EXISTS "Sistema pode inserir histórico" ON public.historico_precos_concorrentes;
CREATE POLICY "Insert historico precos (own estab)"
ON public.historico_precos_concorrentes FOR INSERT TO authenticated
WITH CHECK (estabelecimento_id = get_user_estabelecimento_id(auth.uid()));

-- logs_monitor_preco
DROP POLICY IF EXISTS "Sistema pode inserir logs" ON public.logs_monitor_preco;
CREATE POLICY "Insert logs monitor preco (own estab)"
ON public.logs_monitor_preco FOR INSERT TO authenticated
WITH CHECK (estabelecimento_id = get_user_estabelecimento_id(auth.uid()));

-- marketplace_logs
DROP POLICY IF EXISTS "Sistema pode criar logs" ON public.marketplace_logs;
CREATE POLICY "Insert marketplace logs (own estab)"
ON public.marketplace_logs FOR INSERT TO authenticated
WITH CHECK (estabelecimento_id = get_user_estabelecimento_id(auth.uid()));

-- notificacoes_log
DROP POLICY IF EXISTS "Sistema pode criar notificações" ON public.notificacoes_log;
CREATE POLICY "Insert notificacoes (self only)"
ON public.notificacoes_log FOR INSERT TO authenticated
WITH CHECK (usuario_id = auth.uid());

-- omnichannel_execution_logs
DROP POLICY IF EXISTS "System can insert execution logs" ON public.omnichannel_execution_logs;
CREATE POLICY "Insert omnichannel execution logs (own estab flow)"
ON public.omnichannel_execution_logs FOR INSERT TO authenticated
WITH CHECK (
  flow_id IN (
    SELECT f.id FROM public.omnichannel_flows f
    WHERE f.estabelecimento_id = get_user_estabelecimento_id(auth.uid())
  )
);

-- sentiment_analysis
DROP POLICY IF EXISTS "Sistema pode criar análises" ON public.sentiment_analysis;
CREATE POLICY "Insert sentiment analysis (own estab)"
ON public.sentiment_analysis FOR INSERT TO authenticated
WITH CHECK (estabelecimento_id = get_user_estabelecimento_id(auth.uid()));

-- sla_violations
DROP POLICY IF EXISTS "Sistema pode criar violações de SLA" ON public.sla_violations;
CREATE POLICY "Insert SLA violations (own estab conversation)"
ON public.sla_violations FOR INSERT TO authenticated
WITH CHECK (
  conversation_id IN (
    SELECT c.id FROM public.conversations c
    WHERE c.estabelecimento_id = get_user_estabelecimento_id(auth.uid())
  )
);

-- vendas_atribuidas
DROP POLICY IF EXISTS "Sistema pode inserir vendas" ON public.vendas_atribuidas;
CREATE POLICY "Insert vendas atribuidas (own estab)"
ON public.vendas_atribuidas FOR INSERT TO authenticated
WITH CHECK (estabelecimento_id = get_user_estabelecimento_id(auth.uid()));
