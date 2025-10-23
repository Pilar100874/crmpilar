-- Ajustar RLS de grupos_acesso para permitir fallback quando não há roles e liberar admins
DROP POLICY IF EXISTS "Users can insert grupos_acesso" ON public.grupos_acesso;
DROP POLICY IF EXISTS "Users can update grupos_acesso" ON public.grupos_acesso;
DROP POLICY IF EXISTS "Users can delete grupos_acesso" ON public.grupos_acesso;

-- INSERT: Admins sempre; Admin/Gestor no próprio estabelecimento; ou quando não há roles
CREATE POLICY "Users can insert grupos_acesso"
ON public.grupos_acesso FOR INSERT
WITH CHECK (
  (EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = auth.uid())) OR
  ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role))
    AND (estabelecimento_id IN (SELECT u.estabelecimento_id FROM public.usuarios u WHERE u.id = auth.uid()))) OR
  (NOT roles_present())
);

-- UPDATE: mesmas condições no USING e WITH CHECK
CREATE POLICY "Users can update grupos_acesso"
ON public.grupos_acesso FOR UPDATE
USING (
  (EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = auth.uid())) OR
  ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role))
    AND (estabelecimento_id IN (SELECT u.estabelecimento_id FROM public.usuarios u WHERE u.id = auth.uid()))) OR
  (NOT roles_present())
)
WITH CHECK (
  (EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = auth.uid())) OR
  ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role))
    AND (estabelecimento_id IN (SELECT u.estabelecimento_id FROM public.usuarios u WHERE u.id = auth.uid()))) OR
  (NOT roles_present())
);

-- DELETE: mesmas condições no USING
CREATE POLICY "Users can delete grupos_acesso"
ON public.grupos_acesso FOR DELETE
USING (
  (EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = auth.uid())) OR
  ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role))
    AND (estabelecimento_id IN (SELECT u.estabelecimento_id FROM public.usuarios u WHERE u.id = auth.uid()))) OR
  (NOT roles_present())
);