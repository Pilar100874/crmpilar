CREATE TABLE public.broadcast_monitor (
  id uuid primary key default gen_random_uuid(),
  estabelecimento_id uuid not null,
  automation_id uuid,
  bot_flow_id uuid,
  origem text,
  status text not null default 'executando',
  total integer not null default 0,
  enviados integer not null default 0,
  falhas integer not null default 0,
  invalidos integer not null default 0,
  pulados integer not null default 0,
  atual integer not null default 0,
  atual_nome text,
  atual_telefone text,
  mensagem_base text,
  erro text,
  iniciado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  finalizado_em timestamptz
);

CREATE TABLE public.broadcast_monitor_itens (
  id uuid primary key default gen_random_uuid(),
  monitor_id uuid not null references public.broadcast_monitor(id) on delete cascade,
  estabelecimento_id uuid not null,
  ordem integer not null default 0,
  nome text,
  telefone text,
  tipo text,
  status text not null default 'enviando',
  mensagem text,
  motivo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE INDEX idx_broadcast_monitor_estab ON public.broadcast_monitor (estabelecimento_id, iniciado_em DESC);
CREATE INDEX idx_broadcast_monitor_automation ON public.broadcast_monitor (automation_id, iniciado_em DESC);
CREATE INDEX idx_broadcast_monitor_itens_monitor ON public.broadcast_monitor_itens (monitor_id, ordem);

GRANT SELECT ON public.broadcast_monitor TO authenticated;
GRANT ALL ON public.broadcast_monitor TO service_role;
GRANT SELECT ON public.broadcast_monitor_itens TO authenticated;
GRANT ALL ON public.broadcast_monitor_itens TO service_role;

ALTER TABLE public.broadcast_monitor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_monitor_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "broadcast_monitor_select_tenant" ON public.broadcast_monitor
  FOR SELECT TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE POLICY "broadcast_monitor_itens_select_tenant" ON public.broadcast_monitor_itens
  FOR SELECT TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());

ALTER TABLE public.broadcast_monitor REPLICA IDENTITY FULL;
ALTER TABLE public.broadcast_monitor_itens REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.broadcast_monitor;
ALTER PUBLICATION supabase_realtime ADD TABLE public.broadcast_monitor_itens;