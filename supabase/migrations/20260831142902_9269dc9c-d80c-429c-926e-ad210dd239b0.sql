-- 1) Helper functions
CREATE OR REPLACE FUNCTION public.get_minha_unidade_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.unidade_id FROM public.usuarios u WHERE u.auth_user_id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.pode_acessar_unidade(_unidade_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR (
      _unidade_id IS NOT NULL
      AND _unidade_id = public.get_minha_unidade_id()
    )
    OR (
      _unidade_id IS NULL
      AND public.get_minha_unidade_id() IS NULL
    )
$$;

GRANT EXECUTE ON FUNCTION public.get_minha_unidade_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.pode_acessar_unidade(uuid) TO authenticated;

-- 2) Add unidade_id columns
ALTER TABLE public.port_people        ADD COLUMN IF NOT EXISTS unidade_id uuid REFERENCES public.unidades(id) ON DELETE SET NULL;
ALTER TABLE public.port_visitors      ADD COLUMN IF NOT EXISTS unidade_id uuid REFERENCES public.unidades(id) ON DELETE SET NULL;
ALTER TABLE public.port_access_points ADD COLUMN IF NOT EXISTS unidade_id uuid REFERENCES public.unidades(id) ON DELETE SET NULL;
ALTER TABLE public.port_devices       ADD COLUMN IF NOT EXISTS unidade_id uuid REFERENCES public.unidades(id) ON DELETE SET NULL;
ALTER TABLE public.transp_movimentos  ADD COLUMN IF NOT EXISTS unidade_id uuid REFERENCES public.unidades(id) ON DELETE SET NULL;
ALTER TABLE public.transp_veiculos    ADD COLUMN IF NOT EXISTS unidade_id uuid REFERENCES public.unidades(id) ON DELETE SET NULL;
ALTER TABLE public.transp_motoristas  ADD COLUMN IF NOT EXISTS unidade_id uuid REFERENCES public.unidades(id) ON DELETE SET NULL;
ALTER TABLE public.transp_setores     ADD COLUMN IF NOT EXISTS unidade_id uuid REFERENCES public.unidades(id) ON DELETE SET NULL;
ALTER TABLE public.livro_ocorrencias  ADD COLUMN IF NOT EXISTS unidade_id uuid REFERENCES public.unidades(id) ON DELETE SET NULL;
ALTER TABLE public.livro_encomendas   ADD COLUMN IF NOT EXISTS unidade_id uuid REFERENCES public.unidades(id) ON DELETE SET NULL;
ALTER TABLE public.cv_vehicles        ADD COLUMN IF NOT EXISTS unidade_id uuid REFERENCES public.unidades(id) ON DELETE SET NULL;
ALTER TABLE public.cv_vehicle_movements ADD COLUMN IF NOT EXISTS unidade_id uuid REFERENCES public.unidades(id) ON DELETE SET NULL;
ALTER TABLE public.cv_drivers         ADD COLUMN IF NOT EXISTS unidade_id uuid REFERENCES public.unidades(id) ON DELETE SET NULL;
ALTER TABLE public.cv_helpers         ADD COLUMN IF NOT EXISTS unidade_id uuid REFERENCES public.unidades(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_port_people_unidade ON public.port_people(unidade_id);
CREATE INDEX IF NOT EXISTS idx_port_visitors_unidade ON public.port_visitors(unidade_id);
CREATE INDEX IF NOT EXISTS idx_transp_movimentos_unidade ON public.transp_movimentos(unidade_id);
CREATE INDEX IF NOT EXISTS idx_livro_ocorrencias_unidade ON public.livro_ocorrencias(unidade_id);
CREATE INDEX IF NOT EXISTS idx_livro_encomendas_unidade ON public.livro_encomendas(unidade_id);
CREATE INDEX IF NOT EXISTS idx_cv_vehicles_unidade ON public.cv_vehicles(unidade_id);
CREATE INDEX IF NOT EXISTS idx_cv_vehicle_movements_unidade ON public.cv_vehicle_movements(unidade_id);

-- 3) Backfill: primeira unidade do estabelecimento (ou primeira unidade cadastrada)
UPDATE public.transp_movimentos t SET unidade_id = (SELECT u.id FROM public.unidades u WHERE u.estabelecimento_id = t.estabelecimento_id ORDER BY u.created_at LIMIT 1) WHERE t.unidade_id IS NULL;
UPDATE public.transp_veiculos t SET unidade_id = (SELECT u.id FROM public.unidades u WHERE u.estabelecimento_id = t.estabelecimento_id ORDER BY u.created_at LIMIT 1) WHERE t.unidade_id IS NULL;
UPDATE public.transp_motoristas t SET unidade_id = (SELECT u.id FROM public.unidades u WHERE u.estabelecimento_id = t.estabelecimento_id ORDER BY u.created_at LIMIT 1) WHERE t.unidade_id IS NULL;
UPDATE public.transp_setores t SET unidade_id = (SELECT u.id FROM public.unidades u WHERE u.estabelecimento_id = t.estabelecimento_id ORDER BY u.created_at LIMIT 1) WHERE t.unidade_id IS NULL;
UPDATE public.livro_ocorrencias t SET unidade_id = (SELECT u.id FROM public.unidades u WHERE u.estabelecimento_id = t.estabelecimento_id ORDER BY u.created_at LIMIT 1) WHERE t.unidade_id IS NULL;
UPDATE public.livro_encomendas t SET unidade_id = (SELECT u.id FROM public.unidades u WHERE u.estabelecimento_id = t.estabelecimento_id ORDER BY u.created_at LIMIT 1) WHERE t.unidade_id IS NULL;
UPDATE public.cv_vehicles t SET unidade_id = (SELECT u.id FROM public.unidades u WHERE u.estabelecimento_id = t.estabelecimento_id ORDER BY u.created_at LIMIT 1) WHERE t.unidade_id IS NULL;
UPDATE public.cv_vehicle_movements t SET unidade_id = (SELECT u.id FROM public.unidades u WHERE u.estabelecimento_id = t.estabelecimento_id ORDER BY u.created_at LIMIT 1) WHERE t.unidade_id IS NULL;
UPDATE public.cv_drivers t SET unidade_id = (SELECT u.id FROM public.unidades u WHERE u.estabelecimento_id = t.estabelecimento_id ORDER BY u.created_at LIMIT 1) WHERE t.unidade_id IS NULL;
UPDATE public.cv_helpers t SET unidade_id = (SELECT u.id FROM public.unidades u WHERE u.estabelecimento_id = t.estabelecimento_id ORDER BY u.created_at LIMIT 1) WHERE t.unidade_id IS NULL;

UPDATE public.port_people SET unidade_id = (SELECT id FROM public.unidades ORDER BY created_at LIMIT 1) WHERE unidade_id IS NULL;
UPDATE public.port_visitors SET unidade_id = (SELECT id FROM public.unidades ORDER BY created_at LIMIT 1) WHERE unidade_id IS NULL;
UPDATE public.port_access_points SET unidade_id = (SELECT id FROM public.unidades ORDER BY created_at LIMIT 1) WHERE unidade_id IS NULL;
UPDATE public.port_devices SET unidade_id = (SELECT id FROM public.unidades ORDER BY created_at LIMIT 1) WHERE unidade_id IS NULL;

-- 4) Regras restritivas por unidade (admins têm acesso total)
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'port_people','port_visitors','port_access_points','port_devices',
    'transp_movimentos','transp_veiculos','transp_motoristas','transp_setores',
    'livro_ocorrencias','livro_encomendas',
    'cv_vehicles','cv_vehicle_movements','cv_drivers','cv_helpers'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Restrito a unidade do usuario" ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY "Restrito a unidade do usuario" ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.pode_acessar_unidade(unidade_id)) WITH CHECK (public.pode_acessar_unidade(unidade_id))',
      t
    );
  END LOOP;
END $$;