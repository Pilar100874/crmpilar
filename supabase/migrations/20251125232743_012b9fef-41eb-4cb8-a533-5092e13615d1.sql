-- Corrige a função para incluir search_path
CREATE OR REPLACE FUNCTION public.desativar_automacoes_vencidas()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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