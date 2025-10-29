-- Criar tabela para configuração de campos de formulários
CREATE TABLE IF NOT EXISTS public.form_field_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id UUID REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  form_type TEXT NOT NULL, -- 'company' ou 'contact'
  field_id TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type TEXT NOT NULL,
  required BOOLEAN DEFAULT false,
  locked BOOLEAN DEFAULT false,
  field_order INTEGER DEFAULT 0,
  options JSONB DEFAULT '[]'::jsonb,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(estabelecimento_id, form_type, field_id)
);

-- Índices para melhor performance
CREATE INDEX idx_form_field_configs_estabelecimento ON public.form_field_configs(estabelecimento_id);
CREATE INDEX idx_form_field_configs_form_type ON public.form_field_configs(form_type);

-- Habilitar RLS
ALTER TABLE public.form_field_configs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view configs from their estabelecimento"
  ON public.form_field_configs FOR SELECT
  USING (
    estabelecimento_id = get_user_estabelecimento_id(auth.uid())
    OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  );

CREATE POLICY "Users can manage configs from their estabelecimento"
  ON public.form_field_configs FOR ALL
  USING (
    (estabelecimento_id = get_user_estabelecimento_id(auth.uid()) OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR NOT roles_present())
  )
  WITH CHECK (
    (estabelecimento_id = get_user_estabelecimento_id(auth.uid()) OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR NOT roles_present())
  );

-- Trigger para atualizar updated_at
CREATE TRIGGER update_form_field_configs_updated_at
  BEFORE UPDATE ON public.form_field_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();