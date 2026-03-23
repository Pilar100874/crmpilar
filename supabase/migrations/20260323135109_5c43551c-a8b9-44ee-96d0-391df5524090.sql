
CREATE TABLE public.published_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  slug TEXT NOT NULL,
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  publicado BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX published_pages_slug_unique ON public.published_pages(slug);

ALTER TABLE public.published_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own establishment pages"
  ON public.published_pages
  FOR ALL
  TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id())
  WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE POLICY "Anyone can view published pages"
  ON public.published_pages
  FOR SELECT
  TO anon
  USING (publicado = true);

CREATE TRIGGER set_published_pages_updated_at
  BEFORE UPDATE ON public.published_pages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
