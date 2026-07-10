ALTER TABLE public.sms_queue
  ALTER COLUMN max_tentativas SET DEFAULT 1;

UPDATE public.sms_queue
SET max_tentativas = 1
WHERE status IN ('pendente', 'enviando')
  AND max_tentativas <> 1;