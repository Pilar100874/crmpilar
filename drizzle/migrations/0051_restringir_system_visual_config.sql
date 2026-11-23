DROP POLICY IF EXISTS "Public can view visual config" ON public.system_visual_config;
REVOKE SELECT ON public.system_visual_config FROM anon;

CREATE OR REPLACE FUNCTION public.get_login_splash()
RETURNS TABLE(splash_video_url text, splash_video_loop boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT c.splash_video_url, c.splash_video_loop
  FROM public.system_visual_config c
  WHERE c.splash_video_url IS NOT NULL
  ORDER BY c.updated_at DESC
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.get_login_splash() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_login_splash() TO anon, authenticated;