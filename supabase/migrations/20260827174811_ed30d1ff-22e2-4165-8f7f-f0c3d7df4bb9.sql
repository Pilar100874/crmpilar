CREATE TABLE public.livro_palavras_chave (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  palavra TEXT NOT NULL,
  observacao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.livro_palavras_chave TO authenticated;
GRANT ALL ON public.livro_palavras_chave TO service_role;

ALTER TABLE public.livro_palavras_chave ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados gerenciam palavras-chave"
ON public.livro_palavras_chave
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE TRIGGER update_livro_palavras_chave_updated_at
BEFORE UPDATE ON public.livro_palavras_chave
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();