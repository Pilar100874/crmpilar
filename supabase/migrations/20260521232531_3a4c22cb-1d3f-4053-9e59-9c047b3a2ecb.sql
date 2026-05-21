
-- Conversa/respostas do ticket
CREATE TABLE public.support_ticket_mensagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  autor_tipo TEXT NOT NULL CHECK (autor_tipo IN ('user','admin')),
  autor_usuario_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  autor_nome TEXT,
  mensagem TEXT NOT NULL,
  anexo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_msg_ticket ON public.support_ticket_mensagens(ticket_id, created_at);

ALTER TABLE public.support_ticket_mensagens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view ticket messages" ON public.support_ticket_mensagens
  FOR SELECT TO authenticated
  USING (
    public.is_system_admin() OR EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id AND t.usuario_id = public.get_current_usuario_id_safe()
    )
  );

CREATE POLICY "insert ticket messages" ON public.support_ticket_mensagens
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_system_admin() OR EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id AND t.usuario_id = public.get_current_usuario_id_safe()
    )
  );

CREATE POLICY "admins delete ticket messages" ON public.support_ticket_mensagens
  FOR DELETE TO authenticated
  USING (public.is_system_admin());

-- Colunas adicionais p/ andamento + auto-fechamento
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reopened_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_user_message_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_admin_message_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auto_close_after_days INTEGER NOT NULL DEFAULT 7;

-- Trigger: atualiza marcas de última mensagem
CREATE OR REPLACE FUNCTION public.support_ticket_after_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.autor_tipo = 'user' THEN
    UPDATE public.support_tickets
      SET last_user_message_at = NEW.created_at,
          status = CASE WHEN status = 'fechado' THEN 'aberto' ELSE status END,
          reopened_at = CASE WHEN status = 'fechado' THEN now() ELSE reopened_at END,
          closed_at = CASE WHEN status = 'fechado' THEN NULL ELSE closed_at END,
          updated_at = now()
      WHERE id = NEW.ticket_id;
  ELSE
    UPDATE public.support_tickets
      SET last_admin_message_at = NEW.created_at,
          status = CASE WHEN status = 'aberto' THEN 'em_andamento' ELSE status END,
          updated_at = now()
      WHERE id = NEW.ticket_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_support_ticket_after_message
  AFTER INSERT ON public.support_ticket_mensagens
  FOR EACH ROW EXECUTE FUNCTION public.support_ticket_after_message();

-- Função de auto-fechamento por inatividade do usuário
CREATE OR REPLACE FUNCTION public.auto_close_support_tickets()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.support_tickets
    SET status = 'fechado',
        closed_at = now(),
        updated_at = now()
  WHERE status IN ('em_andamento','resolvido')
    AND last_admin_message_at IS NOT NULL
    AND (last_user_message_at IS NULL OR last_user_message_at < last_admin_message_at)
    AND last_admin_message_at < now() - (auto_close_after_days || ' days')::interval;
END;
$$;
