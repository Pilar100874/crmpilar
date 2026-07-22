
-- Adiciona campo tipo (padrao/gerente) na tabela usuarios
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'padrao';
CREATE INDEX IF NOT EXISTS idx_usuarios_tipo ON public.usuarios(tipo);

-- Tabela de vínculo gerente x vendedor (vendedor = empresas.tipo_cliente='vendedor')
CREATE TABLE IF NOT EXISTS public.gerente_vendedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gerente_usuario_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  vendedor_empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  estabelecimento_id uuid NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (gerente_usuario_id, vendedor_empresa_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gerente_vendedores TO authenticated;
GRANT ALL ON public.gerente_vendedores TO service_role;

ALTER TABLE public.gerente_vendedores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gerente_vendedores_tenant_select" ON public.gerente_vendedores
  FOR SELECT TO authenticated
  USING (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "gerente_vendedores_tenant_insert" ON public.gerente_vendedores
  FOR INSERT TO authenticated
  WITH CHECK (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "gerente_vendedores_tenant_update" ON public.gerente_vendedores
  FOR UPDATE TO authenticated
  USING (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "gerente_vendedores_tenant_delete" ON public.gerente_vendedores
  FOR DELETE TO authenticated
  USING (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_gerente_vendedores_gerente ON public.gerente_vendedores(gerente_usuario_id);
CREATE INDEX IF NOT EXISTS idx_gerente_vendedores_vendedor ON public.gerente_vendedores(vendedor_empresa_id);
CREATE INDEX IF NOT EXISTS idx_gerente_vendedores_estab ON public.gerente_vendedores(estabelecimento_id);

CREATE TRIGGER trg_gerente_vendedores_updated_at
  BEFORE UPDATE ON public.gerente_vendedores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
