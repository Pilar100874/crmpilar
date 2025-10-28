-- Drop the existing unique constraint on shortcut
ALTER TABLE quick_replies DROP CONSTRAINT IF EXISTS quick_replies_shortcut_key;

-- Create a unique partial index that only enforces uniqueness for non-null shortcuts
-- This allows multiple records with NULL shortcuts while maintaining uniqueness for actual shortcuts
CREATE UNIQUE INDEX IF NOT EXISTS quick_replies_shortcut_estabelecimento_unique 
ON quick_replies (shortcut, estabelecimento_id) 
WHERE shortcut IS NOT NULL;