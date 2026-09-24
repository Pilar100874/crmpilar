ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS tipo_vendedor text;
UPDATE public.empresas SET tipo_vendedor = 'representante' WHERE tipo_cliente = 'vendedor' AND tipo_vendedor IS NULL;
ALTER TABLE public.empresas ADD CONSTRAINT empresas_tipo_vendedor_check CHECK (tipo_vendedor IS NULL OR tipo_vendedor IN ('funcionario','representante'));