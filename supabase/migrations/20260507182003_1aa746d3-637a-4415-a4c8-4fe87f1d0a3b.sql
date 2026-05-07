
CREATE TABLE public.studio_visual_identity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  name TEXT DEFAULT 'Identidade Visual',
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(estabelecimento_id)
);

ALTER TABLE public.studio_visual_identity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view visual identity for their establishment"
ON public.studio_visual_identity FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create visual identity"
ON public.studio_visual_identity FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update visual identity"
ON public.studio_visual_identity FOR UPDATE TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete visual identity"
ON public.studio_visual_identity FOR DELETE TO authenticated
USING (true);

CREATE TRIGGER update_studio_visual_identity_updated_at
BEFORE UPDATE ON public.studio_visual_identity
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
