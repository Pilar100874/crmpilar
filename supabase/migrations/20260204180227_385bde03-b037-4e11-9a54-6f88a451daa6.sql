-- Adicionar coluna segmento_id na tabela empresas
ALTER TABLE public.empresas 
ADD COLUMN segmento_id uuid REFERENCES public.segmentos(id) ON DELETE SET NULL;

-- Criar índice para melhor performance
CREATE INDEX idx_empresas_segmento_id ON public.empresas(segmento_id);