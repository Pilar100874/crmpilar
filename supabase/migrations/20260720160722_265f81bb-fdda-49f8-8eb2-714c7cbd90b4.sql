
CREATE TABLE public.ia_prospec_keys (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  openai_api_key TEXT,
  anthropic_api_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ia_prospec_keys TO authenticated;
GRANT ALL ON public.ia_prospec_keys TO service_role;

ALTER TABLE public.ia_prospec_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own row select" ON public.ia_prospec_keys FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own row insert" ON public.ia_prospec_keys FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own row update" ON public.ia_prospec_keys FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own row delete" ON public.ia_prospec_keys FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER ia_prospec_keys_updated
BEFORE UPDATE ON public.ia_prospec_keys
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
