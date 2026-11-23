ALTER TABLE public.notas_fiscais ADD COLUMN IF NOT EXISTS situacao text NOT NULL DEFAULT 'rascunho';
ALTER TABLE public.notas_fiscais ADD COLUMN IF NOT EXISTS chave_idempotencia text;
CREATE UNIQUE INDEX IF NOT EXISTS notas_fiscais_idem_uk ON public.notas_fiscais(estabelecimento_id, chave_idempotencia) WHERE chave_idempotencia IS NOT NULL;
UPDATE public.notas_fiscais SET situacao = CASE status WHEN 'emitida' THEN 'autorizada' WHEN 'cancelada' THEN 'cancelada' ELSE 'rascunho' END;

CREATE TABLE public.nfe_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL,
  unidade_id uuid,
  modelo text NOT NULL DEFAULT '55',
  serie integer NOT NULL,
  ambiente text NOT NULL DEFAULT 'homologacao',
  proximo_numero bigint NOT NULL DEFAULT 1,
  ativa boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (estabelecimento_id, unidade_id, modelo, serie, ambiente)
);
CREATE TABLE public.nfe_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL,
  nota_id uuid REFERENCES public.notas_fiscais(id) ON DELETE SET NULL,
  tipo text NOT NULL,
  situacao text NOT NULL DEFAULT 'pendente',
  justificativa text,
  protocolo text,
  sequencia integer NOT NULL DEFAULT 1,
  dados jsonb NOT NULL DEFAULT '{}'::jsonb,
  usuario_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.nfe_transmissoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL,
  nota_id uuid REFERENCES public.notas_fiscais(id) ON DELETE CASCADE,
  resultado text NOT NULL,
  codigo_status text,
  mensagem text,
  usuario_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.fiscal_consultas_systax (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL,
  nota_id uuid,
  origem text NOT NULL DEFAULT 'faturamento',
  requisicao jsonb NOT NULL DEFAULT '{}'::jsonb,
  resposta jsonb,
  sucesso boolean NOT NULL DEFAULT false,
  erro text,
  versao_integracao text,
  usuario_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.nfe_entrada_conferencia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL,
  nota_id uuid NOT NULL REFERENCES public.notas_fiscais(id) ON DELETE CASCADE,
  situacao text NOT NULL DEFAULT 'pendente',
  divergencias text,
  estoque_lancado boolean NOT NULL DEFAULT false,
  usuario_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (nota_id)
);

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['nfe_series','nfe_eventos','nfe_transmissoes','fiscal_consultas_systax','nfe_entrada_conferencia'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "Internos da empresa" ON public.%I FOR ALL TO authenticated USING (public.is_usuario_interno(auth.uid()) AND estabelecimento_id = public.get_auth_user_estabelecimento_id()) WITH CHECK (public.is_usuario_interno(auth.uid()) AND estabelecimento_id = public.get_auth_user_estabelecimento_id())', t);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.nfe_reservar_numero(p_serie_id uuid)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n bigint;
BEGIN
  UPDATE public.nfe_series SET proximo_numero = proximo_numero + 1, updated_at = now()
   WHERE id = p_serie_id AND ativa AND estabelecimento_id = public.get_auth_user_estabelecimento_id()
     AND public.is_usuario_interno(auth.uid())
  RETURNING proximo_numero - 1 INTO n;
  IF n IS NULL THEN RAISE EXCEPTION 'Série não encontrada ou inativa'; END IF;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.nfe_reservar_numero(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.nfe_reservar_numero(uuid) TO authenticated;