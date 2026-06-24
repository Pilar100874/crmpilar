
CREATE TABLE public.ponto_export_layouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.ponto_empresas(id) ON DELETE CASCADE,
  software text NOT NULL DEFAULT 'dominio_layout1',
  descricao text NOT NULL,
  tamanho_matricula int NOT NULL DEFAULT 10,
  incluir_dias_falta boolean NOT NULL DEFAULT true,
  periodo_inicio date,
  periodo_fim date,
  formato_horas text NOT NULL DEFAULT 'sexagesimal',
  filtrar_por text NOT NULL DEFAULT 'nenhum',
  filtro_fechamento text,
  desconsiderar_ignoradas_bh boolean NOT NULL DEFAULT true,
  considerar_abono_parcial boolean NOT NULL DEFAULT false,
  considerar_suspensao boolean NOT NULL DEFAULT true,
  considerar_banco_horas boolean NOT NULL DEFAULT true,
  considerar_comissionistas boolean NOT NULL DEFAULT true,
  token_integracao text,
  eventos jsonb NOT NULL DEFAULT '[]'::jsonb,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_export_layouts TO authenticated;
GRANT ALL ON public.ponto_export_layouts TO service_role;
ALTER TABLE public.ponto_export_layouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ponto_export_layouts tenant" ON public.ponto_export_layouts FOR ALL
  USING (EXISTS (SELECT 1 FROM public.ponto_empresas e WHERE e.id = empresa_id AND e.estabelecimento_id = public.get_auth_user_estabelecimento_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.ponto_empresas e WHERE e.id = empresa_id AND e.estabelecimento_id = public.get_auth_user_estabelecimento_id()));
CREATE TRIGGER trg_ponto_export_layouts_upd BEFORE UPDATE ON public.ponto_export_layouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
