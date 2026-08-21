
DO $$ BEGIN CREATE TYPE public.ferr_tool_type AS ENUM ('manual','eletrica','pneumatica'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.ferr_app_role AS ENUM ('admin','almoxarifado','usuario'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.ferr_loan_status AS ENUM ('ativo','devolvido','vencido','renovacao_solicitada'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.ferr_renewal_status AS ENUM ('pendente','aprovada','rejeitada'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.ferr_return_issue_type AS ENUM ('manutencao','danificada','perdida'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.ferr_issue_status AS ENUM ('pendente','resolvido','descartado'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.ferr_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj text NOT NULL UNIQUE,
  name text NOT NULL,
  user_limit integer NOT NULL DEFAULT 10,
  is_active boolean NOT NULL DEFAULT true,
  trial_ends_at timestamptz,
  approved_until timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ferr_warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text,
  description text,
  is_active boolean DEFAULT true,
  company_id uuid REFERENCES public.ferr_companies(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ferr_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  qr_code text UNIQUE,
  warehouse_id uuid REFERENCES public.ferr_warehouses(id) ON DELETE SET NULL,
  company_id uuid REFERENCES public.ferr_companies(id),
  allow_relend boolean DEFAULT false,
  avatar_url text,
  last_location_lat numeric,
  last_location_lng numeric,
  last_location_updated_at timestamptz,
  is_approved boolean DEFAULT true,
  is_active boolean DEFAULT true,
  approved_at timestamptz,
  approved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ferr_user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.ferr_app_role NOT NULL DEFAULT 'usuario',
  UNIQUE (user_id, role)
);

CREATE TABLE public.ferr_kits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  company_id uuid REFERENCES public.ferr_companies(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ferr_tools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type public.ferr_tool_type NOT NULL DEFAULT 'manual',
  purchase_date date,
  purchase_value numeric(12,2),
  photo_url text,
  requires_return_photo boolean DEFAULT false,
  is_maintenance boolean DEFAULT false,
  requires_kit boolean DEFAULT false,
  allow_relend boolean DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  kit_id uuid REFERENCES public.ferr_kits(id) ON DELETE SET NULL,
  warehouse_id uuid REFERENCES public.ferr_warehouses(id) ON DELETE SET NULL,
  company_id uuid REFERENCES public.ferr_companies(id),
  serial_number text,
  description text,
  qr_code text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ferr_kit_tools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kit_id uuid NOT NULL REFERENCES public.ferr_kits(id) ON DELETE CASCADE,
  tool_id uuid NOT NULL REFERENCES public.ferr_tools(id) ON DELETE CASCADE,
  is_required boolean DEFAULT true,
  UNIQUE (kit_id, tool_id)
);

CREATE TABLE public.ferr_loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id uuid NOT NULL REFERENCES public.ferr_tools(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.ferr_profiles(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES public.ferr_warehouses(id) ON DELETE CASCADE,
  registered_by uuid REFERENCES public.ferr_profiles(id) ON DELETE SET NULL,
  loan_date timestamptz NOT NULL DEFAULT now(),
  due_date timestamptz NOT NULL,
  return_date timestamptz,
  returned_by uuid REFERENCES public.ferr_profiles(id) ON DELETE SET NULL,
  return_photo_url text,
  status public.ferr_loan_status NOT NULL DEFAULT 'ativo',
  notes text,
  company_id uuid REFERENCES public.ferr_companies(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ferr_loan_renewals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid NOT NULL REFERENCES public.ferr_loans(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES public.ferr_profiles(id) ON DELETE CASCADE,
  new_due_date timestamptz NOT NULL,
  status public.ferr_renewal_status NOT NULL DEFAULT 'pendente',
  approved_by uuid REFERENCES public.ferr_profiles(id) ON DELETE SET NULL,
  request_date timestamptz NOT NULL DEFAULT now(),
  approval_date timestamptz,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ferr_loan_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.ferr_profiles(id),
  warehouse_id uuid REFERENCES public.ferr_warehouses(id),
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','separando','pronto','entregue','cancelado')),
  due_days integer NOT NULL DEFAULT 7,
  custom_due_date timestamptz,
  notes text,
  processed_by uuid REFERENCES public.ferr_profiles(id),
  processed_at timestamptz,
  company_id uuid REFERENCES public.ferr_companies(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ferr_loan_request_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.ferr_loan_requests(id) ON DELETE CASCADE,
  tool_id uuid NOT NULL REFERENCES public.ferr_tools(id),
  is_kit_item boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ferr_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.ferr_profiles(id) ON DELETE CASCADE,
  loan_id uuid REFERENCES public.ferr_loans(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text DEFAULT 'info',
  is_read boolean DEFAULT false,
  company_id uuid REFERENCES public.ferr_companies(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ferr_user_warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.ferr_profiles(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES public.ferr_warehouses(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, warehouse_id)
);

CREATE TABLE public.ferr_role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  route text NOT NULL,
  can_access boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role, route)
);

CREATE TABLE public.ferr_return_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid REFERENCES public.ferr_loans(id) ON DELETE CASCADE,
  tool_id uuid NOT NULL REFERENCES public.ferr_tools(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.ferr_profiles(id),
  reported_by uuid NOT NULL REFERENCES public.ferr_profiles(id),
  issue_type public.ferr_return_issue_type NOT NULL,
  description text,
  requires_discount boolean NOT NULL DEFAULT false,
  discount_resolved boolean NOT NULL DEFAULT false,
  resolved_by uuid REFERENCES public.ferr_profiles(id),
  resolved_at timestamptz,
  resolution_notes text,
  status public.ferr_issue_status NOT NULL DEFAULT 'pendente',
  company_id uuid REFERENCES public.ferr_companies(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ferr_supply_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  company_id uuid REFERENCES public.ferr_companies(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ferr_supplies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  unit text NOT NULL DEFAULT 'un',
  group_id uuid REFERENCES public.ferr_supply_groups(id),
  photo_url text,
  current_stock numeric NOT NULL DEFAULT 0,
  min_stock numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  company_id uuid REFERENCES public.ferr_companies(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ferr_supply_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supply_id uuid NOT NULL REFERENCES public.ferr_supplies(id),
  movement_type text NOT NULL CHECK (movement_type IN ('entrada','saida')),
  quantity numeric NOT NULL,
  notes text,
  performed_by uuid NOT NULL,
  company_id uuid REFERENCES public.ferr_companies(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.ferr_is_admin(check_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.ferr_user_roles WHERE user_id = check_user_id AND role = 'admin')
$$;

CREATE OR REPLACE FUNCTION public.ferr_is_almoxarifado(check_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.ferr_user_roles WHERE user_id = check_user_id AND role = 'almoxarifado')
$$;

CREATE OR REPLACE FUNCTION public.ferr_get_user_company_id(check_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT company_id FROM public.ferr_profiles WHERE id = check_user_id
$$;

CREATE OR REPLACE FUNCTION public.ferr_update_supply_stock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.movement_type = 'entrada' THEN
    UPDATE public.ferr_supplies SET current_stock = current_stock + NEW.quantity WHERE id = NEW.supply_id;
  ELSE
    UPDATE public.ferr_supplies SET current_stock = current_stock - NEW.quantity WHERE id = NEW.supply_id;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER ferr_update_stock_on_movement
AFTER INSERT ON public.ferr_supply_movements
FOR EACH ROW EXECUTE FUNCTION public.ferr_update_supply_stock();

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'ferr_companies','ferr_warehouses','ferr_profiles','ferr_user_roles','ferr_kits','ferr_tools',
    'ferr_kit_tools','ferr_loans','ferr_loan_renewals','ferr_loan_requests','ferr_loan_request_items',
    'ferr_notifications','ferr_user_warehouses','ferr_role_permissions','ferr_return_issues',
    'ferr_supply_groups','ferr_supplies','ferr_supply_movements']
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "ferr_select_auth" ON public.%I FOR SELECT TO authenticated USING (true)', t);
  END LOOP;

  FOREACH t IN ARRAY ARRAY[
    'ferr_warehouses','ferr_profiles','ferr_kits','ferr_tools','ferr_kit_tools','ferr_loans',
    'ferr_loan_renewals','ferr_loan_requests','ferr_loan_request_items','ferr_notifications',
    'ferr_user_warehouses','ferr_return_issues','ferr_supply_groups','ferr_supplies','ferr_supply_movements']
  LOOP
    EXECUTE format('CREATE POLICY "ferr_write_auth" ON public.%I FOR INSERT TO authenticated WITH CHECK (true)', t);
    EXECUTE format('CREATE POLICY "ferr_update_auth" ON public.%I FOR UPDATE TO authenticated USING (true) WITH CHECK (true)', t);
    EXECUTE format('CREATE POLICY "ferr_delete_staff" ON public.%I FOR DELETE TO authenticated USING (public.ferr_is_admin(auth.uid()) OR public.ferr_is_almoxarifado(auth.uid()))', t);
  END LOOP;
END $$;

CREATE POLICY "ferr_roles_admin" ON public.ferr_user_roles FOR ALL TO authenticated
  USING (public.ferr_is_admin(auth.uid())) WITH CHECK (public.ferr_is_admin(auth.uid()));
CREATE POLICY "ferr_perms_admin" ON public.ferr_role_permissions FOR ALL TO authenticated
  USING (public.ferr_is_admin(auth.uid())) WITH CHECK (public.ferr_is_admin(auth.uid()));
CREATE POLICY "ferr_companies_admin" ON public.ferr_companies FOR ALL TO authenticated
  USING (public.ferr_is_admin(auth.uid())) WITH CHECK (public.ferr_is_admin(auth.uid()));

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'ferr_companies','ferr_warehouses','ferr_profiles','ferr_kits','ferr_tools','ferr_loans',
    'ferr_loan_requests','ferr_role_permissions','ferr_return_issues','ferr_supply_groups','ferr_supplies']
  LOOP
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t||'_updated_at', t);
  END LOOP;
END $$;

INSERT INTO public.ferr_role_permissions (role, route, can_access) VALUES
('admin','/tools',true),('admin','/users',true),('admin','/warehouses',true),('admin','/kits',true),
('admin','/notifications',true),('admin','/reports',true),('admin','/settings',true),('admin','/tracking',true),
('admin','/request-tools',true),('admin','/process-requests',true),('admin','/loan/return',true),
('admin','/loan/renewals',true),('admin','/loan/relend',true),('admin','/return-issues',true),
('admin','/tool-assistant',true),('admin','/supplies',true),
('almoxarifado','/tools',true),('almoxarifado','/kits',true),('almoxarifado','/warehouses',true),
('almoxarifado','/notifications',true),('almoxarifado','/reports',true),('almoxarifado','/settings',true),
('almoxarifado','/request-tools',true),('almoxarifado','/process-requests',true),('almoxarifado','/loan/return',true),
('almoxarifado','/loan/renewals',true),('almoxarifado','/loan/relend',true),('almoxarifado','/return-issues',true),
('almoxarifado','/tool-assistant',true),('almoxarifado','/supplies',true),('almoxarifado','/tracking',true),
('usuario','/request-tools',true),('usuario','/notifications',true),('usuario','/settings',true),
('usuario','/loan/renewals',true),('usuario','/tool-assistant',true)
ON CONFLICT (role, route) DO NOTHING;
