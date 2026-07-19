
CREATE TABLE public.prospeccao_empresas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  nome_fantasia TEXT,
  cnpj TEXT,
  email TEXT,
  telefone TEXT,
  whatsapp TEXT,
  site TEXT,
  endereco TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  cnae_principal TEXT,
  cnae_descricao TEXT,
  segmento_id UUID,
  segmento_nome TEXT,
  descricao TEXT,
  redes_sociais JSONB DEFAULT '{}'::jsonb,
  fontes JSONB DEFAULT '[]'::jsonb,
  origem TEXT DEFAULT 'claude-code',
  status TEXT NOT NULL DEFAULT 'novo',
  empresa_id UUID,
  importado_em TIMESTAMPTZ,
  extras JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_prospeccao_empresas_user ON public.prospeccao_empresas(user_id);
CREATE INDEX idx_prospeccao_empresas_status ON public.prospeccao_empresas(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospeccao_empresas TO authenticated;
GRANT ALL ON public.prospeccao_empresas TO service_role;

ALTER TABLE public.prospeccao_empresas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prospeccao_empresas_owner_all"
  ON public.prospeccao_empresas FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_prospeccao_empresas_updated
  BEFORE UPDATE ON public.prospeccao_empresas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
