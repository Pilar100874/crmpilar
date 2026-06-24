
ALTER TABLE public.ponto_funcionarios
  ADD COLUMN IF NOT EXISTS face_url text,
  ADD COLUMN IF NOT EXISTS face_enrolled_at timestamptz,
  ADD COLUMN IF NOT EXISTS face_match_threshold integer NOT NULL DEFAULT 70;
