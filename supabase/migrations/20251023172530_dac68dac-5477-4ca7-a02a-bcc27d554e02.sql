-- Apply same fix to quick_attachments table
ALTER TABLE public.quick_attachments
DROP CONSTRAINT IF EXISTS quick_attachments_user_id_fkey;

ALTER TABLE public.quick_attachments
ALTER COLUMN user_id DROP NOT NULL;
