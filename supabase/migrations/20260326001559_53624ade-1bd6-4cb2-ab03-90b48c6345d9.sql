
CREATE TABLE public.chat_retencao_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  retencao_dias integer NOT NULL DEFAULT 180,
  data_limpeza_manual date NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(estabelecimento_id)
);

ALTER TABLE public.chat_retencao_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own estab config" ON public.chat_retencao_config
  FOR SELECT TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE POLICY "Users can insert own estab config" ON public.chat_retencao_config
  FOR INSERT TO authenticated
  WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE POLICY "Users can update own estab config" ON public.chat_retencao_config
  FOR UPDATE TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE OR REPLACE FUNCTION public.get_chat_storage_stats(p_estabelecimento_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
  conv_count bigint;
  msg_count bigint;
  agent_sessions_count bigint;
  agent_msg_count bigint;
BEGIN
  SELECT COUNT(*) INTO conv_count FROM conversations WHERE estabelecimento_id = p_estabelecimento_id;
  SELECT COUNT(*) INTO msg_count FROM messages m JOIN conversations c ON m.conversation_id = c.id WHERE c.estabelecimento_id = p_estabelecimento_id;
  SELECT COUNT(*) INTO agent_sessions_count FROM agent_chat_sessions WHERE estabelecimento_id = p_estabelecimento_id;
  SELECT COUNT(*) INTO agent_msg_count FROM agent_chat_messages acm JOIN agent_chat_sessions acs ON acm.session_id = acs.id WHERE acs.estabelecimento_id = p_estabelecimento_id;

  result := jsonb_build_object(
    'conversas', conv_count,
    'mensagens', msg_count,
    'sessoes_agente', agent_sessions_count,
    'mensagens_agente', agent_msg_count
  );
  RETURN result;
END;
$$;
