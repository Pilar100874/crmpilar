CREATE TABLE public.port_push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text NOT NULL UNIQUE,
  plataforma text NOT NULL DEFAULT 'android',
  unidade_id uuid,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.port_push_tokens TO authenticated;
GRANT ALL ON public.port_push_tokens TO service_role;

ALTER TABLE public.port_push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push tokens do proprio usuario"
ON public.port_push_tokens FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_port_push_tokens_unidade ON public.port_push_tokens (unidade_id) WHERE ativo;