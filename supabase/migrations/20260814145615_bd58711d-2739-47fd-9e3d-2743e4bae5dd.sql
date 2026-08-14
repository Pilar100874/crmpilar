CREATE OR REPLACE FUNCTION public.cv_cameras_set_estabelecimento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.estabelecimento_id IS NULL THEN
    NEW.estabelecimento_id := public.get_auth_user_estabelecimento_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cv_cameras_set_estabelecimento ON public.cv_cameras;
CREATE TRIGGER trg_cv_cameras_set_estabelecimento
BEFORE INSERT ON public.cv_cameras
FOR EACH ROW EXECUTE FUNCTION public.cv_cameras_set_estabelecimento();

DROP POLICY IF EXISTS cv_cameras_tenant ON public.cv_cameras;
CREATE POLICY cv_cameras_tenant ON public.cv_cameras
FOR ALL TO authenticated
USING (
  estabelecimento_id = public.get_auth_user_estabelecimento_id()
  OR estabelecimento_id IS NULL
  OR EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = auth.uid())
)
WITH CHECK (
  estabelecimento_id = public.get_auth_user_estabelecimento_id()
  OR estabelecimento_id IS NULL
  OR EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = auth.uid())
);