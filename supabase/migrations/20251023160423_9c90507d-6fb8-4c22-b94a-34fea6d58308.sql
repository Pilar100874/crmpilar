-- Ajustar políticas RLS da tabela estabelecimentos para restringir operações apenas a administradores

-- Remover políticas existentes
DROP POLICY IF EXISTS "Anyone can view estabelecimentos" ON public.estabelecimentos;
DROP POLICY IF EXISTS "Authenticated users can manage estabelecimentos" ON public.estabelecimentos;
DROP POLICY IF EXISTS "Authenticated users can view estabelecimentos" ON public.estabelecimentos;

-- Política para SELECT: Qualquer pessoa pode ver (necessário para tela de login)
CREATE POLICY "Anyone can view estabelecimentos"
ON public.estabelecimentos
FOR SELECT
USING (true);

-- Política para INSERT/UPDATE/DELETE: Apenas administradores
CREATE POLICY "Only admins can manage estabelecimentos"
ON public.estabelecimentos
FOR ALL
USING (
  EXISTS (
    SELECT 1 
    FROM public.administradores 
    WHERE id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.administradores 
    WHERE id = auth.uid()
  )
);

-- Garantir que a política de usuários está correta para isolamento por estabelecimento
DROP POLICY IF EXISTS "Users can view usuarios from same estabelecimento" ON public.usuarios;

CREATE POLICY "Users can view usuarios from same estabelecimento"
ON public.usuarios
FOR SELECT
USING (
  -- Administradores veem todos
  EXISTS (
    SELECT 1 
    FROM public.administradores 
    WHERE id = auth.uid()
  )
  OR
  -- Usuários veem apenas do mesmo estabelecimento
  estabelecimento_id IN (
    SELECT estabelecimento_id 
    FROM public.usuarios 
    WHERE id = auth.uid()
  )
);