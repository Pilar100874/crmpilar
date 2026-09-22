CREATE TABLE public.gravacoes_chamadas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  numero TEXT,
  nome TEXT,
  direcao TEXT NOT NULL DEFAULT 'saida',
  inicio TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  duracao_seg INTEGER NOT NULL DEFAULT 0,
  caminho TEXT NOT NULL,
  tamanho_bytes BIGINT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gravacoes_chamadas TO authenticated;
GRANT ALL ON public.gravacoes_chamadas TO service_role;

ALTER TABLE public.gravacoes_chamadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuario ve suas gravacoes" ON public.gravacoes_chamadas
  FOR SELECT TO authenticated
  USING (usuario_id IN (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid()));

CREATE POLICY "Usuario cria suas gravacoes" ON public.gravacoes_chamadas
  FOR INSERT TO authenticated
  WITH CHECK (usuario_id IN (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid()));

CREATE POLICY "Usuario exclui suas gravacoes" ON public.gravacoes_chamadas
  FOR DELETE TO authenticated
  USING (usuario_id IN (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid()));

CREATE INDEX idx_gravacoes_chamadas_usuario ON public.gravacoes_chamadas (usuario_id, created_at DESC);

-- Arquivos de áudio: cada usuário acessa apenas a própria pasta (nomeada com seu auth uid).
CREATE POLICY "Usuario envia audios na propria pasta" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'gravacoes-chamadas' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Usuario le audios da propria pasta" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'gravacoes-chamadas' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Usuario exclui audios da propria pasta" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'gravacoes-chamadas' AND (storage.foldername(name))[1] = auth.uid()::text);