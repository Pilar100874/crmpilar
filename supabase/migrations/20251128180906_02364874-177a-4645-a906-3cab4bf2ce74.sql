-- Criar tabela de códigos NCM
CREATE TABLE public.ncm_codigos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo VARCHAR(10) NOT NULL UNIQUE,
  descricao TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.ncm_codigos ENABLE ROW LEVEL SECURITY;

-- Policy de leitura pública (NCM é tabela de referência)
CREATE POLICY "Todos podem visualizar NCMs"
ON public.ncm_codigos FOR SELECT
USING (true);

-- Adicionar campo codigo na tabela produtos
ALTER TABLE public.produtos 
ADD COLUMN IF NOT EXISTS codigo VARCHAR(50);

-- Adicionar campo ncm_id como FK
ALTER TABLE public.produtos 
ADD COLUMN IF NOT EXISTS ncm_id UUID REFERENCES public.ncm_codigos(id);

-- Criar índice único para código por estabelecimento (permite códigos repetidos entre estabelecimentos)
CREATE UNIQUE INDEX IF NOT EXISTS idx_produtos_codigo_estabelecimento 
ON public.produtos(estabelecimento_id, codigo) 
WHERE codigo IS NOT NULL;

-- Criar índice único para nome por estabelecimento (permite nomes repetidos entre estabelecimentos)
CREATE UNIQUE INDEX IF NOT EXISTS idx_produtos_nome_estabelecimento 
ON public.produtos(estabelecimento_id, nome);

-- Inserir alguns códigos NCM básicos (papéis e produtos gráficos)
INSERT INTO public.ncm_codigos (codigo, descricao) VALUES
('4801.00.00', 'Papel de jornal, em rolos ou em folhas'),
('4802.10.00', 'Papel e cartão feitos à mão'),
('4802.20.00', 'Papel e cartão próprios para fabricação de papéis fotossensíveis'),
('4802.40.10', 'Papel base para decoração de interiores'),
('4802.54.10', 'Papel offset (com matérias-primas de fibras obtidas por processo mecânico)'),
('4802.54.91', 'Outros papéis de peso inferior a 40 g/m²'),
('4802.54.99', 'Outros papéis de peso igual ou superior a 40 g/m²'),
('4802.55.10', 'Papel offset (com matérias-primas de fibras obtidas por processo químico)'),
('4802.55.91', 'Outros papéis de peso inferior a 40 g/m²'),
('4802.55.99', 'Outros papéis de peso igual ou superior a 40 g/m² e inferior a 150 g/m²'),
('4802.56.10', 'Papel offset de peso igual ou superior a 150 g/m²'),
('4802.56.91', 'Outros papéis de peso igual ou superior a 150 g/m² e inferior a 225 g/m²'),
('4802.56.99', 'Outros papéis de peso igual ou superior a 225 g/m²'),
('4802.57.10', 'Papel offset não revestido, de peso inferior a 40 g/m²'),
('4802.57.99', 'Outros papéis de peso igual ou superior a 40 g/m² e inferior a 150 g/m²'),
('4802.58.10', 'Papel offset não revestido, de peso igual ou superior a 150 g/m²'),
('4802.58.99', 'Outros papéis de peso igual ou superior a 150 g/m²'),
('4802.61.10', 'Papel offset, em rolos, de peso inferior a 40 g/m²'),
('4802.61.91', 'Outros papéis em rolos, de peso inferior a 40 g/m²'),
('4802.61.99', 'Outros papéis em rolos, de peso igual ou superior a 40 g/m² e inferior a 150 g/m²'),
('4802.62.10', 'Papel offset, em rolos, de peso igual ou superior a 150 g/m²'),
('4802.62.99', 'Outros papéis em rolos, de peso igual ou superior a 150 g/m²'),
('4802.69.10', 'Papel offset, em folhas, de peso inferior a 40 g/m²'),
('4802.69.91', 'Outros papéis em folhas, de peso inferior a 40 g/m²'),
('4802.69.99', 'Outros papéis em folhas, de peso igual ou superior a 40 g/m²'),
('4810.13.10', 'Papel couché, em rolos'),
('4810.13.90', 'Outros papéis cuchê'),
('4810.14.10', 'Papel couché, em folhas'),
('4810.14.90', 'Outros papéis couché em folhas'),
('4810.19.10', 'Papel kraftliner, em rolos'),
('4810.19.90', 'Outros papéis kraft'),
('4810.22.10', 'Papel LWC, em rolos'),
('4810.22.90', 'Outros papéis LWC'),
('4810.29.10', 'Papel couché madeira, em rolos'),
('4810.29.90', 'Outros papéis couché madeira'),
('4810.31.10', 'Papel branqueado kraft, em rolos'),
('4810.31.90', 'Outros papéis branqueados kraft'),
('4810.32.10', 'Papel branqueado kraft, em folhas'),
('4810.32.90', 'Outros papéis branqueados kraft em folhas'),
('4810.39.10', 'Outros papéis kraft, em rolos'),
('4810.39.90', 'Outros papéis kraft, em folhas'),
('4810.92.10', 'Papel multicamadas, em rolos'),
('4810.92.90', 'Outros papéis multicamadas'),
('4810.99.10', 'Outros papéis revestidos, em rolos'),
('4810.99.90', 'Outros papéis revestidos, em folhas'),
('4811.10.00', 'Papel e cartão alcatroados, betumados ou asfaltados'),
('4811.41.10', 'Papel e cartão autoadesivos, em rolos'),
('4811.41.90', 'Outros papéis e cartões autoadesivos'),
('4811.49.10', 'Papel e cartão gomados ou adesivos, em rolos'),
('4811.49.90', 'Outros papéis e cartões gomados ou adesivos'),
('4811.51.10', 'Papel e cartão revestidos de plástico, branqueados'),
('4811.51.90', 'Outros papéis e cartões revestidos de plástico'),
('4811.59.10', 'Papel e cartão impregnados de plástico'),
('4811.59.90', 'Outros papéis e cartões impregnados'),
('4811.60.10', 'Papel e cartão revestidos de cera'),
('4811.60.90', 'Outros papéis e cartões encerados'),
('4811.90.10', 'Outros papéis e cartões, em rolos'),
('4811.90.90', 'Outros papéis e cartões, em folhas'),
('4820.10.00', 'Cadernos de anotações, blocos para cartas, agendas'),
('4820.20.00', 'Cadernos escolares'),
('4820.30.00', 'Classificadores, capas para encadernação'),
('4820.40.00', 'Formulários em blocos tipo "manifold"'),
('4820.50.00', 'Álbuns para amostras ou para coleções'),
('4820.90.00', 'Outros artigos de papelaria'),
('4821.10.00', 'Etiquetas de papel ou cartão, impressas'),
('4821.90.00', 'Outras etiquetas de papel ou cartão'),
('4823.20.10', 'Papel-filtro, em rolos'),
('4823.20.90', 'Outros papéis-filtro'),
('4823.40.00', 'Bobinas, carretéis, canelas e suportes semelhantes'),
('4823.61.00', 'Bandejas, travessas, pratos, xícaras, taças, copos e artigos semelhantes, de papel ou cartão'),
('4823.69.00', 'Outros artigos para mesa e cozinha, de papel ou cartão'),
('4823.70.00', 'Artigos moldados ou prensados de pasta de papel'),
('4823.90.10', 'Outros artigos de papel e cartão, em rolos'),
('4823.90.90', 'Outros artigos de papel e cartão')
ON CONFLICT (codigo) DO NOTHING;