CREATE TABLE public.tv_veiculos_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL UNIQUE,
  autonomo_ativo BOOLEAN NOT NULL DEFAULT true,
  overview_segundos INTEGER NOT NULL DEFAULT 25,
  foco_segundos INTEGER NOT NULL DEFAULT 15,
  trilha_minutos INTEGER NOT NULL DEFAULT 15,
  pausa_interacao_segundos INTEGER NOT NULL DEFAULT 90,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tv_veiculos_config TO authenticated;
GRANT ALL ON public.tv_veiculos_config TO service_role;

ALTER TABLE public.tv_veiculos_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver config TV do estabelecimento" ON public.tv_veiculos_config
FOR SELECT TO authenticated
USING (estabelecimento_id = get_user_estabelecimento_id(auth.uid()));

CREATE POLICY "Gerenciar config TV do estabelecimento" ON public.tv_veiculos_config
FOR ALL TO authenticated
USING (estabelecimento_id = get_user_estabelecimento_id(auth.uid()))
WITH CHECK (estabelecimento_id = get_user_estabelecimento_id(auth.uid()));

CREATE TRIGGER update_tv_veiculos_config_updated_at
BEFORE UPDATE ON public.tv_veiculos_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();