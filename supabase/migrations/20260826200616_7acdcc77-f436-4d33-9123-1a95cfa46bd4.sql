CREATE TABLE public.transp_motoristas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL,
  transportadora_id uuid REFERENCES public.empresas(id) ON DELETE SET NULL,
  nome text NOT NULL,
  cpf text,
  cnh text,
  whatsapp text,
  observacoes text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transp_motoristas TO authenticated;
GRANT ALL ON public.transp_motoristas TO service_role;
ALTER TABLE public.transp_motoristas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transp_motoristas_tenant" ON public.transp_motoristas FOR ALL TO authenticated
USING (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()))
WITH CHECK (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()));

CREATE TABLE public.transp_veiculos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL,
  transportadora_id uuid REFERENCES public.empresas(id) ON DELETE SET NULL,
  placa text NOT NULL,
  descricao text,
  tipo_veiculo text,
  observacoes text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transp_veiculos TO authenticated;
GRANT ALL ON public.transp_veiculos TO service_role;
ALTER TABLE public.transp_veiculos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transp_veiculos_tenant" ON public.transp_veiculos FOR ALL TO authenticated
USING (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()))
WITH CHECK (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()));

CREATE TABLE public.transp_movimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL,
  transportadora_id uuid REFERENCES public.empresas(id) ON DELETE SET NULL,
  veiculo_id uuid REFERENCES public.transp_veiculos(id) ON DELETE SET NULL,
  motorista_id uuid REFERENCES public.transp_motoristas(id) ON DELETE SET NULL,
  placa text,
  motorista_nome text,
  ajudante_nome text,
  documento text,
  motivo text,
  entrada_time timestamptz NOT NULL DEFAULT now(),
  entrada_obs text,
  entrada_por uuid,
  saida_time timestamptz,
  saida_obs text,
  saida_por uuid,
  status text NOT NULL DEFAULT 'dentro',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transp_movimentos TO authenticated;
GRANT ALL ON public.transp_movimentos TO service_role;
ALTER TABLE public.transp_movimentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transp_movimentos_tenant" ON public.transp_movimentos FOR ALL TO authenticated
USING (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()))
WITH CHECK (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()));

CREATE TABLE public.transp_movimento_fotos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movimento_id uuid NOT NULL REFERENCES public.transp_movimentos(id) ON DELETE CASCADE,
  stage text NOT NULL,
  angle_key text,
  angle_label text,
  photo_url text NOT NULL,
  caption text,
  is_extra boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transp_movimento_fotos TO authenticated;
GRANT ALL ON public.transp_movimento_fotos TO service_role;
ALTER TABLE public.transp_movimento_fotos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transp_movimento_fotos_tenant" ON public.transp_movimento_fotos FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.transp_movimentos m WHERE m.id = movimento_id AND m.estabelecimento_id = public.get_user_estabelecimento_id(auth.uid())))
WITH CHECK (EXISTS (SELECT 1 FROM public.transp_movimentos m WHERE m.id = movimento_id AND m.estabelecimento_id = public.get_user_estabelecimento_id(auth.uid())));

CREATE INDEX idx_transp_movimentos_status ON public.transp_movimentos (estabelecimento_id, status);
CREATE INDEX idx_transp_movimento_fotos_mov ON public.transp_movimento_fotos (movimento_id);

CREATE TRIGGER transp_motoristas_updated_at BEFORE UPDATE ON public.transp_motoristas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER transp_veiculos_updated_at BEFORE UPDATE ON public.transp_veiculos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER transp_movimentos_updated_at BEFORE UPDATE ON public.transp_movimentos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();