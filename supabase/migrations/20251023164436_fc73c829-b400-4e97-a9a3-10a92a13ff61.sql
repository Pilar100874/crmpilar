-- Políticas refinadas para estabelecimentos: permitir inserir o primeiro registro mesmo com admins existentes
DROP POLICY IF EXISTS "Only admins can manage estabelecimentos" ON public.estabelecimentos;

-- 1) INSERT: permitido para qualquer usuário (inclusive anônimo) se ainda não existir nenhum estabelecimento,
--    ou para administradores a qualquer momento
CREATE POLICY "Insert estabelecimento when none or admin" 
ON public.estabelecimentos
FOR INSERT
WITH CHECK (
  (EXISTS (SELECT 1 FROM public.administradores WHERE administradores.id = auth.uid()))
  OR
  (NOT EXISTS (SELECT 1 FROM public.estabelecimentos))
);

-- 2) UPDATE: apenas administradores
CREATE POLICY "Admins can update estabelecimentos"
ON public.estabelecimentos
FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.administradores WHERE administradores.id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.administradores WHERE administradores.id = auth.uid()));

-- 3) DELETE: apenas administradores
CREATE POLICY "Admins can delete estabelecimentos"
ON public.estabelecimentos
FOR DELETE
USING (EXISTS (SELECT 1 FROM public.administradores WHERE administradores.id = auth.uid()));