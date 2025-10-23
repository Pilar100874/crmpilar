-- Add shortcut column to quick_replies table
ALTER TABLE quick_replies 
ADD COLUMN IF NOT EXISTS shortcut text;

-- Add unique constraint for shortcuts to avoid conflicts
CREATE UNIQUE INDEX IF NOT EXISTS quick_replies_shortcut_key 
ON quick_replies(shortcut) 
WHERE shortcut IS NOT NULL;