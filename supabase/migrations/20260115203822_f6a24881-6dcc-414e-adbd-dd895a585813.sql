-- Remove colunas de imagem da tabela produto_grupos
ALTER TABLE public.produto_grupos DROP COLUMN IF EXISTS imagem_referencia;
ALTER TABLE public.produto_grupos DROP COLUMN IF EXISTS imagem_catalogo;