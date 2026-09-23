CREATE TABLE public.customer_fluxo_inativacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  usuario_id uuid NOT NULL,
  estabelecimento_id uuid NOT NULL,
  motivo text NOT NULL,
  canal text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_fluxo_inativacoes TO authenticated;
GRANT ALL ON public.customer_fluxo_inativacoes TO service_role;
ALTER TABLE public.customer_fluxo_inativacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Estabelecimento vê inativações" ON public.customer_fluxo_inativacoes
  FOR SELECT TO authenticated USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());
CREATE POLICY "Usuário registra inativação" ON public.customer_fluxo_inativacoes
  FOR INSERT TO authenticated WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id() AND usuario_id = public.get_current_usuario_id());
CREATE POLICY "Estabelecimento atualiza inativações" ON public.customer_fluxo_inativacoes
  FOR UPDATE TO authenticated USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());
CREATE INDEX idx_cfi_customer ON public.customer_fluxo_inativacoes(customer_id) WHERE ativo;
CREATE TRIGGER trg_cfi_updated BEFORE UPDATE ON public.customer_fluxo_inativacoes
  FOR EACH ROW EXECUTE FUNCTION public.aip_touch_updated_at();