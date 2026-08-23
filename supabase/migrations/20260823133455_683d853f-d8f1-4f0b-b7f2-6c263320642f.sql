
DO $$ BEGIN
  CREATE TYPE public.port_role AS ENUM ('super_admin','admin','porteiro','morador');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ROLES
CREATE TABLE public.port_user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.port_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.port_user_roles TO authenticated;
GRANT ALL ON public.port_user_roles TO service_role;
ALTER TABLE public.port_user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.port_has_role(_user_id uuid, _role public.port_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.port_user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.port_is_gestor(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.port_user_roles WHERE user_id = _user_id AND role IN ('super_admin','admin'))
$$;

CREATE OR REPLACE FUNCTION public.port_is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.port_user_roles WHERE user_id = _user_id AND role IN ('super_admin','admin','porteiro'))
$$;

CREATE POLICY "port_roles_select_self_or_staff" ON public.port_user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.port_is_staff(auth.uid()));
CREATE POLICY "port_roles_manage_super" ON public.port_user_roles FOR ALL TO authenticated
  USING (public.port_has_role(auth.uid(),'super_admin')) WITH CHECK (public.port_has_role(auth.uid(),'super_admin'));

-- updated_at helper
CREATE OR REPLACE FUNCTION public.port_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- DEVICES
CREATE TABLE public.port_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  tipo text NOT NULL DEFAULT 'shelly',
  modelo text,
  localizacao text,
  ip text,
  porta integer,
  device_id text,
  endpoint text,
  canal_rele integer NOT NULL DEFAULT 0,
  pulso_ms integer NOT NULL DEFAULT 1000,
  firmware text,
  habilitado boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'desconhecido',
  ultima_comunicacao timestamptz,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.port_devices TO authenticated;
GRANT ALL ON public.port_devices TO service_role;
ALTER TABLE public.port_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "port_devices_select_staff" ON public.port_devices FOR SELECT TO authenticated
  USING (public.port_is_staff(auth.uid()));
CREATE POLICY "port_devices_manage_gestor" ON public.port_devices FOR ALL TO authenticated
  USING (public.port_is_gestor(auth.uid())) WITH CHECK (public.port_is_gestor(auth.uid()));
CREATE TRIGGER port_devices_touch BEFORE UPDATE ON public.port_devices
  FOR EACH ROW EXECUTE FUNCTION public.port_touch_updated_at();

