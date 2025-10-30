-- Add local_uso column to webhooks table
ALTER TABLE webhooks ADD COLUMN IF NOT EXISTS local_uso text;

-- Set default value for existing rows
UPDATE webhooks SET local_uso = 'bot' WHERE local_uso IS NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_webhooks_local_uso ON webhooks(local_uso);