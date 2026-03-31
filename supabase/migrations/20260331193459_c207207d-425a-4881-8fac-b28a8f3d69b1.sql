
ALTER TABLE public.ecommerce_config
  ADD COLUMN IF NOT EXISTS b2b_hero_subtitulo text,
  ADD COLUMN IF NOT EXISTS b2b_btn_primario text DEFAULT 'Solicitar Cadastro B2B',
  ADD COLUMN IF NOT EXISTS b2b_btn_secundario text DEFAULT 'Falar com Consultor',
  ADD COLUMN IF NOT EXISTS b2b_secao_vantagens_titulo text DEFAULT 'Vantagens exclusivas para empresas',
  ADD COLUMN IF NOT EXISTS b2b_secao_vantagens_subtitulo text DEFAULT 'Tudo que você precisa para otimizar suas compras corporativas',
  ADD COLUMN IF NOT EXISTS b2b_volume_table jsonb,
  ADD COLUMN IF NOT EXISTS b2b_como_funciona jsonb,
  ADD COLUMN IF NOT EXISTS b2b_depoimentos jsonb,
  ADD COLUMN IF NOT EXISTS b2b_cta_titulo text DEFAULT 'Pronto para economizar?',
  ADD COLUMN IF NOT EXISTS b2b_cta_subtitulo text DEFAULT 'Junte-se a mais de 500 empresas que já compram conosco com condições especiais.',
  ADD COLUMN IF NOT EXISTS b2b_cta_botao text DEFAULT 'Criar Conta B2B',
  ADD COLUMN IF NOT EXISTS b2b_form_titulo text DEFAULT 'Solicite seu cadastro B2B',
  ADD COLUMN IF NOT EXISTS b2b_form_subtitulo text DEFAULT 'Preencha os dados abaixo e retornaremos em até 24h',
  ADD COLUMN IF NOT EXISTS b2b_secoes_visiveis jsonb DEFAULT '{"hero":true,"vantagens":true,"volume":true,"como_funciona":true,"formulario":true,"depoimentos":true,"cta":true}'::jsonb;
