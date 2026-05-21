
-- Tabela de tickets de suporte do sistema
CREATE TABLE public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  estabelecimento_id UUID,
  tipo TEXT NOT NULL DEFAULT 'texto', -- 'texto' | 'video'
  tela TEXT, -- rota/tela onde ocorreu
  titulo TEXT,
  descricao TEXT,
  observacao TEXT,
  video_url TEXT,
  status TEXT NOT NULL DEFAULT 'aberto', -- aberto | em_andamento | resolvido | fechado
  prioridade TEXT NOT NULL DEFAULT 'normal',
  resposta_admin TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_tickets_usuario ON public.support_tickets(usuario_id);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX idx_support_tickets_created ON public.support_tickets(created_at DESC);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Usuários veem e criam seus próprios tickets
CREATE POLICY "users view own tickets" ON public.support_tickets
  FOR SELECT TO authenticated
  USING (usuario_id = public.get_current_usuario_id_safe() OR public.is_system_admin());

CREATE POLICY "users create own tickets" ON public.support_tickets
  FOR INSERT TO authenticated
  WITH CHECK (usuario_id = public.get_current_usuario_id_safe());

CREATE POLICY "users update own open tickets" ON public.support_tickets
  FOR UPDATE TO authenticated
  USING (usuario_id = public.get_current_usuario_id_safe() OR public.is_system_admin());

CREATE POLICY "admins delete tickets" ON public.support_tickets
  FOR DELETE TO authenticated
  USING (public.is_system_admin());

CREATE TRIGGER trg_support_tickets_updated
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket para vídeos
INSERT INTO storage.buckets (id, name, public) VALUES ('support-tickets', 'support-tickets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "support tickets read" ON storage.objects
  FOR SELECT USING (bucket_id = 'support-tickets');

CREATE POLICY "support tickets upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'support-tickets');

CREATE POLICY "support tickets delete admin" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'support-tickets' AND public.is_system_admin());
