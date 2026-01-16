-- Add link_clicked_at column to emails table for tracking link clicks
ALTER TABLE public.emails ADD COLUMN IF NOT EXISTS link_clicked_at TIMESTAMP WITH TIME ZONE;