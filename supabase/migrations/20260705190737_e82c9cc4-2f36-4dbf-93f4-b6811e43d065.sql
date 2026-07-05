
CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES public.usuarios(id) ON DELETE CASCADE,
  contato_id UUID,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  plataforma TEXT NOT NULL DEFAULT 'web',
  user_agent TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  ultimo_uso TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (endpoint)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT SELECT, INSERT ON public.push_subscriptions TO anon;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuario ve suas subscriptions" ON public.push_subscriptions FOR SELECT TO authenticated USING (usuario_id IN (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid()) OR true);
CREATE POLICY "Insert push subscription" ON public.push_subscriptions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Update own subscription" ON public.push_subscriptions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Delete own subscription" ON public.push_subscriptions FOR DELETE TO authenticated USING (true);

CREATE INDEX push_subscriptions_usuario_id_idx ON public.push_subscriptions(usuario_id) WHERE ativo = true;
CREATE INDEX push_subscriptions_contato_id_idx ON public.push_subscriptions(contato_id) WHERE ativo = true;

CREATE TABLE public.push_notifications_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destinatario_tipo TEXT NOT NULL,
  destinatario_id UUID,
  titulo TEXT NOT NULL,
  corpo TEXT,
  url TEXT,
  icone TEXT,
  origem TEXT,
  workflow_id TEXT,
  workflow_tipo TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  total_enviado INT DEFAULT 0,
  total_falhou INT DEFAULT 0,
  erro TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.push_notifications_log TO authenticated;
GRANT ALL ON public.push_notifications_log TO service_role;
ALTER TABLE public.push_notifications_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read log" ON public.push_notifications_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Insert log" ON public.push_notifications_log FOR INSERT TO authenticated, service_role WITH CHECK (true);
