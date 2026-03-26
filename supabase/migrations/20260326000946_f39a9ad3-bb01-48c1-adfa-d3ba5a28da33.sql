
-- Função para limpar sessões de chat com agentes com mais de 30 dias
CREATE OR REPLACE FUNCTION public.cleanup_old_agent_chat_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.agent_chat_sessions
  WHERE updated_at < now() - interval '30 days';
END;
$$;
