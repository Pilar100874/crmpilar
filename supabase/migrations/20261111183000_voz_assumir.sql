ALTER TABLE public.voz_chamadas ADD COLUMN IF NOT EXISTS assumir_pedido_em timestamptz;
ALTER TABLE public.voz_chamadas ADD COLUMN IF NOT EXISTS assumir_por uuid;
