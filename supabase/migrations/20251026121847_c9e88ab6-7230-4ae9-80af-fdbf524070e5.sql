-- Tabela de funis (pipelines)
CREATE TABLE IF NOT EXISTS public.funis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id UUID REFERENCES public.estabelecimentos(id),
  nome TEXT NOT NULL,
  descricao TEXT,
  cor TEXT DEFAULT '#3b82f6',
  ativo BOOLEAN DEFAULT true,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de etapas dos funis
CREATE TABLE IF NOT EXISTS public.funil_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funil_id UUID NOT NULL REFERENCES public.funis(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  cor TEXT DEFAULT '#64748b',
  ordem INTEGER NOT NULL DEFAULT 0,
  is_final BOOLEAN DEFAULT false,
  playbook_automatico JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(funil_id, ordem)
);

-- Tabela de deals/negócios
CREATE TABLE IF NOT EXISTS public.funil_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funil_id UUID NOT NULL REFERENCES public.funis(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES public.funil_stages(id),
  estabelecimento_id UUID REFERENCES public.estabelecimentos(id),
  cliente_nome TEXT NOT NULL,
  cliente_id UUID REFERENCES public.customers(id),
  valor DECIMAL(15,2) DEFAULT 0,
  data_estimada DATE,
  responsavel_id UUID REFERENCES public.usuarios(id),
  origem TEXT,
  status TEXT DEFAULT 'ativo',
  saude TEXT DEFAULT 'verde',
  dias_parado INTEGER DEFAULT 0,
  prioridade INTEGER DEFAULT 0,
  ultima_interacao TIMESTAMP WITH TIME ZONE,
  tags TEXT[],
  custom_fields JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_funis_estabelecimento ON public.funis(estabelecimento_id);
CREATE INDEX IF NOT EXISTS idx_funil_stages_funil ON public.funil_stages(funil_id);
CREATE INDEX IF NOT EXISTS idx_funil_deals_funil ON public.funil_deals(funil_id);
CREATE INDEX IF NOT EXISTS idx_funil_deals_stage ON public.funil_deals(stage_id);
CREATE INDEX IF NOT EXISTS idx_funil_deals_estabelecimento ON public.funil_deals(estabelecimento_id);

-- Habilita RLS
ALTER TABLE public.funis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funil_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funil_deals ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para funis
CREATE POLICY "Users can view funis from same estabelecimento"
  ON public.funis FOR SELECT
  USING (
    estabelecimento_id IN (
      SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
    ) OR 
    EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  );

CREATE POLICY "Users can manage funis from same estabelecimento"
  ON public.funis FOR ALL
  USING (
    (estabelecimento_id IN (
      SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
    ) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role)))
    OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  );

-- Políticas RLS para funil_stages
CREATE POLICY "Users can view stages from their funis"
  ON public.funil_stages FOR SELECT
  USING (
    funil_id IN (
      SELECT id FROM public.funis WHERE estabelecimento_id IN (
        SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
      )
    ) OR 
    EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  );

CREATE POLICY "Users can manage stages from their funis"
  ON public.funil_stages FOR ALL
  USING (
    funil_id IN (
      SELECT id FROM public.funis WHERE estabelecimento_id IN (
        SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
      ) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role))
    ) OR 
    EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  );

-- Políticas RLS para funil_deals
CREATE POLICY "Users can view deals from same estabelecimento"
  ON public.funil_deals FOR SELECT
  USING (
    estabelecimento_id IN (
      SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
    ) OR 
    EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  );

CREATE POLICY "Users can manage deals from same estabelecimento"
  ON public.funil_deals FOR ALL
  USING (
    (estabelecimento_id IN (
      SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
    ) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR responsavel_id = auth.uid()))
    OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  );

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_funil_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_funis_updated_at
  BEFORE UPDATE ON public.funis
  FOR EACH ROW
  EXECUTE FUNCTION update_funil_updated_at();

CREATE TRIGGER update_funil_deals_updated_at
  BEFORE UPDATE ON public.funil_deals
  FOR EACH ROW
  EXECUTE FUNCTION update_funil_updated_at();