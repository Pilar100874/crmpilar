
ALTER TABLE public.visita_formulario_respostas
  ALTER COLUMN ocorrencia_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS origem_preenchimento text NOT NULL DEFAULT 'visita';

CREATE INDEX IF NOT EXISTS idx_vfresp_empresa ON public.visita_formulario_respostas(empresa_id);

ALTER TABLE public.visita_formulario_respostas
  DROP CONSTRAINT IF EXISTS vfresp_has_target;
ALTER TABLE public.visita_formulario_respostas
  ADD CONSTRAINT vfresp_has_target CHECK (ocorrencia_id IS NOT NULL OR empresa_id IS NOT NULL);
