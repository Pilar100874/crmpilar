GRANT DELETE ON public.avisos_sistema TO authenticated;
GRANT DELETE ON public.avisos_sistema TO service_role;

CREATE POLICY "Admins excluem avisos"
ON public.avisos_sistema
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));