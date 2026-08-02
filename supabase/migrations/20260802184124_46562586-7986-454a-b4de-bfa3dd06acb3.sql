CREATE TABLE public.aip_server_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave text NOT NULL UNIQUE,
  valor_cifrado text NOT NULL,
  mascara text,
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_por uuid,
  enviado_em timestamptz
);

GRANT ALL ON public.aip_server_config TO service_role;

ALTER TABLE public.aip_server_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "aip_server_config service role"
ON public.aip_server_config FOR ALL
TO service_role
USING (true) WITH CHECK (true);