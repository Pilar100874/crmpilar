
CREATE TABLE public.chat_agent_custom_fields (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.chat_agents(id) ON DELETE CASCADE,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'texto',
  descricao TEXT,
  obrigatorio BOOLEAN NOT NULL DEFAULT false,
  opcoes TEXT[] DEFAULT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_agent_custom_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view custom fields of their establishment"
  ON public.chat_agent_custom_fields FOR SELECT
  TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE POLICY "Users can insert custom fields for their establishment"
  ON public.chat_agent_custom_fields FOR INSERT
  TO authenticated
  WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE POLICY "Users can update custom fields of their establishment"
  ON public.chat_agent_custom_fields FOR UPDATE
  TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE POLICY "Users can delete custom fields of their establishment"
  ON public.chat_agent_custom_fields FOR DELETE
  TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE TRIGGER update_chat_agent_custom_fields_updated_at
  BEFORE UPDATE ON public.chat_agent_custom_fields
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
