-- Remove todas as políticas antigas e cria novas mais simples
DROP POLICY IF EXISTS "Users can manage funis from same estabelecimento" ON public.funis;
DROP POLICY IF EXISTS "Users can view funis from same estabelecimento" ON public.funis;

-- Permite visualização
CREATE POLICY "View funis from same estabelecimento"
  ON public.funis FOR SELECT
  USING (
    estabelecimento_id = get_user_estabelecimento_id(auth.uid())
    OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  );

-- Permite inserção
CREATE POLICY "Insert funis in same estabelecimento"
  ON public.funis FOR INSERT
  WITH CHECK (
    estabelecimento_id = get_user_estabelecimento_id(auth.uid())
    OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  );

-- Permite atualização
CREATE POLICY "Update funis from same estabelecimento"
  ON public.funis FOR UPDATE
  USING (
    estabelecimento_id = get_user_estabelecimento_id(auth.uid())
    OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  )
  WITH CHECK (
    estabelecimento_id = get_user_estabelecimento_id(auth.uid())
    OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  );

-- Permite deleção
CREATE POLICY "Delete funis from same estabelecimento"
  ON public.funis FOR DELETE
  USING (
    estabelecimento_id = get_user_estabelecimento_id(auth.uid())
    OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  );