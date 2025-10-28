-- Função para gerar token único de compartilhamento
CREATE OR REPLACE FUNCTION generate_orcamento_token()
RETURNS text AS $$
DECLARE
  new_token text;
  token_exists boolean;
BEGIN
  LOOP
    -- Gerar token aleatório de 32 caracteres
    new_token := encode(gen_random_bytes(24), 'hex');
    
    -- Verificar se token já existe
    SELECT EXISTS(SELECT 1 FROM orcamentos WHERE token_compartilhamento = new_token) INTO token_exists;
    
    -- Se não existir, retornar o token
    IF NOT token_exists THEN
      RETURN new_token;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger para gerar token automaticamente ao criar orçamento
CREATE OR REPLACE FUNCTION set_orcamento_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.token_compartilhamento IS NULL THEN
    NEW.token_compartilhamento := generate_orcamento_token();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_orcamento_token_trigger ON orcamentos;
CREATE TRIGGER set_orcamento_token_trigger
  BEFORE INSERT ON orcamentos
  FOR EACH ROW
  EXECUTE FUNCTION set_orcamento_token();

-- Política RLS para permitir acesso público via token
DROP POLICY IF EXISTS "Public access via token" ON orcamentos;
CREATE POLICY "Public access via token"
  ON orcamentos
  FOR SELECT
  USING (token_compartilhamento IS NOT NULL);

DROP POLICY IF EXISTS "Public access orcamento_itens via token" ON orcamento_itens;
CREATE POLICY "Public access orcamento_itens via token"
  ON orcamento_itens
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orcamentos o
      WHERE o.id = orcamento_itens.orcamento_id
      AND o.token_compartilhamento IS NOT NULL
    )
  );

-- Permitir que clientes insiram no histórico
DROP POLICY IF EXISTS "Public insert orcamento historico" ON orcamento_historico;
CREATE POLICY "Public insert orcamento historico"
  ON orcamento_historico
  FOR INSERT
  WITH CHECK (tipo_usuario = 'cliente');