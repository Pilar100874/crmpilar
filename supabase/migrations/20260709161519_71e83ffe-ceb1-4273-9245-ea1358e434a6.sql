
ALTER TABLE public.doc_modelos ADD COLUMN IF NOT EXISTS is_modelo boolean NOT NULL DEFAULT true;
ALTER TABLE public.doc_modelos ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES public.usuarios(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS doc_modelos_owner_idx ON public.doc_modelos(owner_user_id);

DROP POLICY IF EXISTS "doc_modelos estab" ON public.doc_modelos;
DROP POLICY IF EXISTS "doc_modelos select" ON public.doc_modelos;
DROP POLICY IF EXISTS "doc_modelos insert" ON public.doc_modelos;
DROP POLICY IF EXISTS "doc_modelos update" ON public.doc_modelos;
DROP POLICY IF EXISTS "doc_modelos delete" ON public.doc_modelos;

CREATE POLICY "doc_modelos select" ON public.doc_modelos FOR SELECT TO authenticated
USING (
  estabelecimento_id = public.get_auth_user_estabelecimento_id()
  AND (
    is_modelo = true
    OR owner_user_id = (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid())
  )
);

CREATE POLICY "doc_modelos insert" ON public.doc_modelos FOR INSERT TO authenticated
WITH CHECK (
  estabelecimento_id = public.get_auth_user_estabelecimento_id()
  AND (
    (is_modelo = true AND public.has_role(auth.uid(), 'admin'::app_role))
    OR
    (is_modelo = false AND owner_user_id = (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid()))
  )
);

CREATE POLICY "doc_modelos update" ON public.doc_modelos FOR UPDATE TO authenticated
USING (
  estabelecimento_id = public.get_auth_user_estabelecimento_id()
  AND (
    (is_modelo = true AND public.has_role(auth.uid(), 'admin'::app_role))
    OR
    (is_modelo = false AND owner_user_id = (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid()))
  )
)
WITH CHECK (
  estabelecimento_id = public.get_auth_user_estabelecimento_id()
  AND (
    (is_modelo = true AND public.has_role(auth.uid(), 'admin'::app_role))
    OR
    (is_modelo = false AND owner_user_id = (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid()))
  )
);

CREATE POLICY "doc_modelos delete" ON public.doc_modelos FOR DELETE TO authenticated
USING (
  estabelecimento_id = public.get_auth_user_estabelecimento_id()
  AND (
    (is_modelo = true AND public.has_role(auth.uid(), 'admin'::app_role))
    OR
    (is_modelo = false AND owner_user_id = (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid()))
  )
);
