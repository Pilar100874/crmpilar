-- Criar função para verificar se existem administradores
CREATE OR REPLACE FUNCTION public.admins_present()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.administradores)
$$;

-- Atualizar política de estabelecimentos para permitir quando não há admins
DROP POLICY IF EXISTS "Only admins can manage estabelecimentos" ON public.estabelecimentos;

CREATE POLICY "Only admins can manage estabelecimentos" 
ON public.estabelecimentos
FOR ALL 
USING (
  (EXISTS (
    SELECT 1 FROM administradores 
    WHERE administradores.id = auth.uid()
  )) OR (NOT admins_present())
)
WITH CHECK (
  (EXISTS (
    SELECT 1 FROM administradores 
    WHERE administradores.id = auth.uid()
  )) OR (NOT admins_present())
);