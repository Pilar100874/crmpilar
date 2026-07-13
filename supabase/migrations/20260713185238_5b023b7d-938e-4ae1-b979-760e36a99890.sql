
-- Livro de Ocorrência: ocorrências da portaria
CREATE TABLE public.livro_ocorrencias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID,
  numero SERIAL,
  data_hora TIMESTAMPTZ NOT NULL DEFAULT now(),
  turno TEXT,
  tipo TEXT NOT NULL,
  gravidade TEXT NOT NULL DEFAULT 'baixa',
  local TEXT,
  descricao TEXT NOT NULL,
  envolvidos TEXT,
  acao_tomada TEXT,
  responsavel TEXT,
  status TEXT NOT NULL DEFAULT 'aberta',
  anexos JSONB DEFAULT '[]'::jsonb,
  observacoes TEXT,
  registrado_por UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.livro_ocorrencias TO authenticated;
GRANT ALL ON public.livro_ocorrencias TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.livro_ocorrencias_numero_seq TO authenticated;
GRANT ALL ON SEQUENCE public.livro_ocorrencias_numero_seq TO service_role;

ALTER TABLE public.livro_ocorrencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados gerenciam ocorrências"
  ON public.livro_ocorrencias FOR ALL
  TO authenticated
  USING (true) WITH CHECK (true);

-- Livro de Encomendas / Correios
CREATE TABLE public.livro_encomendas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID,
  numero SERIAL,
  data_recebimento TIMESTAMPTZ NOT NULL DEFAULT now(),
  transportadora TEXT,
  codigo_rastreio TEXT,
  tipo_encomenda TEXT,
  remetente TEXT,
  destinatario TEXT NOT NULL,
  unidade TEXT,
  descricao TEXT,
  quantidade_volumes INTEGER DEFAULT 1,
  peso NUMERIC,
  recebido_por TEXT,
  status TEXT NOT NULL DEFAULT 'aguardando_retirada',
  data_entrega TIMESTAMPTZ,
  retirado_por TEXT,
  documento_retirada TEXT,
  assinatura_url TEXT,
  foto_url TEXT,
  observacoes TEXT,
  registrado_por UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.livro_encomendas TO authenticated;
GRANT ALL ON public.livro_encomendas TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.livro_encomendas_numero_seq TO authenticated;
GRANT ALL ON SEQUENCE public.livro_encomendas_numero_seq TO service_role;

ALTER TABLE public.livro_encomendas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados gerenciam encomendas"
  ON public.livro_encomendas FOR ALL
  TO authenticated
  USING (true) WITH CHECK (true);

-- Trigger de updated_at (reutiliza função existente se houver)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_livro_ocorrencias_updated
  BEFORE UPDATE ON public.livro_ocorrencias
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_livro_encomendas_updated
  BEFORE UPDATE ON public.livro_encomendas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_livro_ocorrencias_data ON public.livro_ocorrencias(data_hora DESC);
CREATE INDEX idx_livro_ocorrencias_status ON public.livro_ocorrencias(status);
CREATE INDEX idx_livro_encomendas_status ON public.livro_encomendas(status);
CREATE INDEX idx_livro_encomendas_data ON public.livro_encomendas(data_recebimento DESC);
