-- Tabela de subscriptions push (Web Push / PWA / Mobile)
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id uuid REFERENCES public.usuarios(id) ON DELETE CASCADE,
    contato_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
    endpoint text NOT NULL UNIQUE,
    p256dh text NOT NULL,
    auth text NOT NULL,
    plataforma text NOT NULL DEFAULT 'web' CHECK (plataforma IN ('web', 'android', 'ios')),
    user_agent text,
    ativo boolean NOT NULL DEFAULT true,
    ultimo_uso timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios veem suas proprias subscriptions"
ON public.push_subscriptions
FOR SELECT
TO authenticated
USING (usuario_id = (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid()));

CREATE POLICY "Usuarios inserem suas proprias subscriptions"
ON public.push_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (usuario_id = (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid()) OR contato_id IS NOT NULL);

CREATE POLICY "Usuarios atualizam suas proprias subscriptions"
ON public.push_subscriptions
FOR UPDATE
TO authenticated
USING (usuario_id = (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid()));

CREATE POLICY "Service role acessa tudo push_subscriptions"
ON public.push_subscriptions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Tabela de log de notificacoes push enviadas
CREATE TABLE IF NOT EXISTS public.push_notifications_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    destinatario_tipo text NOT NULL DEFAULT 'manual',
    titulo text NOT NULL,
    corpo text,
    url text,
    icone text,
    origem text NOT NULL DEFAULT 'api',
    workflow_id uuid,
    workflow_tipo text,
    status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('ok', 'parcial', 'falhou', 'pendente')),
    total_enviado integer NOT NULL DEFAULT 0,
    total_falhou integer NOT NULL DEFAULT 0,
    payload jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.push_notifications_log TO authenticated;
GRANT ALL ON public.push_notifications_log TO service_role;

ALTER TABLE public.push_notifications_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados leem log"
ON public.push_notifications_log
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Service role acessa tudo push_notifications_log"
ON public.push_notifications_log
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);