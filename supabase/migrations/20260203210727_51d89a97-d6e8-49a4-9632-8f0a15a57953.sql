-- Dropar e recriar a função de exclusão em cascata de clientes para incluir calendario_tarefas
DROP FUNCTION IF EXISTS public.delete_customer_cascade(uuid);

CREATE FUNCTION public.delete_customer_cascade(p_customer_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '60s'
AS $$
BEGIN
  -- Deletar tarefas do calendário vinculadas ao contato
  DELETE FROM public.calendario_tarefas WHERE contact_id = p_customer_id::text;
  
  -- Deletar mensagens das conversas do cliente
  DELETE FROM public.messages WHERE conversation_id IN (SELECT id FROM public.conversations WHERE customer_id = p_customer_id);
  
  -- Deletar tags aplicadas às conversas
  DELETE FROM public.chat_tags_aplicadas WHERE chat_id IN (SELECT id FROM public.conversations WHERE customer_id = p_customer_id);
  
  -- Deletar transferências de chat
  DELETE FROM public.chat_transferencias WHERE chat_id IN (SELECT id FROM public.conversations WHERE customer_id = p_customer_id);
  
  -- Deletar conversas do cliente
  DELETE FROM public.conversations WHERE customer_id = p_customer_id;
  
  -- Deletar respostas de tickets do portal
  DELETE FROM public.portal_ticket_respostas WHERE customer_id = p_customer_id;
  
  -- Deletar tickets do portal
  DELETE FROM public.portal_tickets WHERE customer_id = p_customer_id;
  
  -- Deletar deals do funil
  DELETE FROM public.funil_deals WHERE cliente_id = p_customer_id;
  
  -- Deletar itens de orçamento
  DELETE FROM public.orcamento_itens WHERE orcamento_id IN (SELECT id FROM public.orcamentos WHERE cliente_id = p_customer_id);
  
  -- Deletar orçamentos
  DELETE FROM public.orcamentos WHERE cliente_id = p_customer_id;
  
  -- Deletar feedbacks KB
  DELETE FROM public.kb_feedback WHERE customer_id = p_customer_id;
  
  -- Deletar respostas de pesquisas
  DELETE FROM public.pesquisas_respostas WHERE customer_id = p_customer_id;
  
  -- Deletar contatos de envio em massa
  DELETE FROM public.envio_massa_contatos WHERE customer_id = p_customer_id;
  
  -- Deletar carteiras de atendente
  DELETE FROM public.atendente_carteiras WHERE customer_id = p_customer_id;
  
  -- Deletar preferências de canal
  DELETE FROM public.customer_canal_preferences WHERE customer_id = p_customer_id;
  
  -- Deletar segmentos do cliente
  DELETE FROM public.customer_segmentos WHERE customer_id = p_customer_id;
  
  -- Deletar transições de canal
  DELETE FROM public.canal_transitions WHERE customer_id = p_customer_id;
  
  -- Deletar sessões omnichannel
  DELETE FROM public.omnichannel_sessions WHERE customer_id = p_customer_id;
  
  -- Deletar vínculos com empresas
  DELETE FROM public.customer_empresas WHERE customer_id = p_customer_id;
  
  -- Deletar vínculos
  DELETE FROM public.customer_vinculos WHERE customer_id = p_customer_id;
  
  -- Finalmente, deletar o cliente
  DELETE FROM public.customers WHERE id = p_customer_id;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Erro ao deletar customer %: %', p_customer_id, SQLERRM;
    RETURN FALSE;
END;
$$;

-- Criar função para exclusão em cascata de empresas
CREATE OR REPLACE FUNCTION public.delete_empresa_cascade(p_empresa_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '60s'
AS $$
BEGIN
  -- Deletar tarefas do calendário vinculadas à empresa (via contact_id dos customers vinculados)
  DELETE FROM public.calendario_tarefas ct
  USING public.customer_empresas ce
  WHERE ct.contact_id = ce.customer_id::text AND ce.empresa_id = p_empresa_id;
  
  -- Deletar vínculos de customers com a empresa
  DELETE FROM public.customer_empresas WHERE empresa_id = p_empresa_id;
  
  -- Atualizar customers que têm empresa_id direta (não deletar, só desvincular)
  UPDATE public.customers SET empresa_id = NULL WHERE empresa_id = p_empresa_id;
  
  -- Finalmente, deletar a empresa
  DELETE FROM public.empresas WHERE id = p_empresa_id;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Erro ao deletar empresa %: %', p_empresa_id, SQLERRM;
    RETURN FALSE;
END;
$$;