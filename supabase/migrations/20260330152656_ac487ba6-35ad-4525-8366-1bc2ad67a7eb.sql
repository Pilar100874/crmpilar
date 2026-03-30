
ALTER TABLE public.ecommerce_config
ADD COLUMN IF NOT EXISTS hero_badge TEXT DEFAULT '🔥 Ofertas especiais esta semana',
ADD COLUMN IF NOT EXISTS hero_titulo TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS hero_subtitulo TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS hero_btn_primario TEXT DEFAULT 'Comprar Agora',
ADD COLUMN IF NOT EXISTS hero_btn_secundario TEXT DEFAULT 'Atacado / B2B',
ADD COLUMN IF NOT EXISTS hero_stat_satisfacao TEXT DEFAULT '98%',
ADD COLUMN IF NOT EXISTS beneficios JSONB DEFAULT '[
  {"icone":"truck","titulo":"Frete grátis acima de R$ 500","subtitulo":"Para todo o Brasil"},
  {"icone":"shield","titulo":"Compra segura","subtitulo":"Dados protegidos"},
  {"icone":"rotate","titulo":"Troca facilitada","subtitulo":"Até 30 dias"},
  {"icone":"headphones","titulo":"Suporte dedicado","subtitulo":"Atendimento rápido"}
]'::jsonb,
ADD COLUMN IF NOT EXISTS b2b_badge TEXT DEFAULT 'Para Empresas',
ADD COLUMN IF NOT EXISTS b2b_titulo TEXT DEFAULT 'Compre no atacado com condições exclusivas',
ADD COLUMN IF NOT EXISTS b2b_descricao TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS b2b_vantagens JSONB DEFAULT '["Até 40% de desconto","Pedido mínimo flexível","Conta multi-usuário","Pagamento faturado"]'::jsonb,
ADD COLUMN IF NOT EXISTS depoimentos JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS newsletter_titulo TEXT DEFAULT 'Receba ofertas exclusivas',
ADD COLUMN IF NOT EXISTS newsletter_subtitulo TEXT DEFAULT 'Cadastre-se e ganhe 10% de desconto na primeira compra',
ADD COLUMN IF NOT EXISTS secoes_visiveis JSONB DEFAULT '{"hero":true,"beneficios":true,"categorias":true,"produtos":true,"b2b":true,"depoimentos":true,"newsletter":true}'::jsonb;
