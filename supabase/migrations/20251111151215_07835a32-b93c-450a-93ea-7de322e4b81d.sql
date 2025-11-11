-- Add bot_active field to control when bot should respond
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS bot_active boolean NOT NULL DEFAULT true;

-- Add comment
COMMENT ON COLUMN public.conversations.bot_active IS 'Indica se o bot está ativo para esta conversa. False quando um agente assume o atendimento.';
