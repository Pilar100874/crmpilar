-- Atualizar política de SELECT para funil_stages incluir bypass de email admin
DROP POLICY IF EXISTS "View stages from same estabelecimento" ON public.funil_stages;

CREATE POLICY "View stages (same estab or admin)"
ON public.funil_stages FOR SELECT
TO authenticated
USING (
  -- Permite se o email é admin
  ((auth.jwt() ->> 'email') ILIKE 'admin_%@sistema.local')
  OR
  -- Ou se é um admin na tabela administradores
  (EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
  OR
  -- Ou se o funil pertence ao estabelecimento do usuário
  funil_id IN (
    SELECT funis.id
    FROM funis
    WHERE funis.estabelecimento_id = public.get_user_estabelecimento_id(auth.uid())
  )
);