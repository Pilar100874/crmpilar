ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS automacao_ambiente_celular uuid REFERENCES public.automacao_ambientes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS automacao_ambiente_tablet uuid REFERENCES public.automacao_ambientes(id) ON DELETE SET NULL;