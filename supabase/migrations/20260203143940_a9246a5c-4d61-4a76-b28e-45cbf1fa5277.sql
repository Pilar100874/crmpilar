-- Tabela para configuração do webhook de envio em massa
CREATE TABLE public.envio_massa_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  webhook_id UUID NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(estabelecimento_id)
);

-- Enable RLS
ALTER TABLE public.envio_massa_config ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Usuários podem ver config do seu estabelecimento"
ON public.envio_massa_config
FOR SELECT
USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
  )
);

CREATE POLICY "Usuários podem inserir config do seu estabelecimento"
ON public.envio_massa_config
FOR INSERT
WITH CHECK (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
  )
);

CREATE POLICY "Usuários podem atualizar config do seu estabelecimento"
ON public.envio_massa_config
FOR UPDATE
USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
  )
);

CREATE POLICY "Usuários podem deletar config do seu estabelecimento"
ON public.envio_massa_config
FOR DELETE
USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
  )
);