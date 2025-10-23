-- Limpar todos os cadastros do banco de dados
-- Ordem respeitando foreign keys

-- 1. Limpar mensagens e conversas
DELETE FROM public.messages;
DELETE FROM public.conversations;

-- 2. Limpar relacionamentos de usuários
DELETE FROM public.usuario_segmentos;
DELETE FROM public.user_roles;

-- 3. Limpar usuários
DELETE FROM public.usuarios;

-- 4. Limpar clientes
DELETE FROM public.customers;

-- 5. Limpar textos prontos e anexos rápidos
DELETE FROM public.quick_replies;
DELETE FROM public.quick_attachments;

-- 6. Limpar APIs e bot flows
DELETE FROM public.api_endpoints;
DELETE FROM public.bot_flows;
DELETE FROM public.campaigns;

-- 7. Limpar configurações de estabelecimentos
DELETE FROM public.unidades;
DELETE FROM public.segmentos;
DELETE FROM public.grupos_acesso;
DELETE FROM public.redes_sociais;
DELETE FROM public.canais_atendimento;
DELETE FROM public.notificacoes_config;
DELETE FROM public.seguranca_config;

-- 8. Limpar estabelecimentos
DELETE FROM public.estabelecimentos;

-- 9. Limpar administradores
DELETE FROM public.administradores;

-- 10. Limpar outras tabelas auxiliares
DELETE FROM public.contents;
DELETE FROM public.flows;
DELETE FROM public.chat_sessions;
DELETE FROM public.database_connections;
DELETE FROM public.global_variables;