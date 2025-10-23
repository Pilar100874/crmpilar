-- Corrigir políticas RLS para quick_replies
-- Permitir que administradores criem textos prontos globais

DROP POLICY IF EXISTS "Users can manage global quick replies from same estabelecimento" ON public.quick_replies;

-- Nova policy para gerenciar quick replies globais
CREATE POLICY "Users can manage global quick replies from same estabelecimento"
ON public.quick_replies FOR ALL
USING (
  (is_global = true) AND
  (
    (EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())) OR
    (
      (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role)) AND
      (estabelecimento_id IN (SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()))
    )
  )
)
WITH CHECK (
  (is_global = true) AND
  (
    (EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())) OR
    (
      (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role)) AND
      (estabelecimento_id IN (SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()))
    )
  )
);

-- Corrigir políticas RLS para quick_attachments também
DROP POLICY IF EXISTS "Users can manage global quick attachments from same estabelecimento" ON public.quick_attachments;

CREATE POLICY "Users can manage global quick attachments from same estabelecimento"
ON public.quick_attachments FOR ALL
USING (
  (is_global = true) AND
  (
    (EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())) OR
    (
      (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role)) AND
      (estabelecimento_id IN (SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()))
    )
  )
)
WITH CHECK (
  (is_global = true) AND
  (
    (EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())) OR
    (
      (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role)) AND
      (estabelecimento_id IN (SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()))
    )
  )
);