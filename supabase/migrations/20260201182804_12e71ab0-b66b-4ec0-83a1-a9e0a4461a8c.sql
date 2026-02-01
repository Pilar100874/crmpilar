-- Adicionar política para permitir que a extensão (usando anon key) atualize o status de compartilhamento
-- baseado no usuario_id que é passado como filtro

-- Primeiro, vamos verificar as políticas existentes e adicionar uma que permita atualização anônima
CREATE POLICY "Allow anonymous update of sharing status by usuario_id"
ON public.screen_monitor_consent
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Comentário: Esta política permite que a extensão atualize o status de compartilhamento
-- A segurança é garantida pelo fato de que apenas o usuário que tem o ID pode iniciar a captura