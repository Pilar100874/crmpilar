-- Criar índices para acelerar deleções em cascata
-- Índices na tabela messages (geralmente a maior)
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);

-- Índices na tabela conversations
CREATE INDEX IF NOT EXISTS idx_conversations_customer_id ON public.conversations(customer_id);

-- Índices em outras tabelas relacionadas
CREATE INDEX IF NOT EXISTS idx_chat_tags_aplicadas_chat_id ON public.chat_tags_aplicadas(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_transferencias_chat_id ON public.chat_transferencias(chat_id);
CREATE INDEX IF NOT EXISTS idx_portal_ticket_respostas_customer_id ON public.portal_ticket_respostas(customer_id);
CREATE INDEX IF NOT EXISTS idx_portal_tickets_customer_id ON public.portal_tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_funil_deals_cliente_id ON public.funil_deals(cliente_id);
CREATE INDEX IF NOT EXISTS idx_orcamento_itens_orcamento_id ON public.orcamento_itens(orcamento_id);
CREATE INDEX IF NOT EXISTS idx_orcamentos_cliente_id ON public.orcamentos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_kb_feedback_customer_id ON public.kb_feedback(customer_id);
CREATE INDEX IF NOT EXISTS idx_pesquisas_respostas_customer_id ON public.pesquisas_respostas(customer_id);
CREATE INDEX IF NOT EXISTS idx_envio_massa_contatos_customer_id ON public.envio_massa_contatos(customer_id);
CREATE INDEX IF NOT EXISTS idx_atendente_carteiras_customer_id ON public.atendente_carteiras(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_canal_preferences_customer_id ON public.customer_canal_preferences(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_segmentos_customer_id ON public.customer_segmentos(customer_id);
CREATE INDEX IF NOT EXISTS idx_canal_transitions_customer_id ON public.canal_transitions(customer_id);
CREATE INDEX IF NOT EXISTS idx_omnichannel_sessions_customer_id ON public.omnichannel_sessions(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_empresas_customer_id ON public.customer_empresas(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_vinculos_customer_id ON public.customer_vinculos(customer_id);