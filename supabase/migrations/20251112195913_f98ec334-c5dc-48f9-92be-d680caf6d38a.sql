-- Criar tabela de vínculos de empresas com usuários e segmentos
CREATE TABLE IF NOT EXISTS public.empresa_vinculos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES public.usuarios(id) ON DELETE CASCADE,
  segmento_id UUID REFERENCES public.segmentos(id) ON DELETE CASCADE,
  estabelecimento_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Garantir que a empresa está vinculada a pelo menos um: usuário OU segmento
  CONSTRAINT empresa_vinculo_check CHECK (
    (usuario_id IS NOT NULL AND segmento_id IS NULL) OR
    (usuario_id IS NULL AND segmento_id IS NOT NULL) OR
    (usuario_id IS NOT NULL AND segmento_id IS NOT NULL)
  ),
  
  -- Evitar vínculos duplicados
  UNIQUE(empresa_id, usuario_id, segmento_id)
);

-- Habilitar RLS
ALTER TABLE public.empresa_vinculos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para empresa_vinculos
CREATE POLICY "Authenticated users can view empresa_vinculos"
ON public.empresa_vinculos
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins and gestores can manage empresa_vinculos"
ON public.empresa_vinculos
FOR ALL
TO authenticated
USING (
  (estabelecimento_id = get_user_estabelecimento_id(auth.uid()))
  OR (EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
  OR (NOT roles_present())
)
WITH CHECK (
  (estabelecimento_id = get_user_estabelecimento_id(auth.uid()))
  OR (EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
  OR (NOT roles_present())
);

-- Índices para melhor performance
CREATE INDEX idx_empresa_vinculos_empresa_id ON public.empresa_vinculos(empresa_id);
CREATE INDEX idx_empresa_vinculos_usuario_id ON public.empresa_vinculos(usuario_id);
CREATE INDEX idx_empresa_vinculos_segmento_id ON public.empresa_vinculos(segmento_id);
CREATE INDEX idx_empresa_vinculos_estabelecimento_id ON public.empresa_vinculos(estabelecimento_id);