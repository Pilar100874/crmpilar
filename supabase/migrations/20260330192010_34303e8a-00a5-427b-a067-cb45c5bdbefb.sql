
-- Create system visual config table
CREATE TABLE public.system_visual_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  splash_video_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(estabelecimento_id)
);

ALTER TABLE public.system_visual_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own visual config"
  ON public.system_visual_config FOR SELECT
  TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE POLICY "Users can upsert own visual config"
  ON public.system_visual_config FOR INSERT
  TO authenticated
  WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE POLICY "Users can update own visual config"
  ON public.system_visual_config FOR UPDATE
  TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());

-- Public read for login page (unauthenticated users need to see splash video)
CREATE POLICY "Public can view visual config"
  ON public.system_visual_config FOR SELECT
  TO anon
  USING (true);

CREATE TRIGGER update_system_visual_config_updated_at
  BEFORE UPDATE ON public.system_visual_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
