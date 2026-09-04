ALTER TABLE public.cv_inspection_config
  ADD COLUMN IF NOT EXISTS entry_ai_analysis boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS exit_ai_analysis boolean NOT NULL DEFAULT true;