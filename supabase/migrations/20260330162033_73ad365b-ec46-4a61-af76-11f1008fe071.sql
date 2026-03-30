
-- Tabela de faixas de preço por volume
CREATE TABLE public.ecommerce_volume_pricing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  nome_faixa TEXT NOT NULL,
  quantidade_minima INTEGER NOT NULL,
  quantidade_maxima INTEGER,
  percentual_desconto NUMERIC(5,2) NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ecommerce_volume_pricing ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public can view active volume pricing"
  ON public.ecommerce_volume_pricing FOR SELECT
  USING (ativo = true);

CREATE POLICY "Authenticated users can manage volume pricing"
  ON public.ecommerce_volume_pricing FOR ALL
  TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id())
  WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id());

-- Trigger updated_at
CREATE TRIGGER update_ecommerce_volume_pricing_updated_at
  BEFORE UPDATE ON public.ecommerce_volume_pricing
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Coluna toggle para ativar/desativar seção B2B completa
ALTER TABLE public.ecommerce_config
  ADD COLUMN IF NOT EXISTS feat_b2b_volume BOOLEAN NOT NULL DEFAULT true;
