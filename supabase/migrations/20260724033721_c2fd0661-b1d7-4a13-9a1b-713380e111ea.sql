
CREATE TABLE public.apresentacoes_empresa (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  versao INTEGER NOT NULL DEFAULT 1,
  ativo BOOLEAN NOT NULL DEFAULT true,
  itens JSONB NOT NULL DEFAULT '[]'::jsonb,
  duracao_padrao_imagem INTEGER NOT NULL DEFAULT 8,
  transicao TEXT NOT NULL DEFAULT 'fade',
  criado_por UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.apresentacoes_empresa TO authenticated;
GRANT SELECT ON public.apresentacoes_empresa TO anon;
GRANT ALL ON public.apresentacoes_empresa TO service_role;

ALTER TABLE public.apresentacoes_empresa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage presentations of their establishment"
  ON public.apresentacoes_empresa
  FOR ALL
  TO authenticated
  USING (estabelecimento_id IN (SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()))
  WITH CHECK (estabelecimento_id IN (SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()));

-- Allow anon read for TV signage playback (device authenticated via tv_token flow, but page opens without session)
CREATE POLICY "Anon can read active presentations for TV playback"
  ON public.apresentacoes_empresa
  FOR SELECT
  TO anon
  USING (ativo = true);

CREATE INDEX idx_apresentacoes_empresa_estab ON public.apresentacoes_empresa(estabelecimento_id, ativo);

CREATE TRIGGER update_apresentacoes_empresa_updated_at
  BEFORE UPDATE ON public.apresentacoes_empresa
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
