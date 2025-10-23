-- Fix RLS policies to include WITH CHECK for INSERT operations

-- Drop and recreate policy for redes_sociais
DROP POLICY IF EXISTS "Users can manage redes sociais from same estabelecimento" ON public.redes_sociais;

CREATE POLICY "Users can manage redes sociais from same estabelecimento"
ON public.redes_sociais
FOR ALL
USING (
  ((estabelecimento_id IN (SELECT usuarios.estabelecimento_id FROM usuarios WHERE usuarios.id = auth.uid()))
   AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role)))
  OR
  (EXISTS (SELECT 1 FROM administradores WHERE administradores.id = auth.uid()))
)
WITH CHECK (
  ((estabelecimento_id IN (SELECT usuarios.estabelecimento_id FROM usuarios WHERE usuarios.id = auth.uid()))
   AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role)))
  OR
  (EXISTS (SELECT 1 FROM administradores WHERE administradores.id = auth.uid()))
);

-- Drop and recreate policy for unidades
DROP POLICY IF EXISTS "Users can manage unidades from same estabelecimento" ON public.unidades;

CREATE POLICY "Users can manage unidades from same estabelecimento"
ON public.unidades
FOR ALL
USING (
  ((estabelecimento_id IN (SELECT usuarios.estabelecimento_id FROM usuarios WHERE usuarios.id = auth.uid()))
   AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role)))
  OR
  (EXISTS (SELECT 1 FROM administradores WHERE administradores.id = auth.uid()))
)
WITH CHECK (
  ((estabelecimento_id IN (SELECT usuarios.estabelecimento_id FROM usuarios WHERE usuarios.id = auth.uid()))
   AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role)))
  OR
  (EXISTS (SELECT 1 FROM administradores WHERE administradores.id = auth.uid()))
);

-- Drop and recreate policy for segmentos
DROP POLICY IF EXISTS "Users can manage segmentos from same estabelecimento" ON public.segmentos;

CREATE POLICY "Users can manage segmentos from same estabelecimento"
ON public.segmentos
FOR ALL
USING (
  ((estabelecimento_id IN (SELECT usuarios.estabelecimento_id FROM usuarios WHERE usuarios.id = auth.uid()))
   AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role)))
  OR
  (EXISTS (SELECT 1 FROM administradores WHERE administradores.id = auth.uid()))
)
WITH CHECK (
  ((estabelecimento_id IN (SELECT usuarios.estabelecimento_id FROM usuarios WHERE usuarios.id = auth.uid()))
   AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role)))
  OR
  (EXISTS (SELECT 1 FROM administradores WHERE administradores.id = auth.uid()))
);