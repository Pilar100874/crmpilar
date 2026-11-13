CREATE TABLE public.epi_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.ponto_empresas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  categoria text,
  ca_numero text,
  ca_validade date,
  fabricante text,
  tamanho text,
  vida_util_dias integer,
  estoque integer NOT NULL DEFAULT 0,
  estoque_minimo integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.epi_entregas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.ponto_empresas(id) ON DELETE CASCADE,
  funcionario_id uuid NOT NULL REFERENCES public.ponto_funcionarios(id) ON DELETE CASCADE,
  epi_id uuid NOT NULL REFERENCES public.epi_itens(id) ON DELETE RESTRICT,
  quantidade integer NOT NULL DEFAULT 1,
  data_entrega date NOT NULL DEFAULT current_date,
  motivo text NOT NULL DEFAULT 'primeira_entrega',
  ca_numero text,
  troca_prevista date,
  data_devolucao date,
  motivo_devolucao text,
  assinatura text,
  observacoes text,
  entregue_por uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.epi_itens TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.epi_entregas TO authenticated;
GRANT ALL ON public.epi_itens TO service_role;
GRANT ALL ON public.epi_entregas TO service_role;
ALTER TABLE public.epi_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.epi_entregas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "epi_itens tenant" ON public.epi_itens FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.ponto_empresas e WHERE e.id = epi_itens.empresa_id AND e.estabelecimento_id = public.get_auth_user_estabelecimento_id()))
WITH CHECK (EXISTS (SELECT 1 FROM public.ponto_empresas e WHERE e.id = epi_itens.empresa_id AND e.estabelecimento_id = public.get_auth_user_estabelecimento_id()));
CREATE POLICY "epi_entregas tenant" ON public.epi_entregas FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.ponto_empresas e WHERE e.id = epi_entregas.empresa_id AND e.estabelecimento_id = public.get_auth_user_estabelecimento_id()))
WITH CHECK (EXISTS (SELECT 1 FROM public.ponto_empresas e WHERE e.id = epi_entregas.empresa_id AND e.estabelecimento_id = public.get_auth_user_estabelecimento_id()));
CREATE INDEX ON public.epi_entregas (funcionario_id);
CREATE INDEX ON public.epi_entregas (epi_id);

CREATE OR REPLACE FUNCTION public.epi_entregas_estoque() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE epi_itens SET estoque = estoque - NEW.quantidade, updated_at = now() WHERE id = NEW.epi_id;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.data_devolucao IS NULL THEN
      UPDATE epi_itens SET estoque = estoque + OLD.quantidade, updated_at = now() WHERE id = OLD.epi_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;
CREATE TRIGGER epi_entregas_estoque_trg AFTER INSERT OR DELETE ON public.epi_entregas
FOR EACH ROW EXECUTE FUNCTION public.epi_entregas_estoque();