-- DEVICE CREDENTIALS (backend only)
CREATE TABLE public.port_device_credentials (
  device_id uuid PRIMARY KEY REFERENCES public.port_devices(id) ON DELETE CASCADE,
  usuario text,
  senha text,
  token text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.port_device_credentials TO service_role;
ALTER TABLE public.port_device_credentials ENABLE ROW LEVEL SECURITY;

-- ACCESS POINTS
CREATE TABLE public.port_access_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  tipo text NOT NULL DEFAULT 'portao',
  device_id uuid REFERENCES public.port_devices(id) ON DELETE SET NULL,
  acao text,
  confirmar_abertura boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.port_access_points TO authenticated;
GRANT ALL ON public.port_access_points TO service_role;
ALTER TABLE public.port_access_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "port_ap_select_auth" ON public.port_access_points FOR SELECT TO authenticated USING (true);
CREATE POLICY "port_ap_manage_gestor" ON public.port_access_points FOR ALL TO authenticated
  USING (public.port_is_gestor(auth.uid())) WITH CHECK (public.port_is_gestor(auth.uid()));
CREATE TRIGGER port_ap_touch BEFORE UPDATE ON public.port_access_points
  FOR EACH ROW EXECUTE FUNCTION public.port_touch_updated_at();

-- PEOPLE
CREATE TABLE public.port_people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid,
  nome text NOT NULL,
  foto_url text,
  email text,
  telefone text,
  documento text,
  unidade text,
  tipo text NOT NULL DEFAULT 'morador',
  ativo boolean NOT NULL DEFAULT true,
  valido_de date,
  valido_ate date,
  dias_semana integer[] NOT NULL DEFAULT '{0,1,2,3,4,5,6}',
  hora_inicio time,
  hora_fim time,
  permitir_remoto boolean NOT NULL DEFAULT true,
  permitir_facial boolean NOT NULL DEFAULT false,
  face_status text NOT NULL DEFAULT 'pendente',
  controlid_user_id text,
  sync_erro text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.port_people TO authenticated;
GRANT ALL ON public.port_people TO service_role;
ALTER TABLE public.port_people ENABLE ROW LEVEL SECURITY;
CREATE POLICY "port_people_select" ON public.port_people FOR SELECT TO authenticated
  USING (public.port_is_staff(auth.uid()) OR auth_user_id = auth.uid());
CREATE POLICY "port_people_manage_gestor" ON public.port_people FOR ALL TO authenticated
  USING (public.port_is_gestor(auth.uid())) WITH CHECK (public.port_is_gestor(auth.uid()));
CREATE TRIGGER port_people_touch BEFORE UPDATE ON public.port_people
  FOR EACH ROW EXECUTE FUNCTION public.port_touch_updated_at();

-- PERMISSIONS
CREATE TABLE public.port_person_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES public.port_people(id) ON DELETE CASCADE,
  access_point_id uuid NOT NULL REFERENCES public.port_access_points(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (person_id, access_point_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.port_person_permissions TO authenticated;
GRANT ALL ON public.port_person_permissions TO service_role;
ALTER TABLE public.port_person_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "port_perm_select" ON public.port_person_permissions FOR SELECT TO authenticated
  USING (public.port_is_staff(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.port_people p WHERE p.id = person_id AND p.auth_user_id = auth.uid()));
CREATE POLICY "port_perm_manage_gestor" ON public.port_person_permissions FOR ALL TO authenticated
  USING (public.port_is_gestor(auth.uid())) WITH CHECK (public.port_is_gestor(auth.uid()));

-- VISITORS
CREATE TABLE public.port_visitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  foto_url text,
  telefone text,
  documento text,
  visitado_person_id uuid REFERENCES public.port_people(id) ON DELETE SET NULL,
  unidade text,
  inicio timestamptz NOT NULL DEFAULT now(),
  fim timestamptz,
  hora_inicio time,
  hora_fim time,
  access_point_id uuid REFERENCES public.port_access_points(id) ON DELETE SET NULL,
  tipo_autorizacao text NOT NULL DEFAULT 'unico',
  codigo text,
  status text NOT NULL DEFAULT 'ativo',
  face_status text NOT NULL DEFAULT 'nao_aplicavel',
  controlid_user_id text,
  observacoes text,
  criado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.port_visitors TO authenticated;
GRANT ALL ON public.port_visitors TO service_role;
ALTER TABLE public.port_visitors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "port_visitors_select" ON public.port_visitors FOR SELECT TO authenticated
  USING (public.port_is_staff(auth.uid()) OR criado_por = auth.uid() OR EXISTS (
    SELECT 1 FROM public.port_people p WHERE p.id = visitado_person_id AND p.auth_user_id = auth.uid()));
CREATE POLICY "port_visitors_insert" ON public.port_visitors FOR INSERT TO authenticated
  WITH CHECK (public.port_is_staff(auth.uid()) OR criado_por = auth.uid());
CREATE POLICY "port_visitors_update_staff" ON public.port_visitors FOR UPDATE TO authenticated
  USING (public.port_is_staff(auth.uid())) WITH CHECK (public.port_is_staff(auth.uid()));
CREATE POLICY "port_visitors_delete_gestor" ON public.port_visitors FOR DELETE TO authenticated
  USING (public.port_is_gestor(auth.uid()));
CREATE TRIGGER port_visitors_touch BEFORE UPDATE ON public.port_visitors
  FOR EACH ROW EXECUTE FUNCTION public.port_touch_updated_at();

-- ACCESS EVENTS (immutable)
CREATE TABLE public.port_access_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL,
  person_id uuid REFERENCES public.port_people(id) ON DELETE SET NULL,
  visitor_id uuid REFERENCES public.port_visitors(id) ON DELETE SET NULL,
  auth_user_id uuid,
  device_id uuid REFERENCES public.port_devices(id) ON DELETE SET NULL,
  access_point_id uuid REFERENCES public.port_access_points(id) ON DELETE SET NULL,
  resultado text NOT NULL DEFAULT 'sucesso',
  origem text,
  ip_origem text,
  mensagem text,
  detalhes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.port_access_events TO authenticated;
GRANT ALL ON public.port_access_events TO service_role;
ALTER TABLE public.port_access_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "port_events_select" ON public.port_access_events FOR SELECT TO authenticated
  USING (public.port_is_staff(auth.uid()) OR auth_user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.port_people p WHERE p.id = person_id AND p.auth_user_id = auth.uid()));
CREATE INDEX port_events_created_idx ON public.port_access_events (created_at DESC);

-- REMOTE COMMANDS
CREATE TABLE public.port_remote_commands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  access_point_id uuid REFERENCES public.port_access_points(id) ON DELETE SET NULL,
  device_id uuid REFERENCES public.port_devices(id) ON DELETE SET NULL,
  solicitado_por uuid,
  comando text NOT NULL DEFAULT 'abrir',
  resultado text NOT NULL DEFAULT 'sucesso',
  latencia_ms integer,
  erro text,
  ip_origem text,
  nonce text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.port_remote_commands TO authenticated;
GRANT ALL ON public.port_remote_commands TO service_role;
ALTER TABLE public.port_remote_commands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "port_cmds_select" ON public.port_remote_commands FOR SELECT TO authenticated
  USING (public.port_is_staff(auth.uid()) OR solicitado_por = auth.uid());
CREATE INDEX port_cmds_created_idx ON public.port_remote_commands (created_at DESC);
CREATE UNIQUE INDEX port_cmds_nonce_idx ON public.port_remote_commands (nonce) WHERE nonce IS NOT NULL;

-- SETTINGS
CREATE TABLE public.port_settings (
  chave text PRIMARY KEY,
  valor jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.port_settings TO authenticated;
GRANT ALL ON public.port_settings TO service_role;
ALTER TABLE public.port_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "port_settings_select_auth" ON public.port_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "port_settings_manage_gestor" ON public.port_settings FOR ALL TO authenticated
  USING (public.port_is_gestor(auth.uid())) WITH CHECK (public.port_is_gestor(auth.uid()));
CREATE TRIGGER port_settings_touch BEFORE UPDATE ON public.port_settings
  FOR EACH ROW EXECUTE FUNCTION public.port_touch_updated_at();
