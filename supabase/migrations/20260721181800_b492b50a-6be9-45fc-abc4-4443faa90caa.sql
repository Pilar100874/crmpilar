
-- ============ TV SIGNAGE PLATFORM ============

-- Grupos
CREATE TABLE public.tv_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id UUID NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  local TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tv_groups TO authenticated;
GRANT ALL ON public.tv_groups TO service_role;
ALTER TABLE public.tv_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tv_groups_tenant_all" ON public.tv_groups FOR ALL TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id())
  WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id());

-- Dashboards (telas)
CREATE TABLE public.tv_dashboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id UUID NOT NULL,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'url_externa' CHECK (tipo IN ('url_externa','tela_interna')),
  url TEXT,
  rota_interna TEXT,
  refresh_segundos INT NOT NULL DEFAULT 60,
  fullscreen BOOLEAN NOT NULL DEFAULT true,
  cache_offline BOOLEAN NOT NULL DEFAULT false,
  auto_update BOOLEAN NOT NULL DEFAULT true,
  timeout_segundos INT NOT NULL DEFAULT 30,
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tv_dashboards TO authenticated;
GRANT ALL ON public.tv_dashboards TO service_role;
ALTER TABLE public.tv_dashboards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tv_dashboards_tenant_all" ON public.tv_dashboards FOR ALL TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id())
  WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id());

-- Playlists
CREATE TABLE public.tv_playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id UUID NOT NULL,
  nome TEXT NOT NULL,
  loop BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tv_playlists TO authenticated;
GRANT ALL ON public.tv_playlists TO service_role;
ALTER TABLE public.tv_playlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tv_playlists_tenant_all" ON public.tv_playlists FOR ALL TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id())
  WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE TABLE public.tv_playlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID NOT NULL REFERENCES public.tv_playlists(id) ON DELETE CASCADE,
  dashboard_id UUID NOT NULL REFERENCES public.tv_dashboards(id) ON DELETE CASCADE,
  ordem INT NOT NULL DEFAULT 0,
  duracao_segundos INT NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tv_playlist_items TO authenticated;
GRANT ALL ON public.tv_playlist_items TO service_role;
ALTER TABLE public.tv_playlist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tv_playlist_items_tenant_all" ON public.tv_playlist_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tv_playlists p WHERE p.id = playlist_id AND p.estabelecimento_id = public.get_auth_user_estabelecimento_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tv_playlists p WHERE p.id = playlist_id AND p.estabelecimento_id = public.get_auth_user_estabelecimento_id()));

-- Devices
CREATE TABLE public.tv_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id UUID NOT NULL,
  codigo TEXT NOT NULL UNIQUE,
  token_hash TEXT NOT NULL,
  nome TEXT NOT NULL,
  local TEXT,
  grupo_id UUID REFERENCES public.tv_groups(id) ON DELETE SET NULL,
  dashboard_atual_id UUID REFERENCES public.tv_dashboards(id) ON DELETE SET NULL,
  playlist_id UUID REFERENCES public.tv_playlists(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online','offline','erro','bloqueado')),
  bloqueado BOOLEAN NOT NULL DEFAULT false,
  versao_app TEXT,
  versao_min_requerida TEXT,
  resolucao TEXT,
  ip TEXT,
  memoria_uso NUMERIC,
  cpu_uso NUMERIC,
  armazenamento NUMERIC,
  uptime_segundos BIGINT,
  tema TEXT DEFAULT 'dark',
  idioma TEXT DEFAULT 'pt-BR',
  ultima_comunicacao TIMESTAMPTZ,
  emparelhado_em TIMESTAMPTZ,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX tv_devices_estab_idx ON public.tv_devices(estabelecimento_id);
CREATE INDEX tv_devices_status_idx ON public.tv_devices(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tv_devices TO authenticated;
GRANT ALL ON public.tv_devices TO service_role;
ALTER TABLE public.tv_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tv_devices_tenant_all" ON public.tv_devices FOR ALL TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id())
  WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id());

-- Commands
CREATE TABLE public.tv_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES public.tv_devices(id) ON DELETE CASCADE,
  estabelecimento_id UUID NOT NULL,
  tipo TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','enviado','confirmado','erro')),
  criado_por UUID,
  confirmado_em TIMESTAMPTZ,
  resultado JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX tv_commands_device_status_idx ON public.tv_commands(device_id, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tv_commands TO authenticated;
GRANT ALL ON public.tv_commands TO service_role;
ALTER TABLE public.tv_commands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tv_commands_tenant_all" ON public.tv_commands FOR ALL TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id())
  WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id());

-- Events
CREATE TABLE public.tv_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES public.tv_devices(id) ON DELETE CASCADE,
  estabelecimento_id UUID NOT NULL,
  nivel TEXT NOT NULL DEFAULT 'info',
  tipo TEXT,
  mensagem TEXT,
  contexto JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX tv_events_device_idx ON public.tv_events(device_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tv_events TO authenticated;
GRANT ALL ON public.tv_events TO service_role;
ALTER TABLE public.tv_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tv_events_tenant_all" ON public.tv_events FOR ALL TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id())
  WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id());

-- Heartbeats
CREATE TABLE public.tv_heartbeats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES public.tv_devices(id) ON DELETE CASCADE,
  estabelecimento_id UUID NOT NULL,
  memoria_uso NUMERIC,
  cpu_uso NUMERIC,
  armazenamento NUMERIC,
  uptime_segundos BIGINT,
  ip TEXT,
  resolucao TEXT,
  versao_app TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX tv_heartbeats_device_idx ON public.tv_heartbeats(device_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tv_heartbeats TO authenticated;
GRANT ALL ON public.tv_heartbeats TO service_role;
ALTER TABLE public.tv_heartbeats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tv_heartbeats_tenant_all" ON public.tv_heartbeats FOR ALL TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id())
  WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id());

-- Triggers updated_at
CREATE TRIGGER trg_tv_groups_upd BEFORE UPDATE ON public.tv_groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_tv_dashboards_upd BEFORE UPDATE ON public.tv_dashboards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_tv_playlists_upd BEFORE UPDATE ON public.tv_playlists FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_tv_devices_upd BEFORE UPDATE ON public.tv_devices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_tv_commands_upd BEFORE UPDATE ON public.tv_commands FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.tv_devices;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tv_commands;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tv_dashboards;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tv_playlists;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tv_playlist_items;
