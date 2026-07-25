
CREATE TABLE public.menu_customizacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL UNIQUE,
  payload jsonb NOT NULL,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.menu_customizacoes TO authenticated;
GRANT ALL ON public.menu_customizacoes TO service_role;

ALTER TABLE public.menu_customizacoes ENABLE ROW LEVEL SECURITY;

-- Any authenticated user in the same estabelecimento can read the customization
CREATE POLICY "Usuarios veem menu do seu estabelecimento"
ON public.menu_customizacoes FOR SELECT
TO authenticated
USING (
  estabelecimento_id IN (
    SELECT u.estabelecimento_id FROM public.usuarios u WHERE u.auth_user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- Only admins can insert/update/delete
CREATE POLICY "Somente admin insere menu"
ON public.menu_customizacoes FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Somente admin atualiza menu"
ON public.menu_customizacoes FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Somente admin exclui menu"
ON public.menu_customizacoes FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_menu_customizacoes_updated_at
BEFORE UPDATE ON public.menu_customizacoes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
