-- Criar tabela para relatórios de importação
CREATE TABLE public.relatorios_importacao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  data_criacao DATE NOT NULL,
  api_endpoint TEXT,
  configuracao JSONB NOT NULL DEFAULT '{}'::jsonb,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.relatorios_importacao ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Usuários podem visualizar relatórios do seu estabelecimento"
  ON public.relatorios_importacao
  FOR SELECT
  USING (
    estabelecimento_id IN (
      SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem criar relatórios no seu estabelecimento"
  ON public.relatorios_importacao
  FOR INSERT
  WITH CHECK (
    estabelecimento_id IN (
      SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem atualizar relatórios do seu estabelecimento"
  ON public.relatorios_importacao
  FOR UPDATE
  USING (
    estabelecimento_id IN (
      SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem deletar relatórios do seu estabelecimento"
  ON public.relatorios_importacao
  FOR DELETE
  USING (
    estabelecimento_id IN (
      SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()
    )
  );

-- Trigger para updated_at
CREATE TRIGGER update_relatorios_importacao_updated_at
  BEFORE UPDATE ON public.relatorios_importacao
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();