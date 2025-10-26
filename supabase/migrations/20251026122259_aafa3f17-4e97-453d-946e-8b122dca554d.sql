-- Remove política antiga e cria nova corrigida para funis
DROP POLICY IF EXISTS "Users can manage funis from same estabelecimento" ON public.funis;

CREATE POLICY "Users can manage funis from same estabelecimento"
  ON public.funis FOR ALL
  USING (
    (estabelecimento_id IN (
      SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
    ) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role)))
    OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  )
  WITH CHECK (
    (estabelecimento_id IN (
      SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
    ) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role)))
    OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  );

-- Corrige políticas das outras tabelas também
DROP POLICY IF EXISTS "Users can manage stages from their funis" ON public.funil_stages;

CREATE POLICY "Users can manage stages from their funis"
  ON public.funil_stages FOR ALL
  USING (
    funil_id IN (
      SELECT id FROM public.funis WHERE estabelecimento_id IN (
        SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
      ) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role))
    ) OR 
    EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  )
  WITH CHECK (
    funil_id IN (
      SELECT id FROM public.funis WHERE estabelecimento_id IN (
        SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
      )
    ) OR 
    EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can manage deals from same estabelecimento" ON public.funil_deals;

CREATE POLICY "Users can manage deals from same estabelecimento"
  ON public.funil_deals FOR ALL
  USING (
    (estabelecimento_id IN (
      SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
    ) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR responsavel_id = auth.uid()))
    OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  )
  WITH CHECK (
    (estabelecimento_id IN (
      SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
    ))
    OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  );