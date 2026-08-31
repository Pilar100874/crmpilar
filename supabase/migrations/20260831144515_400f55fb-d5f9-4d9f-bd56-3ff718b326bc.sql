ALTER TABLE public.vis_access_records ADD COLUMN IF NOT EXISTS unidade_id uuid REFERENCES public.unidades(id) ON DELETE SET NULL;
ALTER TABLE public.vis_visitors ADD COLUMN IF NOT EXISTS unidade_id uuid REFERENCES public.unidades(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_vis_access_records_unidade ON public.vis_access_records(unidade_id);
CREATE INDEX IF NOT EXISTS idx_vis_visitors_unidade ON public.vis_visitors(unidade_id);

DROP TRIGGER IF EXISTS trg_vis_access_records_unidade ON public.vis_access_records;
CREATE TRIGGER trg_vis_access_records_unidade
BEFORE INSERT ON public.vis_access_records
FOR EACH ROW EXECUTE FUNCTION public.set_unidade_atual();

DROP TRIGGER IF EXISTS trg_vis_visitors_unidade ON public.vis_visitors;
CREATE TRIGGER trg_vis_visitors_unidade
BEFORE INSERT ON public.vis_visitors
FOR EACH ROW EXECUTE FUNCTION public.set_unidade_atual();