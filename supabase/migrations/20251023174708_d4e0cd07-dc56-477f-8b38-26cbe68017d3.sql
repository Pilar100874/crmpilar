-- Create webhook_types table
CREATE TABLE IF NOT EXISTS public.webhook_types (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id uuid NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(estabelecimento_id, name)
);

-- Create webhook_usage_locations table
CREATE TABLE IF NOT EXISTS public.webhook_usage_locations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id uuid NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(estabelecimento_id, name)
);

-- Enable RLS
ALTER TABLE public.webhook_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_usage_locations ENABLE ROW LEVEL SECURITY;

-- RLS policies for webhook_types
CREATE POLICY "View webhook types (same estab or init)"
ON public.webhook_types
FOR SELECT
USING (
  NOT public.roles_present()
  OR EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = auth.uid())
  OR estabelecimento_id IN (
    SELECT u.estabelecimento_id FROM public.usuarios u WHERE u.id = auth.uid()
  )
);

CREATE POLICY "Manage webhook types (init or permitted)"
ON public.webhook_types
FOR ALL
USING (
  NOT public.roles_present()
  OR EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = auth.uid())
  OR (
    (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'gestor'::app_role))
    AND estabelecimento_id IN (
      SELECT u.estabelecimento_id FROM public.usuarios u WHERE u.id = auth.uid()
    )
  )
)
WITH CHECK (
  NOT public.roles_present()
  OR EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = auth.uid())
  OR (
    (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'gestor'::app_role))
    AND estabelecimento_id IN (
      SELECT u.estabelecimento_id FROM public.usuarios u WHERE u.id = auth.uid()
    )
  )
);

-- RLS policies for webhook_usage_locations
CREATE POLICY "View webhook locations (same estab or init)"
ON public.webhook_usage_locations
FOR SELECT
USING (
  NOT public.roles_present()
  OR EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = auth.uid())
  OR estabelecimento_id IN (
    SELECT u.estabelecimento_id FROM public.usuarios u WHERE u.id = auth.uid()
  )
);

CREATE POLICY "Manage webhook locations (init or permitted)"
ON public.webhook_usage_locations
FOR ALL
USING (
  NOT public.roles_present()
  OR EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = auth.uid())
  OR (
    (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'gestor'::app_role))
    AND estabelecimento_id IN (
      SELECT u.estabelecimento_id FROM public.usuarios u WHERE u.id = auth.uid()
    )
  )
)
WITH CHECK (
  NOT public.roles_present()
  OR EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = auth.uid())
  OR (
    (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'gestor'::app_role))
    AND estabelecimento_id IN (
      SELECT u.estabelecimento_id FROM public.usuarios u WHERE u.id = auth.uid()
    )
  )
);

-- Create triggers for updated_at
CREATE TRIGGER update_webhook_types_updated_at
BEFORE UPDATE ON public.webhook_types
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_webhook_usage_locations_updated_at
BEFORE UPDATE ON public.webhook_usage_locations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();