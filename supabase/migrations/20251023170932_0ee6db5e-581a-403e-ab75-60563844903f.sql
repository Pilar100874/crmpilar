-- Corrigir políticas RLS para grupos_acesso
-- Permitir que administradores e usuários com roles admin/gestor possam gerenciar grupos

DROP POLICY IF EXISTS "Users can insert grupos_acesso" ON public.grupos_acesso;
DROP POLICY IF EXISTS "Users can update grupos_acesso" ON public.grupos_acesso;
DROP POLICY IF EXISTS "Users can delete grupos_acesso" ON public.grupos_acesso;

-- Policy para INSERT
CREATE POLICY "Users can insert grupos_acesso"
ON public.grupos_acesso FOR INSERT
WITH CHECK (
  (EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())) OR
  (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role))
  )
);

-- Policy para UPDATE
CREATE POLICY "Users can update grupos_acesso"
ON public.grupos_acesso FOR UPDATE
USING (
  (EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())) OR
  (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role)) AND
    (estabelecimento_id IN (SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()))
  )
)
WITH CHECK (
  (EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())) OR
  (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role)) AND
    (estabelecimento_id IN (SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()))
  )
);

-- Policy para DELETE
CREATE POLICY "Users can delete grupos_acesso"
ON public.grupos_acesso FOR DELETE
USING (
  (EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())) OR
  (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role)) AND
    (estabelecimento_id IN (SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()))
  )
);