-- Corrigir função para incluir search_path
CREATE OR REPLACE FUNCTION update_notificacoes_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;