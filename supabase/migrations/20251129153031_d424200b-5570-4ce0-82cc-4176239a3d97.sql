-- Corrige a política de INSERT para incluir admin role
DROP POLICY IF EXISTS "Criar rotas no próprio estabelecimento" ON public.rotas_salvas;

CREATE POLICY "Criar rotas no próprio estabelecimento" 
ON public.rotas_salvas 
FOR INSERT 
WITH CHECK (
  (estabelecimento_id = get_user_estabelecimento_id(auth.uid())) 
  OR (EXISTS (SELECT 1 FROM administradores WHERE administradores.id = auth.uid()))
  OR has_role(auth.uid(), 'admin'::app_role)
);