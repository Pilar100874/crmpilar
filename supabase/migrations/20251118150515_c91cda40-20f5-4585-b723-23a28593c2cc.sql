-- Add conference_room_password column to ucm_config table
ALTER TABLE public.ucm_config
ADD COLUMN IF NOT EXISTS conference_room_password TEXT;