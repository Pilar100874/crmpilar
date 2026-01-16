-- Adicionar campos para tracking de abertura de email
ALTER TABLE public.emails 
ADD COLUMN IF NOT EXISTS tracking_id UUID DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS opened_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS opened_count INTEGER DEFAULT 0;

-- Criar índice para busca rápida pelo tracking_id
CREATE INDEX IF NOT EXISTS idx_emails_tracking_id ON public.emails(tracking_id);