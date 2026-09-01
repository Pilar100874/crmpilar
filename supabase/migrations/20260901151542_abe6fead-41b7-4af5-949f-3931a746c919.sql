CREATE TABLE public.port_interfone_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_id uuid UNIQUE,
  ativo boolean NOT NULL DEFAULT true,
  auto_popup boolean NOT NULL DEFAULT true,
  som boolean NOT NULL DEFAULT true,
  device_id uuid,
  cameras_extras uuid[] NOT NULL DEFAULT '{}',
  sip_uri text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.port_interfone_config TO authenticated;
GRANT ALL ON public.port_interfone_config TO service_role;
ALTER TABLE public.port_interfone_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados gerenciam config do interfone"
  ON public.port_interfone_config FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE TABLE public.port_campainha_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_id uuid,
  device_id uuid,
  origem text NOT NULL DEFAULT 'idface',
  status text NOT NULL DEFAULT 'pendente',
  atendido_por uuid,
  atendido_em timestamptz,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.port_campainha_eventos TO authenticated;
GRANT ALL ON public.port_campainha_eventos TO service_role;
ALTER TABLE public.port_campainha_eventos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados gerenciam toques de campainha"
  ON public.port_campainha_eventos FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE INDEX idx_port_campainha_recentes ON public.port_campainha_eventos (created_at DESC);

CREATE OR REPLACE FUNCTION public.port_interfone_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_port_interfone_config_updated
BEFORE UPDATE ON public.port_interfone_config
FOR EACH ROW EXECUTE FUNCTION public.port_interfone_touch_updated_at();

ALTER TABLE public.port_campainha_eventos REPLICA IDENTITY FULL;
ALTER TABLE public.port_interfone_config REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.port_campainha_eventos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.port_interfone_config;