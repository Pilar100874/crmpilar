-- Remover políticas existentes
DROP POLICY IF EXISTS "View webhooks entrada (admin or same estab)" ON public.webhooks_entrada;
DROP POLICY IF EXISTS "Insert webhooks entrada (admin or same estab)" ON public.webhooks_entrada;
DROP POLICY IF EXISTS "Update webhooks entrada (admin or same estab)" ON public.webhooks_entrada;
DROP POLICY IF EXISTS "Delete webhooks entrada (admin or same estab)" ON public.webhooks_entrada;

-- Criar políticas RLS com verificação de email admin
CREATE POLICY "View webhooks entrada (admin email or same estab)"
  ON public.webhooks_entrada
  FOR SELECT
  USING (
    ((auth.jwt() ->> 'email'::text) ~~* 'admin_%@sistema.local'::text)
    OR 
    (EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
    OR
    (estabelecimento_id = get_user_estabelecimento_id(auth.uid()))
  );

CREATE POLICY "Insert webhooks entrada (admin email or same estab)"
  ON public.webhooks_entrada
  FOR INSERT
  WITH CHECK (
    ((auth.jwt() ->> 'email'::text) ~~* 'admin_%@sistema.local'::text)
    OR 
    (EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
    OR
    ((estabelecimento_id = get_user_estabelecimento_id(auth.uid())) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR NOT roles_present()))
  );

CREATE POLICY "Update webhooks entrada (admin email or same estab)"
  ON public.webhooks_entrada
  FOR UPDATE
  USING (
    ((auth.jwt() ->> 'email'::text) ~~* 'admin_%@sistema.local'::text)
    OR 
    (EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
    OR
    ((estabelecimento_id = get_user_estabelecimento_id(auth.uid())) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR NOT roles_present()))
  );

CREATE POLICY "Delete webhooks entrada (admin email or same estab)"
  ON public.webhooks_entrada
  FOR DELETE
  USING (
    ((auth.jwt() ->> 'email'::text) ~~* 'admin_%@sistema.local'::text)
    OR 
    (EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
    OR
    ((estabelecimento_id = get_user_estabelecimento_id(auth.uid())) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR NOT roles_present()))
  );