ALTER TABLE public.ponto_funcionarios
ADD COLUMN IF NOT EXISTS layout_exportacao_id uuid REFERENCES public.ponto_export_layouts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ponto_funcionarios_layout_exp ON public.ponto_funcionarios(layout_exportacao_id);

COMMENT ON COLUMN public.ponto_funcionarios.layout_exportacao_id IS
'Layout de folha aplicado a este funcionário na exportação consolidada. Funcionários sem layout caem no layout padrão escolhido na tela de exportação.';