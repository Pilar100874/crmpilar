ALTER TABLE public.livro_ocorrencias
  ADD COLUMN IF NOT EXISTS porteiro_id uuid REFERENCES public.porteiros(id) ON DELETE SET NULL;

ALTER TABLE public.livro_encomendas
  ADD COLUMN IF NOT EXISTS porteiro_id uuid REFERENCES public.porteiros(id) ON DELETE SET NULL;

ALTER TABLE public.transp_movimentos
  ADD COLUMN IF NOT EXISTS porteiro_entrada_id uuid REFERENCES public.porteiros(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS porteiro_entrada_nome text,
  ADD COLUMN IF NOT EXISTS porteiro_saida_id uuid REFERENCES public.porteiros(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS porteiro_saida_nome text;

ALTER TABLE public.vis_access_records
  ADD COLUMN IF NOT EXISTS porteiro_entrada_id uuid REFERENCES public.porteiros(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS porteiro_entrada_nome text,
  ADD COLUMN IF NOT EXISTS porteiro_saida_id uuid REFERENCES public.porteiros(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS porteiro_saida_nome text;

ALTER TABLE public.cv_vehicle_movements
  ADD COLUMN IF NOT EXISTS porteiro_saida_id uuid REFERENCES public.porteiros(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS porteiro_saida_nome text,
  ADD COLUMN IF NOT EXISTS porteiro_entrada_id uuid REFERENCES public.porteiros(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS porteiro_entrada_nome text;