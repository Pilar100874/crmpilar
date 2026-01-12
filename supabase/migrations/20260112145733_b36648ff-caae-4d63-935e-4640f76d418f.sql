-- Adicionar colunas de CNAE na tabela empresas para análise de concorrência
ALTER TABLE public.empresas 
ADD COLUMN IF NOT EXISTS cnae_principal VARCHAR(10),
ADD COLUMN IF NOT EXISTS cnae_descricao TEXT,
ADD COLUMN IF NOT EXISTS cnaes_secundarios TEXT[];

-- Criar índice para buscas por CNAE
CREATE INDEX IF NOT EXISTS idx_empresas_cnae_principal ON public.empresas(cnae_principal);

-- Criar tabela de CNAEs para referência
CREATE TABLE IF NOT EXISTS public.cnaes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo VARCHAR(10) NOT NULL UNIQUE,
  descricao TEXT NOT NULL,
  secao VARCHAR(5),
  divisao VARCHAR(5),
  grupo VARCHAR(5),
  classe VARCHAR(10),
  subclasse VARCHAR(10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cnaes ENABLE ROW LEVEL SECURITY;

-- Política para leitura pública (CNAEs são dados públicos)
CREATE POLICY "CNAEs são visíveis para todos" 
ON public.cnaes 
FOR SELECT 
USING (true);

-- Inserir alguns CNAEs comuns para exemplo
INSERT INTO public.cnaes (codigo, descricao, secao, divisao, grupo, classe) VALUES
('4711301', 'Comércio varejista de mercadorias em geral, com predominância de produtos alimentícios - hipermercados', 'G', '47', '471', '4711'),
('4711302', 'Comércio varejista de mercadorias em geral, com predominância de produtos alimentícios - supermercados', 'G', '47', '471', '4711'),
('4712100', 'Comércio varejista de mercadorias em geral, com predominância de produtos alimentícios - minimercados, mercearias e armazéns', 'G', '47', '471', '4712'),
('4721102', 'Padaria e confeitaria com predominância de revenda', 'G', '47', '472', '4721'),
('4721103', 'Comércio varejista de laticínios e frios', 'G', '47', '472', '4721'),
('4722901', 'Comércio varejista de carnes - açougues', 'G', '47', '472', '4722'),
('4723700', 'Comércio varejista de bebidas', 'G', '47', '472', '4723'),
('4729699', 'Comércio varejista de produtos alimentícios em geral ou especializado em produtos alimentícios não especificados anteriormente', 'G', '47', '472', '4729'),
('4741500', 'Comércio varejista de tintas e materiais para pintura', 'G', '47', '474', '4741'),
('4742300', 'Comércio varejista de material elétrico', 'G', '47', '474', '4742'),
('4743100', 'Comércio varejista de vidros', 'G', '47', '474', '4743'),
('4744001', 'Comércio varejista de ferragens e ferramentas', 'G', '47', '474', '4744'),
('4744002', 'Comércio varejista de madeira e artefatos', 'G', '47', '474', '4744'),
('4744003', 'Comércio varejista de materiais hidráulicos', 'G', '47', '474', '4744'),
('4744004', 'Comércio varejista de cal, areia, pedra britada, tijolos e telhas', 'G', '47', '474', '4744'),
('4744005', 'Comércio varejista de materiais de construção não especificados anteriormente', 'G', '47', '474', '4744'),
('4744099', 'Comércio varejista de materiais de construção em geral', 'G', '47', '474', '4744'),
('4751201', 'Comércio varejista especializado de equipamentos e suprimentos de informática', 'G', '47', '475', '4751'),
('4752100', 'Comércio varejista especializado de equipamentos de telefonia e comunicação', 'G', '47', '475', '4752'),
('4753900', 'Comércio varejista especializado de eletrodomésticos e equipamentos de áudio e vídeo', 'G', '47', '475', '4753'),
('4754701', 'Comércio varejista de móveis', 'G', '47', '475', '4754'),
('4754702', 'Comércio varejista de artigos de colchoaria', 'G', '47', '475', '4754'),
('4754703', 'Comércio varejista de artigos de iluminação', 'G', '47', '475', '4754'),
('4755501', 'Comércio varejista de tecidos', 'G', '47', '475', '4755'),
('4755502', 'Comercio varejista de artigos de armarinho', 'G', '47', '475', '4755'),
('4755503', 'Comercio varejista de artigos de cama, mesa e banho', 'G', '47', '475', '4755'),
('4756300', 'Comércio varejista especializado de instrumentos musicais e acessórios', 'G', '47', '475', '4756'),
('4757100', 'Comércio varejista especializado de peças e acessórios para aparelhos eletroeletrônicos para uso doméstico, exceto informática e comunicação', 'G', '47', '475', '4757'),
('4759801', 'Comércio varejista de artigos de tapeçaria, cortinas e persianas', 'G', '47', '475', '4759'),
('4761001', 'Comércio varejista de livros', 'G', '47', '476', '4761'),
('4761002', 'Comércio varejista de jornais e revistas', 'G', '47', '476', '4761'),
('4761003', 'Comércio varejista de artigos de papelaria', 'G', '47', '476', '4761'),
('4762800', 'Comércio varejista de discos, CDs, DVDs e fitas', 'G', '47', '476', '4762'),
('4763601', 'Comércio varejista de brinquedos e artigos recreativos', 'G', '47', '476', '4763'),
('4763602', 'Comércio varejista de artigos esportivos', 'G', '47', '476', '4763'),
('4763603', 'Comércio varejista de bicicletas e triciclos; peças e acessórios', 'G', '47', '476', '4763'),
('4763604', 'Comércio varejista de artigos de caça, pesca e camping', 'G', '47', '476', '4763'),
('4771701', 'Comércio varejista de produtos farmacêuticos, sem manipulação de fórmulas', 'G', '47', '477', '4771'),
('4771702', 'Comércio varejista de produtos farmacêuticos, com manipulação de fórmulas', 'G', '47', '477', '4771'),
('4771703', 'Comércio varejista de produtos farmacêuticos homeopáticos', 'G', '47', '477', '4771'),
('4771704', 'Comércio varejista de medicamentos veterinários', 'G', '47', '477', '4771'),
('4772500', 'Comércio varejista de cosméticos, produtos de perfumaria e de higiene pessoal', 'G', '47', '477', '4772'),
('4773300', 'Comércio varejista de artigos médicos e ortopédicos', 'G', '47', '477', '4773'),
('4774100', 'Comércio varejista de artigos de óptica', 'G', '47', '477', '4774'),
('4781400', 'Comércio varejista de artigos do vestuário e acessórios', 'G', '47', '478', '4781'),
('4782201', 'Comércio varejista de calçados', 'G', '47', '478', '4782'),
('4782202', 'Comércio varejista de artigos de viagem', 'G', '47', '478', '4782'),
('4783101', 'Comércio varejista de artigos de joalheria', 'G', '47', '478', '4783'),
('4783102', 'Comércio varejista de artigos de relojoaria', 'G', '47', '478', '4783'),
('4789001', 'Comércio varejista de suvenires, bijuterias e artesanatos', 'G', '47', '478', '4789'),
('4789002', 'Comércio varejista de plantas e flores naturais', 'G', '47', '478', '4789'),
('4789003', 'Comércio varejista de objetos de arte', 'G', '47', '478', '4789'),
('4789004', 'Comércio varejista de animais vivos e de artigos e alimentos para animais de estimação', 'G', '47', '478', '4789'),
('4789005', 'Comércio varejista de produtos saneantes domissanitários', 'G', '47', '478', '4789'),
('4789006', 'Comércio varejista de fogos de artifício e artigos pirotécnicos', 'G', '47', '478', '4789'),
('4789007', 'Comércio varejista de equipamentos para escritório', 'G', '47', '478', '4789'),
('4789008', 'Comércio varejista de artigos fotográficos e para filmagem', 'G', '47', '478', '4789'),
('4789009', 'Comércio varejista de armas e munições', 'G', '47', '478', '4789'),
('5611201', 'Restaurantes e similares', 'I', '56', '561', '5611'),
('5611202', 'Bares e outros estabelecimentos especializados em servir bebidas', 'I', '56', '561', '5611'),
('5611203', 'Lanchonetes, casas de chá, de sucos e similares', 'I', '56', '561', '5611'),
('5611204', 'Bares e outros estabelecimentos especializados em servir bebidas, sem entretenimento', 'I', '56', '561', '5611'),
('5611205', 'Bares e outros estabelecimentos especializados em servir bebidas, com entretenimento', 'I', '56', '561', '5611'),
('5612100', 'Serviços ambulantes de alimentação', 'I', '56', '561', '5612')
ON CONFLICT (codigo) DO NOTHING;

-- Comentário na tabela
COMMENT ON TABLE public.cnaes IS 'Tabela de referência de CNAEs (Classificação Nacional de Atividades Econômicas) para análise de concorrência';
COMMENT ON COLUMN public.empresas.cnae_principal IS 'CNAE principal da empresa para análise de concorrência';
COMMENT ON COLUMN public.empresas.cnae_descricao IS 'Descrição do CNAE principal';
COMMENT ON COLUMN public.empresas.cnaes_secundarios IS 'Lista de CNAEs secundários da empresa';