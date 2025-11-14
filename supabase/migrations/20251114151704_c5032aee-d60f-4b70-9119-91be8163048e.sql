
-- Ajustar políticas RLS da tabela form_field_configs para permitir acesso de vendedores

-- Remover política restritiva atual
DROP POLICY IF EXISTS "Allow users from same estabelecimento to manage configs" ON public.form_field_configs;

-- Criar nova política mais permissiva para usuários do mesmo estabelecimento
CREATE POLICY "Usuários podem gerenciar configs do estabelecimento"
ON public.form_field_configs
FOR ALL
TO authenticated
USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id 
    FROM public.usuarios 
    WHERE auth_user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 
    FROM administradores 
    WHERE id = auth.uid()
  )
)
WITH CHECK (
  estabelecimento_id IN (
    SELECT estabelecimento_id 
    FROM public.usuarios 
    WHERE auth_user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 
    FROM administradores 
    WHERE id = auth.uid()
  )
);
