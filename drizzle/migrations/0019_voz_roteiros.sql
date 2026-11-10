CREATE TABLE public.voz_roteiros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL,
  chave text NOT NULL,
  departamento text NOT NULL DEFAULT 'comercial',
  nome text NOT NULL,
  descricao text NOT NULL DEFAULT '',
  campos text[] NOT NULL DEFAULT '{}',
  etapas jsonb NOT NULL DEFAULT '[]'::jsonb,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (estabelecimento_id, chave)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.voz_roteiros TO authenticated;
GRANT ALL ON public.voz_roteiros TO service_role;
ALTER TABLE public.voz_roteiros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Roteiros da própria empresa" ON public.voz_roteiros FOR ALL TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id())
  WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id());