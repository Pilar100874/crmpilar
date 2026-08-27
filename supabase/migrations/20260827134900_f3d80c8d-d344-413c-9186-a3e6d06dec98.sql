CREATE TABLE public.transp_setores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL,
  nome text NOT NULL,
  whatsapp text,
  observacoes text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.transp_setores TO authenticated;
GRANT ALL ON public.transp_setores TO service_role;

ALTER TABLE public.transp_setores ENABLE ROW LEVEL SECURITY;

CREATE POLICY transp_setores_tenant ON public.transp_setores
  FOR ALL TO authenticated
  USING (estabelecimento_id = get_user_estabelecimento_id(auth.uid()))
  WITH CHECK (estabelecimento_id = get_user_estabelecimento_id(auth.uid()));

CREATE TRIGGER transp_setores_updated_at
  BEFORE UPDATE ON public.transp_setores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.transp_movimentos
  ADD COLUMN IF NOT EXISTS setor_id uuid REFERENCES public.transp_setores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS setor_avisado_at timestamptz,
  ADD COLUMN IF NOT EXISTS liberado_time timestamptz,
  ADD COLUMN IF NOT EXISTS liberado_por uuid,
  ADD COLUMN IF NOT EXISTS liberado_obs text,
  ADD COLUMN IF NOT EXISTS saida_nfe_chave text,
  ADD COLUMN IF NOT EXISTS saida_nfe_dados jsonb;