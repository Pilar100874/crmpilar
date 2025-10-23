-- Adicionar coluna estabelecimento_id nas tabelas que não têm (com nullable para não quebrar dados existentes)
ALTER TABLE public.api_endpoints 
ADD COLUMN IF NOT EXISTS estabelecimento_id uuid REFERENCES public.estabelecimentos(id);

-- Criar tabela para configurações de canais por estabelecimento
CREATE TABLE IF NOT EXISTS public.canais_atendimento (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id uuid NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  whatsapp_enabled boolean DEFAULT true,
  telegram_enabled boolean DEFAULT false,
  webchat_enabled boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(estabelecimento_id)
);

-- Enable RLS
ALTER TABLE public.canais_atendimento ENABLE ROW LEVEL SECURITY;

-- RLS Policies para canais_atendimento
CREATE POLICY "Users can view canais from same estabelecimento"
ON public.canais_atendimento
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

CREATE POLICY "Users can manage canais from same estabelecimento"
ON public.canais_atendimento
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

-- Criar tabela para configurações de notificações por estabelecimento
CREATE TABLE IF NOT EXISTS public.notificacoes_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id uuid NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  nova_conversa_enabled boolean DEFAULT true,
  campanha_concluida_enabled boolean DEFAULT true,
  erros_sistema_enabled boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(estabelecimento_id)
);

-- Enable RLS
ALTER TABLE public.notificacoes_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies para notificacoes_config
CREATE POLICY "Users can view notificacoes from same estabelecimento"
ON public.notificacoes_config
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

CREATE POLICY "Users can manage notificacoes from same estabelecimento"
ON public.notificacoes_config
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

-- Criar tabela para configurações de segurança/LGPD por estabelecimento
CREATE TABLE IF NOT EXISTS public.seguranca_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id uuid NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  retencao_dados_dias integer DEFAULT 90,
  consentimento_obrigatorio boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(estabelecimento_id)
);

-- Enable RLS
ALTER TABLE public.seguranca_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies para seguranca_config
CREATE POLICY "Users can view seguranca from same estabelecimento"
ON public.seguranca_config
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

CREATE POLICY "Users can manage seguranca from same estabelecimento"
ON public.seguranca_config
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

-- Triggers para atualizar updated_at
CREATE TRIGGER update_canais_atendimento_updated_at
  BEFORE UPDATE ON public.canais_atendimento
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notificacoes_config_updated_at
  BEFORE UPDATE ON public.notificacoes_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_seguranca_config_updated_at
  BEFORE UPDATE ON public.seguranca_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();