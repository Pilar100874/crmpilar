CREATE TABLE public.coletor_dispositivos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  unidade_id uuid REFERENCES public.unidades(id) ON DELETE SET NULL,
  device_key text NOT NULL UNIQUE,
  hostname text,
  plataforma text,
  versao text,
  unidade_nome text,
  ultimo_contato timestamptz NOT NULL DEFAULT now(),
  comando text,
  comando_solicitado_em timestamptz,
  comando_status text NOT NULL DEFAULT 'ocioso',
  comando_resultado text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coletor_dispositivos TO authenticated;
GRANT ALL ON public.coletor_dispositivos TO service_role;

ALTER TABLE public.coletor_dispositivos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coletor_dispositivos_tenant"
ON public.coletor_dispositivos
FOR ALL
TO authenticated
USING (
  estabelecimento_id = public.get_auth_user_estabelecimento_id()
  OR estabelecimento_id IS NULL
  OR EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = auth.uid())
)
WITH CHECK (
  estabelecimento_id = public.get_auth_user_estabelecimento_id()
  OR estabelecimento_id IS NULL
  OR EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = auth.uid())
);

CREATE INDEX idx_coletor_dispositivos_estab ON public.coletor_dispositivos(estabelecimento_id);

CREATE TRIGGER coletor_dispositivos_updated_at
BEFORE UPDATE ON public.coletor_dispositivos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();