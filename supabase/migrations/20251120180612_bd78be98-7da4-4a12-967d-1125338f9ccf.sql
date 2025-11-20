-- Criar bucket para anexos do chat
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas RLS para o bucket chat-attachments
CREATE POLICY "Usuários autenticados podem fazer upload" 
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'chat-attachments');

CREATE POLICY "Anexos são públicos para visualização" 
ON storage.objects 
FOR SELECT 
TO public
USING (bucket_id = 'chat-attachments');

CREATE POLICY "Usuários podem deletar seus próprios anexos" 
ON storage.objects 
FOR DELETE 
TO authenticated
USING (bucket_id = 'chat-attachments');