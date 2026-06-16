ALTER TABLE public.bot_flows
  ADD COLUMN IF NOT EXISTS forward_to_bot_id uuid REFERENCES public.bot_flows(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS forward_to_bot_enabled boolean NOT NULL DEFAULT false;