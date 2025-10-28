-- Corrigir search_path nas funções para resolver warnings de segurança

CREATE OR REPLACE FUNCTION generate_orcamento_token()
RETURNS text AS $$
DECLARE
  new_token text;
  token_exists boolean;
BEGIN
  LOOP
    new_token := encode(gen_random_bytes(24), 'hex');
    SELECT EXISTS(SELECT 1 FROM orcamentos WHERE token_compartilhamento = new_token) INTO token_exists;
    IF NOT token_exists THEN
      RETURN new_token;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

CREATE OR REPLACE FUNCTION set_orcamento_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.token_compartilhamento IS NULL THEN
    NEW.token_compartilhamento := generate_orcamento_token();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;