CREATE TABLE public.heatmap_screenshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid,
  scope text NOT NULL DEFAULT 'sistema',
  route text NOT NULL,
  image_url text NOT NULL,
  vw integer NOT NULL DEFAULT 1440,
  vh integer NOT NULL DEFAULT 900,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT heatmap_screenshots_scope_check CHECK (scope IN ('sistema', 'ecommerce')),
  CONSTRAINT heatmap_screenshots_route_not_empty CHECK (length(trim(route)) > 0),
  CONSTRAINT heatmap_screenshots_unique_route UNIQUE (scope, route, estabelecimento_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.heatmap_screenshots TO authenticated;
GRANT ALL ON public.heatmap_screenshots TO service_role;

ALTER TABLE public.heatmap_screenshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "heatmap_screenshots_select_own_estab"
ON public.heatmap_screenshots
FOR SELECT
TO authenticated
USING (
  estabelecimento_id = public.get_auth_user_estabelecimento_id()
  OR estabelecimento_id IS NULL
);

CREATE POLICY "heatmap_screenshots_insert_own_estab"
ON public.heatmap_screenshots
FOR INSERT
TO authenticated
WITH CHECK (
  estabelecimento_id = public.get_auth_user_estabelecimento_id()
  OR estabelecimento_id IS NULL
);

CREATE POLICY "heatmap_screenshots_update_own_estab"
ON public.heatmap_screenshots
FOR UPDATE
TO authenticated
USING (
  estabelecimento_id = public.get_auth_user_estabelecimento_id()
  OR estabelecimento_id IS NULL
)
WITH CHECK (
  estabelecimento_id = public.get_auth_user_estabelecimento_id()
  OR estabelecimento_id IS NULL
);

CREATE POLICY "heatmap_screenshots_delete_own_estab"
ON public.heatmap_screenshots
FOR DELETE
TO authenticated
USING (
  estabelecimento_id = public.get_auth_user_estabelecimento_id()
  OR estabelecimento_id IS NULL
);

CREATE TRIGGER update_heatmap_screenshots_updated_at
BEFORE UPDATE ON public.heatmap_screenshots
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();