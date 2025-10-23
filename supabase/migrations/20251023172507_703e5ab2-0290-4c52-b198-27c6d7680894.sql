-- Remove foreign key constraint that's blocking inserts
-- The user_id should be nullable and not require a foreign key to a specific table
-- since users can be either in administradores or usuarios tables

ALTER TABLE public.quick_replies
DROP CONSTRAINT IF EXISTS quick_replies_user_id_fkey;

-- Make user_id nullable if it isn't already
ALTER TABLE public.quick_replies
ALTER COLUMN user_id DROP NOT NULL;
