-- Add file_type and thumbnail_url columns to quick_attachments table
ALTER TABLE quick_attachments 
ADD COLUMN IF NOT EXISTS file_type text,
ADD COLUMN IF NOT EXISTS thumbnail_url text;

-- Add check constraint for valid file types
ALTER TABLE quick_attachments
ADD CONSTRAINT valid_file_type 
CHECK (file_type IS NULL OR file_type IN ('image', 'pdf', 'excel', 'word'));