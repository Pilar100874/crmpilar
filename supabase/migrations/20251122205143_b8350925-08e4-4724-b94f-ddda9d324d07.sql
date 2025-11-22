-- Criar tabela para atalhos dos usuários
CREATE TABLE user_atalhos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  estabelecimento_id UUID NOT NULL REFERENCES estabelecimentos(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  icone TEXT NOT NULL,
  path TEXT NOT NULL,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(usuario_id, path)
);

-- Criar índices para performance
CREATE INDEX idx_user_atalhos_usuario ON user_atalhos(usuario_id);
CREATE INDEX idx_user_atalhos_estabelecimento ON user_atalhos(estabelecimento_id);
CREATE INDEX idx_user_atalhos_ordem ON user_atalhos(ordem);

-- RLS policies
ALTER TABLE user_atalhos ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver seus próprios atalhos
CREATE POLICY "Users can view their own atalhos"
ON user_atalhos FOR SELECT
USING (usuario_id = auth.uid());

-- Usuários podem criar seus próprios atalhos
CREATE POLICY "Users can create their own atalhos"
ON user_atalhos FOR INSERT
WITH CHECK (usuario_id = auth.uid());

-- Usuários podem atualizar seus próprios atalhos
CREATE POLICY "Users can update their own atalhos"
ON user_atalhos FOR UPDATE
USING (usuario_id = auth.uid());

-- Usuários podem deletar seus próprios atalhos
CREATE POLICY "Users can delete their own atalhos"
ON user_atalhos FOR DELETE
USING (usuario_id = auth.uid());

-- Comentários
COMMENT ON TABLE user_atalhos IS 'Armazena os atalhos personalizados de cada usuário';
COMMENT ON COLUMN user_atalhos.titulo IS 'Título do atalho exibido no menu';
COMMENT ON COLUMN user_atalhos.icone IS 'Nome do ícone do lucide-react';
COMMENT ON COLUMN user_atalhos.path IS 'Caminho da rota (ex: /contatos)';
COMMENT ON COLUMN user_atalhos.ordem IS 'Ordem de exibição no menu';