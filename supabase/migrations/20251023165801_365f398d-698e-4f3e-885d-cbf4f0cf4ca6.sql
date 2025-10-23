-- Adicionar estabelecimento_id às tabelas de textos prontos e anexos rápidos
ALTER TABLE public.quick_replies ADD COLUMN estabelecimento_id uuid REFERENCES public.estabelecimentos(id);
ALTER TABLE public.quick_attachments ADD COLUMN estabelecimento_id uuid REFERENCES public.estabelecimentos(id);

-- Criar tabela de webhooks
CREATE TABLE public.webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  name text NOT NULL,
  url text NOT NULL,
  method text NOT NULL DEFAULT 'POST',
  type text NOT NULL,
  description text,
  usage_locations jsonb DEFAULT '[]'::jsonb,
  has_variables boolean DEFAULT false,
  variables jsonb DEFAULT '[]'::jsonb,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;

-- Atualizar RLS policies para quick_replies
DROP POLICY IF EXISTS "Users can view own and group quick replies" ON public.quick_replies;
DROP POLICY IF EXISTS "Admins can manage global quick replies" ON public.quick_replies;
DROP POLICY IF EXISTS "Users can manage own quick replies" ON public.quick_replies;

CREATE POLICY "Users can view quick replies from same estabelecimento"
ON public.quick_replies FOR SELECT
USING (
  (estabelecimento_id IS NULL) OR 
  (estabelecimento_id IN (
    SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
  )) OR
  (EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
);

CREATE POLICY "Users can manage global quick replies from same estabelecimento"
ON public.quick_replies FOR ALL
USING (
  (is_global = true) AND
  (
    (estabelecimento_id IN (
      SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
    ) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role))) OR
    (EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
  )
)
WITH CHECK (
  (is_global = true) AND
  (
    (estabelecimento_id IN (
      SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
    ) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role))) OR
    (EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
  )
);

CREATE POLICY "Users can manage own quick replies"
ON public.quick_replies FOR ALL
USING ((user_id = auth.uid()) AND (is_global = false))
WITH CHECK ((user_id = auth.uid()) AND (is_global = false));

-- Atualizar RLS policies para quick_attachments
DROP POLICY IF EXISTS "Users can view own and group quick attachments" ON public.quick_attachments;
DROP POLICY IF EXISTS "Admins can manage global quick attachments" ON public.quick_attachments;
DROP POLICY IF EXISTS "Users can manage own quick attachments" ON public.quick_attachments;

CREATE POLICY "Users can view quick attachments from same estabelecimento"
ON public.quick_attachments FOR SELECT
USING (
  (estabelecimento_id IS NULL) OR 
  (estabelecimento_id IN (
    SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
  )) OR
  (EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
);

CREATE POLICY "Users can manage global quick attachments from same estabelecimento"
ON public.quick_attachments FOR ALL
USING (
  (is_global = true) AND
  (
    (estabelecimento_id IN (
      SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
    ) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role))) OR
    (EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
  )
)
WITH CHECK (
  (is_global = true) AND
  (
    (estabelecimento_id IN (
      SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
    ) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role))) OR
    (EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
  )
);

CREATE POLICY "Users can manage own quick attachments"
ON public.quick_attachments FOR ALL
USING ((user_id = auth.uid()) AND (is_global = false))
WITH CHECK ((user_id = auth.uid()) AND (is_global = false));

-- RLS policies para webhooks
CREATE POLICY "Users can view webhooks from same estabelecimento"
ON public.webhooks FOR SELECT
USING (
  (estabelecimento_id IN (
    SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
  )) OR
  (EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
);

CREATE POLICY "Users can manage webhooks from same estabelecimento"
ON public.webhooks FOR ALL
USING (
  (
    (estabelecimento_id IN (
      SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
    ) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role)))
  ) OR
  (EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
)
WITH CHECK (
  (
    (estabelecimento_id IN (
      SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
    ) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role)))
  ) OR
  (EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
);

-- Trigger para atualizar updated_at em webhooks
CREATE TRIGGER update_webhooks_updated_at
BEFORE UPDATE ON public.webhooks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();