GRANT SELECT, INSERT, UPDATE, DELETE ON public.cv_cameras TO authenticated;
GRANT ALL ON public.cv_cameras TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cameras_grupos TO authenticated;
GRANT ALL ON public.cameras_grupos TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cv_coletor_config TO authenticated;
GRANT ALL ON public.cv_coletor_config TO service_role;