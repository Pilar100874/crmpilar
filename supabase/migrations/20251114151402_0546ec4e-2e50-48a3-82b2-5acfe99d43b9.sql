
-- Criar políticas RLS para a tabela customers
-- Permitir que usuários autenticados vejam contatos do seu estabelecimento

CREATE POLICY "Usuários podem visualizar contatos do estabelecimento"
ON public.customers
FOR SELECT
TO authenticated
USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id 
    FROM public.usuarios 
    WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "Usuários podem criar contatos no estabelecimento"
ON public.customers
FOR INSERT
TO authenticated
WITH CHECK (
  estabelecimento_id IN (
    SELECT estabelecimento_id 
    FROM public.usuarios 
    WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "Usuários podem atualizar contatos do estabelecimento"
ON public.customers
FOR UPDATE
TO authenticated
USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id 
    FROM public.usuarios 
    WHERE auth_user_id = auth.uid()
  )
)
WITH CHECK (
  estabelecimento_id IN (
    SELECT estabelecimento_id 
    FROM public.usuarios 
    WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "Usuários podem deletar contatos do estabelecimento"
ON public.customers
FOR DELETE
TO authenticated
USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id 
    FROM public.usuarios 
    WHERE auth_user_id = auth.uid()
  )
);
