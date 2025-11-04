-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Usuários podem ver webhooks de seu estabelecimento" ON public.webhooks_entrada;
DROP POLICY IF EXISTS "Usuários podem criar webhooks para seu estabelecimento" ON public.webhooks_entrada;
DROP POLICY IF EXISTS "Usuários podem atualizar webhooks de seu estabelecimento" ON public.webhooks_entrada;
DROP POLICY IF EXISTS "Usuários podem deletar webhooks de seu estabelecimento" ON public.webhooks_entrada;

-- Criar políticas RLS com verificação de admin ou estabelecimento
CREATE POLICY "View webhooks entrada (admin or same estab)"
  ON public.webhooks_entrada
  FOR SELECT
  USING (
    (estabelecimento_id = get_user_estabelecimento_id(auth.uid())) 
    OR 
    (EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
  );

CREATE POLICY "Insert webhooks entrada (admin or same estab)"
  ON public.webhooks_entrada
  FOR INSERT
  WITH CHECK (
    (estabelecimento_id = get_user_estabelecimento_id(auth.uid()) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR NOT roles_present()))
    OR 
    (EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
  );

CREATE POLICY "Update webhooks entrada (admin or same estab)"
  ON public.webhooks_entrada
  FOR UPDATE
  USING (
    (estabelecimento_id = get_user_estabelecimento_id(auth.uid()) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR NOT roles_present()))
    OR 
    (EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
  );

CREATE POLICY "Delete webhooks entrada (admin or same estab)"
  ON public.webhooks_entrada
  FOR DELETE
  USING (
    (estabelecimento_id = get_user_estabelecimento_id(auth.uid()) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR NOT roles_present()))
    OR 
    (EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
  );