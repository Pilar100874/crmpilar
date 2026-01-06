-- Tabela para tipos de credenciais disponíveis (OpenAI, Telegram, etc)
CREATE TABLE public.n8n_credential_types (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nome varchar(100) NOT NULL,
    descricao text,
    icone varchar(50),
    campos_json jsonb NOT NULL DEFAULT '[]'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Tabela para credenciais salvas do usuário
CREATE TABLE public.n8n_credenciais (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    estabelecimento_id uuid NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
    credential_type_id uuid NOT NULL REFERENCES public.n8n_credential_types(id) ON DELETE CASCADE,
    nome varchar(100) NOT NULL,
    valores_criptografados jsonb NOT NULL DEFAULT '{}'::jsonb,
    ativo boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Tabela para biblioteca de tipos de nós n8n
CREATE TABLE public.n8n_node_types (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo varchar(150) NOT NULL UNIQUE,
    nome_display varchar(150) NOT NULL,
    descricao text,
    categoria varchar(50),
    icone varchar(50),
    cor varchar(20),
    parametros_schema jsonb NOT NULL DEFAULT '{}'::jsonb,
    credential_type_id uuid REFERENCES public.n8n_credential_types(id),
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Tabela para workflows criados pelo usuário
CREATE TABLE public.n8n_workflows (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    estabelecimento_id uuid NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
    nome varchar(200) NOT NULL,
    descricao text,
    flow_data jsonb NOT NULL DEFAULT '{"nodes":[],"connections":{}}'::jsonb,
    ativo boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.n8n_credential_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.n8n_credenciais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.n8n_node_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.n8n_workflows ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Tipos de credenciais são públicos (catálogo)
CREATE POLICY "Credential types são visíveis para todos" ON public.n8n_credential_types
    FOR SELECT USING (true);

-- Tipos de nós são públicos (catálogo)
CREATE POLICY "Node types são visíveis para todos" ON public.n8n_node_types
    FOR SELECT USING (true);

-- Credenciais do usuário
CREATE POLICY "Usuários podem ver suas credenciais" ON public.n8n_credenciais
    FOR SELECT USING (true);

CREATE POLICY "Usuários podem criar credenciais" ON public.n8n_credenciais
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Usuários podem atualizar suas credenciais" ON public.n8n_credenciais
    FOR UPDATE USING (true);

CREATE POLICY "Usuários podem deletar suas credenciais" ON public.n8n_credenciais
    FOR DELETE USING (true);

-- Workflows do usuário
CREATE POLICY "Usuários podem ver seus workflows" ON public.n8n_workflows
    FOR SELECT USING (true);

CREATE POLICY "Usuários podem criar workflows" ON public.n8n_workflows
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Usuários podem atualizar seus workflows" ON public.n8n_workflows
    FOR UPDATE USING (true);

CREATE POLICY "Usuários podem deletar seus workflows" ON public.n8n_workflows
    FOR DELETE USING (true);

-- Trigger para updated_at
CREATE TRIGGER update_n8n_credenciais_updated_at
    BEFORE UPDATE ON public.n8n_credenciais
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_n8n_workflows_updated_at
    BEFORE UPDATE ON public.n8n_workflows
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir tipos de credenciais comuns
INSERT INTO public.n8n_credential_types (nome, descricao, icone, campos_json) VALUES
('OpenAI API', 'Credenciais para API da OpenAI', 'bot', '[{"nome": "apiKey", "label": "API Key", "tipo": "password", "obrigatorio": true}]'),
('HTTP Bearer Token', 'Token de autenticação Bearer', 'key', '[{"nome": "token", "label": "Bearer Token", "tipo": "password", "obrigatorio": true}]'),
('HTTP Basic Auth', 'Autenticação básica HTTP', 'lock', '[{"nome": "username", "label": "Username", "tipo": "text", "obrigatorio": true}, {"nome": "password", "label": "Password", "tipo": "password", "obrigatorio": true}]'),
('Telegram API', 'Credenciais do Bot do Telegram', 'message-circle', '[{"nome": "botToken", "label": "Bot Token", "tipo": "password", "obrigatorio": true}]'),
('Supabase API', 'Credenciais do Supabase', 'database', '[{"nome": "supabaseUrl", "label": "Supabase URL", "tipo": "text", "obrigatorio": true}, {"nome": "serviceRoleKey", "label": "Service Role Key", "tipo": "password", "obrigatorio": true}]'),
('Gmail OAuth2', 'Credenciais OAuth2 do Gmail', 'mail', '[{"nome": "clientId", "label": "Client ID", "tipo": "text", "obrigatorio": true}, {"nome": "clientSecret", "label": "Client Secret", "tipo": "password", "obrigatorio": true}]'),
('Slack API', 'Credenciais do Slack', 'hash', '[{"nome": "accessToken", "label": "Access Token", "tipo": "password", "obrigatorio": true}]'),
('Webhook', 'URL de Webhook', 'webhook', '[{"nome": "webhookUrl", "label": "Webhook URL", "tipo": "text", "obrigatorio": true}]'),
('PostgreSQL', 'Conexão PostgreSQL', 'database', '[{"nome": "host", "label": "Host", "tipo": "text", "obrigatorio": true}, {"nome": "port", "label": "Port", "tipo": "number", "obrigatorio": true}, {"nome": "database", "label": "Database", "tipo": "text", "obrigatorio": true}, {"nome": "user", "label": "User", "tipo": "text", "obrigatorio": true}, {"nome": "password", "label": "Password", "tipo": "password", "obrigatorio": true}]'),
('Anthropic API', 'Credenciais para API do Claude', 'brain', '[{"nome": "apiKey", "label": "API Key", "tipo": "password", "obrigatorio": true}]');

-- Inserir tipos de nós comuns do n8n
INSERT INTO public.n8n_node_types (tipo, nome_display, descricao, categoria, icone, cor, parametros_schema, credential_type_id) VALUES
('n8n-nodes-base.webhook', 'Webhook', 'Dispara quando uma requisição HTTP é recebida', 'trigger', 'webhook', '#22c55e', '{"httpMethod": {"type": "select", "options": ["GET", "POST", "PUT", "DELETE"], "default": "POST"}, "path": {"type": "string", "default": "webhook"}}', NULL),
('n8n-nodes-base.scheduleTrigger', 'Schedule Trigger', 'Dispara em horários programados', 'trigger', 'clock', '#22c55e', '{"rule": {"type": "string", "default": "0 * * * *"}}', NULL),
('n8n-nodes-base.httpRequest', 'HTTP Request', 'Faz requisições HTTP', 'action', 'globe', '#3b82f6', '{"method": {"type": "select", "options": ["GET", "POST", "PUT", "DELETE", "PATCH"], "default": "GET"}, "url": {"type": "string", "default": ""}, "headers": {"type": "json", "default": {}}, "body": {"type": "json", "default": {}}}', NULL),
('n8n-nodes-base.if', 'IF', 'Bifurca o fluxo baseado em condições', 'logic', 'git-branch', '#f59e0b', '{"conditions": {"type": "array", "default": []}}', NULL),
('n8n-nodes-base.switch', 'Switch', 'Direciona para diferentes saídas baseado em regras', 'logic', 'shuffle', '#f59e0b', '{"rules": {"type": "array", "default": []}}', NULL),
('n8n-nodes-base.set', 'Set', 'Define ou modifica dados', 'transform', 'edit', '#64748b', '{"values": {"type": "array", "default": []}, "mode": {"type": "select", "options": ["manual", "expression"], "default": "manual"}}', NULL),
('n8n-nodes-base.code', 'Code', 'Executa código JavaScript', 'transform', 'code', '#6366f1', '{"jsCode": {"type": "code", "default": "return items;"}}', NULL),
('n8n-nodes-base.merge', 'Merge', 'Combina dados de múltiplas fontes', 'transform', 'git-merge', '#8b5cf6', '{"mode": {"type": "select", "options": ["append", "merge", "remove"], "default": "append"}}', NULL),
('n8n-nodes-base.splitInBatches', 'Split In Batches', 'Divide itens em lotes', 'transform', 'layers', '#64748b', '{"batchSize": {"type": "number", "default": 10}}', NULL),
('@n8n/n8n-nodes-langchain.openAi', 'OpenAI', 'Conecta com modelos da OpenAI', 'ai', 'bot', '#8b5cf6', '{"model": {"type": "select", "options": ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"], "default": "gpt-4o-mini"}, "prompt": {"type": "string", "default": ""}, "temperature": {"type": "number", "default": 0.7}}', (SELECT id FROM public.n8n_credential_types WHERE nome = 'OpenAI API')),
('n8n-nodes-base.telegram', 'Telegram', 'Envia mensagens no Telegram', 'communication', 'send', '#0088cc', '{"chatId": {"type": "string", "default": ""}, "text": {"type": "string", "default": ""}}', (SELECT id FROM public.n8n_credential_types WHERE nome = 'Telegram API')),
('n8n-nodes-base.slack', 'Slack', 'Envia mensagens no Slack', 'communication', 'hash', '#4a154b', '{"channel": {"type": "string", "default": ""}, "text": {"type": "string", "default": ""}}', (SELECT id FROM public.n8n_credential_types WHERE nome = 'Slack API')),
('n8n-nodes-base.emailSend', 'Send Email', 'Envia emails', 'communication', 'mail', '#ef4444', '{"to": {"type": "string", "default": ""}, "subject": {"type": "string", "default": ""}, "body": {"type": "string", "default": ""}}', (SELECT id FROM public.n8n_credential_types WHERE nome = 'Gmail OAuth2')),
('n8n-nodes-base.postgres', 'PostgreSQL', 'Executa queries no PostgreSQL', 'data', 'database', '#06b6d4', '{"operation": {"type": "select", "options": ["select", "insert", "update", "delete"], "default": "select"}, "query": {"type": "code", "default": "SELECT * FROM table"}}', (SELECT id FROM public.n8n_credential_types WHERE nome = 'PostgreSQL')),
('n8n-nodes-base.supabase', 'Supabase', 'Interage com o Supabase', 'data', 'database', '#3ecf8e', '{"operation": {"type": "select", "options": ["select", "insert", "update", "delete", "upsert"], "default": "select"}, "table": {"type": "string", "default": ""}}', (SELECT id FROM public.n8n_credential_types WHERE nome = 'Supabase API')),
('n8n-nodes-base.respondToWebhook', 'Respond to Webhook', 'Responde a requisição do webhook', 'action', 'reply', '#22c55e', '{"respondWith": {"type": "select", "options": ["allEntries", "firstEntry", "noData", "text", "json"], "default": "allEntries"}}', NULL),
('@n8n/n8n-nodes-langchain.agent', 'AI Agent', 'Agente de IA com ferramentas', 'ai', 'brain', '#8b5cf6', '{"systemMessage": {"type": "string", "default": ""}}', NULL),
('@n8n/n8n-nodes-langchain.chainLlm', 'Basic LLM Chain', 'Cadeia simples de LLM', 'ai', 'link', '#8b5cf6', '{"prompt": {"type": "string", "default": ""}}', NULL),
('n8n-nodes-base.wait', 'Wait', 'Aguarda um tempo antes de continuar', 'logic', 'clock', '#64748b', '{"amount": {"type": "number", "default": 1}, "unit": {"type": "select", "options": ["seconds", "minutes", "hours"], "default": "seconds"}}', NULL),
('n8n-nodes-base.filter', 'Filter', 'Filtra itens baseado em condições', 'transform', 'filter', '#f59e0b', '{"conditions": {"type": "array", "default": []}}', NULL);