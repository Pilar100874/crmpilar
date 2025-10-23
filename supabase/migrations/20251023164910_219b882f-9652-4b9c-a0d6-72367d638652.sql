-- Ajustar política de INSERT para permitir qualquer usuário autenticado criar estabelecimentos
-- até que o sistema esteja completamente configurado

DROP POLICY IF EXISTS "Insert estabelecimento when none or admin" ON public.estabelecimentos;

CREATE POLICY "Allow authenticated to insert estabelecimentos"
ON public.estabelecimentos
FOR INSERT
WITH CHECK (
  -- Administradores podem sempre inserir
  (EXISTS (SELECT 1 FROM public.administradores WHERE administradores.id = auth.uid()))
  OR
  -- Ou se não existem estabelecimentos ainda
  (NOT EXISTS (SELECT 1 FROM public.estabelecimentos))
  OR
  -- Ou se o usuário está autenticado (para permitir setup inicial)
  (auth.uid() IS NOT NULL)
);