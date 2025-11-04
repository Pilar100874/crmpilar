-- Criar tabela para armazenar relatórios
CREATE TABLE IF NOT EXISTS public.relatorios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID REFERENCES public.estabelecimentos(id),
  nome TEXT NOT NULL,
  descricao TEXT,
  layout_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  conexao_id UUID REFERENCES public.database_connections(id),
  query_sql TEXT,
  parametros JSONB DEFAULT '[]'::jsonb,
  configuracoes JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.relatorios ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para relatórios
CREATE POLICY "View relatorios (admin email or same estab)"
  ON public.relatorios
  FOR SELECT
  USING (
    ((auth.jwt() ->> 'email'::text) ~~* 'admin_%@sistema.local'::text)
    OR 
    (EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
    OR
    (estabelecimento_id = get_user_estabelecimento_id(auth.uid()))
  );

CREATE POLICY "Insert relatorios (admin email or same estab)"
  ON public.relatorios
  FOR INSERT
  WITH CHECK (
    ((auth.jwt() ->> 'email'::text) ~~* 'admin_%@sistema.local'::text)
    OR 
    (EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
    OR
    ((estabelecimento_id = get_user_estabelecimento_id(auth.uid())) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR NOT roles_present()))
  );

CREATE POLICY "Update relatorios (admin email or same estab)"
  ON public.relatorios
  FOR UPDATE
  USING (
    ((auth.jwt() ->> 'email'::text) ~~* 'admin_%@sistema.local'::text)
    OR 
    (EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
    OR
    ((estabelecimento_id = get_user_estabelecimento_id(auth.uid())) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR NOT roles_present()))
  );

CREATE POLICY "Delete relatorios (admin email or same estab)"
  ON public.relatorios
  FOR DELETE
  USING (
    ((auth.jwt() ->> 'email'::text) ~~* 'admin_%@sistema.local'::text)
    OR 
    (EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
    OR
    ((estabelecimento_id = get_user_estabelecimento_id(auth.uid())) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR NOT roles_present()))
  );

-- Trigger para atualizar updated_at
CREATE TRIGGER update_relatorios_updated_at
  BEFORE UPDATE ON public.relatorios
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();