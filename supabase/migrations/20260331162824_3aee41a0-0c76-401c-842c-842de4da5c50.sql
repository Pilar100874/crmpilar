
CREATE TABLE public.cupons_desconto (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  codigo TEXT NOT NULL,
  descricao TEXT,
  tipo_desconto TEXT NOT NULL DEFAULT 'percentual',
  valor_desconto NUMERIC NOT NULL DEFAULT 0,
  valor_minimo_pedido NUMERIC DEFAULT 0,
  usos_maximos INTEGER,
  usos_atuais INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  data_inicio TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_fim TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (estabelecimento_id, codigo)
);

ALTER TABLE public.cupons_desconto ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver cupons do seu estabelecimento"
ON public.cupons_desconto FOR SELECT TO authenticated
USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE POLICY "Usuários podem criar cupons do seu estabelecimento"
ON public.cupons_desconto FOR INSERT TO authenticated
WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE POLICY "Usuários podem atualizar cupons do seu estabelecimento"
ON public.cupons_desconto FOR UPDATE TO authenticated
USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE POLICY "Usuários podem deletar cupons do seu estabelecimento"
ON public.cupons_desconto FOR DELETE TO authenticated
USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE POLICY "Cupons ativos são visíveis publicamente"
ON public.cupons_desconto FOR SELECT TO anon
USING (ativo = true AND (data_fim IS NULL OR data_fim > now()));

CREATE TRIGGER update_cupons_desconto_updated_at
BEFORE UPDATE ON public.cupons_desconto
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
