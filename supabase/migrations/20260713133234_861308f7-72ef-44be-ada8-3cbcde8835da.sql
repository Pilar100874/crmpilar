
CREATE TABLE public.telas_customizadas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.telas_customizadas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('grupo','atalho')),
  rota TEXT,
  icone TEXT,
  cor TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_telas_cust_estab ON public.telas_customizadas(estabelecimento_id);
CREATE INDEX idx_telas_cust_parent ON public.telas_customizadas(parent_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.telas_customizadas TO authenticated;
GRANT ALL ON public.telas_customizadas TO service_role;

ALTER TABLE public.telas_customizadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios do estabelecimento gerenciam telas customizadas"
ON public.telas_customizadas
FOR ALL
TO authenticated
USING (
  estabelecimento_id IN (
    SELECT u.estabelecimento_id FROM public.usuarios u WHERE u.auth_user_id = auth.uid()
  )
)
WITH CHECK (
  estabelecimento_id IN (
    SELECT u.estabelecimento_id FROM public.usuarios u WHERE u.auth_user_id = auth.uid()
  )
);

CREATE OR REPLACE FUNCTION public.update_telas_customizadas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_telas_cust_updated_at
BEFORE UPDATE ON public.telas_customizadas
FOR EACH ROW EXECUTE FUNCTION public.update_telas_customizadas_updated_at();
