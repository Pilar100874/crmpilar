ALTER TABLE public.empresa_vinculos DROP CONSTRAINT IF EXISTS empresa_vinculo_check;
ALTER TABLE public.empresa_vinculos ADD CONSTRAINT empresa_vinculo_check CHECK (
  usuario_id IS NOT NULL
  OR segmento_id IS NOT NULL
  OR vendedor_id IS NOT NULL
  OR transportadora_id IS NOT NULL
);