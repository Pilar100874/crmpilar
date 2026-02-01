-- Remover política atual que não está funcionando
DROP POLICY IF EXISTS "Usuarios podem atualizar propria atividade" ON public.user_activity_tracking;

-- Criar política separada para INSERT
CREATE POLICY "Usuarios podem inserir propria atividade"
ON public.user_activity_tracking
FOR INSERT
WITH CHECK (
  usuario_id IN (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid())
);

-- Criar política para UPDATE
CREATE POLICY "Usuarios podem atualizar propria atividade"
ON public.user_activity_tracking
FOR UPDATE
USING (
  usuario_id IN (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid())
);

-- Criar política para DELETE (caso necessário)
CREATE POLICY "Usuarios podem deletar propria atividade"
ON public.user_activity_tracking
FOR DELETE
USING (
  usuario_id IN (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid())
);