ALTER TABLE public.studio_visual_identity
  ADD COLUMN IF NOT EXISTS use_prompt boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS use_images boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS selected_images jsonb NOT NULL DEFAULT '[]'::jsonb;