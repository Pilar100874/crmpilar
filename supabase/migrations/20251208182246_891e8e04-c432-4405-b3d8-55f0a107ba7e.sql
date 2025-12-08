-- Adicionar colunas IMAP na tabela usuarios (renomeando pop para imap)
ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS imap TEXT,
ADD COLUMN IF NOT EXISTS porta_imap INTEGER;

-- Copiar dados de pop para imap se existirem
UPDATE public.usuarios 
SET imap = pop, porta_imap = porta_pop 
WHERE pop IS NOT NULL AND imap IS NULL;