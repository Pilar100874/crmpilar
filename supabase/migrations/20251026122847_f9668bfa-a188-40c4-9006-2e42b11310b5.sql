-- Simplifica políticas para funil_stages com base no estabelecimento do funil
DROP POLICY IF EXISTS "Users can manage stages from their funis" ON public.funil_stages;
DROP POLICY IF EXISTS "Users can view stages from their funis" ON public.funil_stages;

CREATE POLICY "View stages from same estabelecimento"
  ON public.funil_stages FOR SELECT
  USING (
    funil_id IN (
      SELECT id FROM public.funis 
      WHERE estabelecimento_id = get_user_estabelecimento_id(auth.uid())
      OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
    )
  );

CREATE POLICY "Insert stages in same estabelecimento"
  ON public.funil_stages FOR INSERT
  WITH CHECK (
    funil_id IN (
      SELECT id FROM public.funis 
      WHERE estabelecimento_id = get_user_estabelecimento_id(auth.uid())
      OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
    )
  );

CREATE POLICY "Update stages in same estabelecimento"
  ON public.funil_stages FOR UPDATE
  USING (
    funil_id IN (
      SELECT id FROM public.funis 
      WHERE estabelecimento_id = get_user_estabelecimento_id(auth.uid())
      OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
    )
  )
  WITH CHECK (
    funil_id IN (
      SELECT id FROM public.funis 
      WHERE estabelecimento_id = get_user_estabelecimento_id(auth.uid())
      OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
    )
  );

CREATE POLICY "Delete stages in same estabelecimento"
  ON public.funil_stages FOR DELETE
  USING (
    funil_id IN (
      SELECT id FROM public.funis 
      WHERE estabelecimento_id = get_user_estabelecimento_id(auth.uid())
      OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
    )
  );