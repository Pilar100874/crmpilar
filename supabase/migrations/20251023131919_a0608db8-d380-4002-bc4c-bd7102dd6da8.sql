-- Create estabelecimentos table
CREATE TABLE public.estabelecimentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cnpj TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  numero_usuarios_permitidos INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on estabelecimentos
ALTER TABLE public.estabelecimentos ENABLE ROW LEVEL SECURITY;

-- Only administrators can view and manage estabelecimentos
CREATE POLICY "Administrators can view estabelecimentos"
  ON public.estabelecimentos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.administradores
      WHERE administradores.id = auth.uid()
    )
  );

CREATE POLICY "Administrators can manage estabelecimentos"
  ON public.estabelecimentos
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.administradores
      WHERE administradores.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.administradores
      WHERE administradores.id = auth.uid()
    )
  );

-- Add estabelecimento_id to usuarios table
ALTER TABLE public.usuarios ADD COLUMN estabelecimento_id UUID REFERENCES public.estabelecimentos(id) ON DELETE CASCADE;

-- Add estabelecimento_id to customers table
ALTER TABLE public.customers ADD COLUMN estabelecimento_id UUID REFERENCES public.estabelecimentos(id) ON DELETE CASCADE;

-- Add estabelecimento_id to campaigns table
ALTER TABLE public.campaigns ADD COLUMN estabelecimento_id UUID REFERENCES public.estabelecimentos(id) ON DELETE CASCADE;

-- Add estabelecimento_id to contents table
ALTER TABLE public.contents ADD COLUMN estabelecimento_id UUID REFERENCES public.estabelecimentos(id) ON DELETE CASCADE;

-- Add estabelecimento_id to conversations table
ALTER TABLE public.conversations ADD COLUMN estabelecimento_id UUID REFERENCES public.estabelecimentos(id) ON DELETE CASCADE;

-- Add estabelecimento_id to flows table
ALTER TABLE public.flows ADD COLUMN estabelecimento_id UUID REFERENCES public.estabelecimentos(id) ON DELETE CASCADE;

-- Add estabelecimento_id to bot_flows table
ALTER TABLE public.bot_flows ADD COLUMN estabelecimento_id UUID REFERENCES public.estabelecimentos(id) ON DELETE CASCADE;

-- Update RLS policies for usuarios to filter by estabelecimento
DROP POLICY IF EXISTS "Authenticated users can view usuarios" ON public.usuarios;
DROP POLICY IF EXISTS "Users can manage usuarios" ON public.usuarios;

CREATE POLICY "Users can view usuarios from same estabelecimento"
  ON public.usuarios
  FOR SELECT
  USING (
    estabelecimento_id IN (
      SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.administradores WHERE administradores.id = auth.uid()
    )
  );

CREATE POLICY "Users can manage usuarios from same estabelecimento"
  ON public.usuarios
  FOR ALL
  USING (
    (estabelecimento_id IN (
      SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
    ) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role)))
    OR EXISTS (
      SELECT 1 FROM public.administradores WHERE administradores.id = auth.uid()
    )
  );

-- Update RLS policies for customers to filter by estabelecimento
DROP POLICY IF EXISTS "Authenticated users can view customers" ON public.customers;
DROP POLICY IF EXISTS "Admins and gestores can manage customers" ON public.customers;

CREATE POLICY "Users can view customers from same estabelecimento"
  ON public.customers
  FOR SELECT
  USING (
    estabelecimento_id IN (
      SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.administradores WHERE administradores.id = auth.uid()
    )
  );

CREATE POLICY "Users can manage customers from same estabelecimento"
  ON public.customers
  FOR ALL
  USING (
    (estabelecimento_id IN (
      SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
    ) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role)))
    OR EXISTS (
      SELECT 1 FROM public.administradores WHERE administradores.id = auth.uid()
    )
  );

-- Update RLS policies for campaigns
DROP POLICY IF EXISTS "Authenticated users can view campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Admins and gestores can manage campaigns" ON public.campaigns;

CREATE POLICY "Users can view campaigns from same estabelecimento"
  ON public.campaigns
  FOR SELECT
  USING (
    estabelecimento_id IN (
      SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.administradores WHERE administradores.id = auth.uid()
    )
  );

CREATE POLICY "Users can manage campaigns from same estabelecimento"
  ON public.campaigns
  FOR ALL
  USING (
    (estabelecimento_id IN (
      SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
    ) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role)))
    OR EXISTS (
      SELECT 1 FROM public.administradores WHERE administradores.id = auth.uid()
    )
  );

