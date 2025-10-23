-- Adicionar coluna estabelecimento_id nas tabelas que não têm
ALTER TABLE public.unidades 
ADD COLUMN estabelecimento_id uuid REFERENCES public.estabelecimentos(id);

ALTER TABLE public.segmentos 
ADD COLUMN estabelecimento_id uuid REFERENCES public.estabelecimentos(id);

ALTER TABLE public.grupos_acesso 
ADD COLUMN estabelecimento_id uuid REFERENCES public.estabelecimentos(id);

-- Criar tabela para redes sociais por estabelecimento
CREATE TABLE public.redes_sociais (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id uuid NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  whatsapp text,
  instagram text,
  facebook text,
  website text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(estabelecimento_id)
);

-- Enable RLS
ALTER TABLE public.redes_sociais ENABLE ROW LEVEL SECURITY;

-- RLS Policies para redes_sociais
CREATE POLICY "Users can view redes sociais from same estabelecimento"
ON public.redes_sociais
FOR SELECT
USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id 
    FROM usuarios 
    WHERE id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 
    FROM administradores 
    WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can manage redes sociais from same estabelecimento"
ON public.redes_sociais
FOR ALL
USING (
  (
    estabelecimento_id IN (
      SELECT estabelecimento_id 
      FROM usuarios 
      WHERE id = auth.uid()
    )
    AND (
      has_role(auth.uid(), 'admin'::app_role) 
      OR has_role(auth.uid(), 'gestor'::app_role)
    )
  )
  OR EXISTS (
    SELECT 1 
    FROM administradores 
    WHERE id = auth.uid()
  )
)
WITH CHECK (
  (
    estabelecimento_id IN (
      SELECT estabelecimento_id 
      FROM usuarios 
      WHERE id = auth.uid()
    )
    AND (
      has_role(auth.uid(), 'admin'::app_role) 
      OR has_role(auth.uid(), 'gestor'::app_role)
    )
  )
  OR EXISTS (
    SELECT 1 
    FROM administradores 
    WHERE id = auth.uid()
  )
);

-- Atualizar RLS policies das tabelas existentes para usar estabelecimento_id

-- Unidades
DROP POLICY IF EXISTS "Authenticated users can view unidades" ON public.unidades;
DROP POLICY IF EXISTS "Users can manage unidades" ON public.unidades;

CREATE POLICY "Users can view unidades from same estabelecimento"
ON public.unidades
FOR SELECT
USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id 
    FROM usuarios 
    WHERE id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 
    FROM administradores 
    WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can manage unidades from same estabelecimento"
ON public.unidades
FOR ALL
USING (
  (
    estabelecimento_id IN (
      SELECT estabelecimento_id 
      FROM usuarios 
      WHERE id = auth.uid()
    )
    AND (
      has_role(auth.uid(), 'admin'::app_role) 
      OR has_role(auth.uid(), 'gestor'::app_role)
    )
  )
  OR EXISTS (
    SELECT 1 
    FROM administradores 
    WHERE id = auth.uid()
  )
)
WITH CHECK (
  (
    estabelecimento_id IN (
      SELECT estabelecimento_id 
      FROM usuarios 
      WHERE id = auth.uid()
    )
    AND (
      has_role(auth.uid(), 'admin'::app_role) 
      OR has_role(auth.uid(), 'gestor'::app_role)
    )
  )
  OR EXISTS (
    SELECT 1 
    FROM administradores 
    WHERE id = auth.uid()
  )
);

-- Segmentos
DROP POLICY IF EXISTS "Authenticated users can view segmentos" ON public.segmentos;
DROP POLICY IF EXISTS "Users can manage segmentos" ON public.segmentos;

CREATE POLICY "Users can view segmentos from same estabelecimento"
ON public.segmentos
FOR SELECT
USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id 
    FROM usuarios 
    WHERE id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 
    FROM administradores 
    WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can manage segmentos from same estabelecimento"
ON public.segmentos
FOR ALL
USING (
  (
    estabelecimento_id IN (
      SELECT estabelecimento_id 
      FROM usuarios 
      WHERE id = auth.uid()
    )
    AND (
      has_role(auth.uid(), 'admin'::app_role) 
      OR has_role(auth.uid(), 'gestor'::app_role)
    )
  )
  OR EXISTS (
    SELECT 1 
    FROM administradores 
    WHERE id = auth.uid()
  )
)
WITH CHECK (
  (
    estabelecimento_id IN (
      SELECT estabelecimento_id 
      FROM usuarios 
      WHERE id = auth.uid()
    )
    AND (
      has_role(auth.uid(), 'admin'::app_role) 
      OR has_role(auth.uid(), 'gestor'::app_role)
    )
  )
  OR EXISTS (
    SELECT 1 
    FROM administradores 
    WHERE id = auth.uid()
  )
);

-- Grupos de Acesso
DROP POLICY IF EXISTS "Authenticated users can view grupos_acesso" ON public.grupos_acesso;
DROP POLICY IF EXISTS "Users can manage grupos_acesso" ON public.grupos_acesso;

CREATE POLICY "Users can view grupos_acesso from same estabelecimento"
ON public.grupos_acesso
FOR SELECT
USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id 
    FROM usuarios 
    WHERE id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 
    FROM administradores 
    WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can manage grupos_acesso from same estabelecimento"
ON public.grupos_acesso
FOR ALL
USING (
  (
    estabelecimento_id IN (
      SELECT estabelecimento_id 
      FROM usuarios 
      WHERE id = auth.uid()
    )
    AND (
      has_role(auth.uid(), 'admin'::app_role) 
      OR has_role(auth.uid(), 'gestor'::app_role)
    )
  )
  OR EXISTS (
    SELECT 1 
    FROM administradores 
    WHERE id = auth.uid()
  )
)
WITH CHECK (
  (
    estabelecimento_id IN (
      SELECT estabelecimento_id 
      FROM usuarios 
      WHERE id = auth.uid()
    )
    AND (
      has_role(auth.uid(), 'admin'::app_role) 
      OR has_role(auth.uid(), 'gestor'::app_role)
    )
  )
  OR EXISTS (
    SELECT 1 
    FROM administradores 
    WHERE id = auth.uid()
  )
);

-- Trigger para atualizar updated_at em redes_sociais
CREATE TRIGGER update_redes_sociais_updated_at
  BEFORE UPDATE ON public.redes_sociais
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();