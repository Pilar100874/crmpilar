CREATE TABLE public.porteiros (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id uuid NOT NULL,
  user_id uuid,
  nome text NOT NULL,
  documento text,
  telefone text,
  turno text,
  observacoes text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.porteiros TO authenticated;
GRANT ALL ON public.porteiros TO service_role;

ALTER TABLE public.porteiros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Porteiros do estabelecimento"
ON public.porteiros FOR ALL TO authenticated
USING (estabelecimento_id = get_auth_user_estabelecimento_id())
WITH CHECK (estabelecimento_id = get_auth_user_estabelecimento_id());

CREATE INDEX idx_porteiros_estab ON public.porteiros(estabelecimento_id);
CREATE UNIQUE INDEX idx_porteiros_user ON public.porteiros(user_id) WHERE user_id IS NOT NULL;

CREATE TRIGGER update_porteiros_updated_at
BEFORE UPDATE ON public.porteiros
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();