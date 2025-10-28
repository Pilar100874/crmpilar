-- Allow inserting unidades when the user's email matches a usuario with the same estabelecimento
DROP POLICY IF EXISTS "Insert unidades (same estab via email)" ON public.unidades;
CREATE POLICY "Insert unidades (same estab via email)"
ON public.unidades
FOR INSERT
TO authenticated
WITH CHECK (
  (estabelecimento_id IN (
     SELECT estabelecimento_id FROM public.usuarios
     WHERE email = (auth.jwt() ->> 'email')
  ))
  OR (EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
);