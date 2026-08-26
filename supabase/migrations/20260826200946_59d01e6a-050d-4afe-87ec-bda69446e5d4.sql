ALTER TABLE public.transp_movimentos
  ADD COLUMN tipo_operacao text NOT NULL DEFAULT 'entrega',
  ADD COLUMN nfe_chave text,
  ADD COLUMN nfe_dados jsonb;