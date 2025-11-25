-- Adiciona campo de vencimento na tabela automacoes_vendas
ALTER TABLE public.automacoes_vendas
ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE NULL;

-- Cria índice para melhorar performance na verificação de vencimentos
CREATE INDEX idx_automacoes_vendas_expires_at 
ON public.automacoes_vendas(expires_at) 
WHERE expires_at IS NOT NULL AND ativo = true;

-- Cria função para desativar automações vencidas
CREATE OR REPLACE FUNCTION public.desativar_automacoes_vencidas()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.automacoes_vendas
  SET ativo = false,
      updated_at = now()
  WHERE expires_at IS NOT NULL 
    AND expires_at <= now()
    AND ativo = true;
END;
$$;

COMMENT ON COLUMN public.automacoes_vendas.expires_at IS 'Data de vencimento da automação. Quando chegar nesta data, a automação será desativada automaticamente. NULL significa tempo indeterminado.';