
-- 1) chat_transferencias: tenant scoping via conversations.estabelecimento_id
DROP POLICY IF EXISTS "Usuários podem ver transferências" ON public.chat_transferencias;
DROP POLICY IF EXISTS "Atendentes e supervisores podem criar transferências" ON public.chat_transferencias;

CREATE POLICY "Ver transferências do estabelecimento"
ON public.chat_transferencias
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = chat_transferencias.chat_id
      AND public.user_in_estabelecimento(c.estabelecimento_id)
  )
);

CREATE POLICY "Criar transferências do estabelecimento"
ON public.chat_transferencias
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = chat_transferencias.chat_id
      AND public.user_in_estabelecimento(c.estabelecimento_id)
  )
);

-- 2) profiles: prevent users escalating is_admin on their own row
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND is_admin IS NOT DISTINCT FROM (SELECT p.is_admin FROM public.profiles p WHERE p.id = auth.uid())
);