-- Update RLS policies for contents
DROP POLICY IF EXISTS "Authenticated users can view contents" ON public.contents;
DROP POLICY IF EXISTS "Admins and gestores can manage contents" ON public.contents;

CREATE POLICY "Users can view contents from same estabelecimento"
  ON public.contents
  FOR SELECT
  USING (
    estabelecimento_id IN (
      SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.administradores WHERE administradores.id = auth.uid()
    )
  );

CREATE POLICY "Users can manage contents from same estabelecimento"
  ON public.contents
  FOR ALL
  USING (
    (estabelecimento_id IN (
      SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
    ) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role)))
    OR EXISTS (
      SELECT 1 FROM public.administradores WHERE administradores.id = auth.uid()
    )
  );

-- Update RLS policies for conversations
DROP POLICY IF EXISTS "Authenticated users can view conversations" ON public.conversations;
DROP POLICY IF EXISTS "Agentes can update assigned conversations" ON public.conversations;

CREATE POLICY "Users can view conversations from same estabelecimento"
  ON public.conversations
  FOR SELECT
  USING (
    estabelecimento_id IN (
      SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.administradores WHERE administradores.id = auth.uid()
    )
  );

CREATE POLICY "Users can update conversations from same estabelecimento"
  ON public.conversations
  FOR UPDATE
  USING (
    (assignee_id = auth.uid() OR (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role)))
    AND estabelecimento_id IN (
      SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
    )
  );

-- Update RLS policies for flows
DROP POLICY IF EXISTS "Authenticated users can view published flows" ON public.flows;
DROP POLICY IF EXISTS "Admins and gestores can manage flows" ON public.flows;

CREATE POLICY "Users can view flows from same estabelecimento"
  ON public.flows
  FOR SELECT
  USING (
    ((published = true OR created_by = auth.uid()) AND estabelecimento_id IN (
      SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
    ))
    OR EXISTS (
      SELECT 1 FROM public.administradores WHERE administradores.id = auth.uid()
    )
  );

CREATE POLICY "Users can manage flows from same estabelecimento"
  ON public.flows
  FOR ALL
  USING (
    (estabelecimento_id IN (
      SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
    ) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role)))
    OR EXISTS (
      SELECT 1 FROM public.administradores WHERE administradores.id = auth.uid()
    )
  );

-- Update RLS policies for bot_flows
DROP POLICY IF EXISTS "Authenticated users can view bot flows" ON public.bot_flows;
DROP POLICY IF EXISTS "Admins and gestores can manage bot flows" ON public.bot_flows;

CREATE POLICY "Users can view bot flows from same estabelecimento"
  ON public.bot_flows
  FOR SELECT
  USING (
    estabelecimento_id IN (
      SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.administradores WHERE administradores.id = auth.uid()
    )
  );

CREATE POLICY "Users can manage bot flows from same estabelecimento"
  ON public.bot_flows
  FOR ALL
  USING (
    (estabelecimento_id IN (
      SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
    ) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role)))
    OR EXISTS (
      SELECT 1 FROM public.administradores WHERE administradores.id = auth.uid()
    )
  );

-- Add trigger for estabelecimentos updated_at
CREATE TRIGGER update_estabelecimentos_updated_at
  BEFORE UPDATE ON public.estabelecimentos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to check user limit before creating new user
CREATE OR REPLACE FUNCTION public.check_user_limit()
RETURNS TRIGGER AS $$
DECLARE
  current_count INTEGER;
  max_users INTEGER;
BEGIN
  -- Get current user count and max allowed for the estabelecimento
  SELECT COUNT(*), e.numero_usuarios_permitidos
  INTO current_count, max_users
  FROM public.usuarios u
  JOIN public.estabelecimentos e ON e.id = NEW.estabelecimento_id
  WHERE u.estabelecimento_id = NEW.estabelecimento_id
  GROUP BY e.numero_usuarios_permitidos;
  
  -- If no users exist yet, get the max from estabelecimentos
  IF current_count IS NULL THEN
    SELECT numero_usuarios_permitidos INTO max_users
    FROM public.estabelecimentos
    WHERE id = NEW.estabelecimento_id;
    current_count := 0;
  END IF;
  
  -- Check if limit is reached
  IF current_count >= max_users THEN
    RAISE EXCEPTION 'Limite de usuários atingido para este estabelecimento (máximo: %)', max_users;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add trigger to check user limit before insert
CREATE TRIGGER check_user_limit_trigger
  BEFORE INSERT ON public.usuarios
  FOR EACH ROW
  EXECUTE FUNCTION public.check_user_limit();