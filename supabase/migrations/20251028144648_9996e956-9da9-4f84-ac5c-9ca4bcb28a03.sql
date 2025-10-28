-- Criar tabela de tipos de pagamento
create table if not exists public.tipos_pagamento (
  id uuid primary key default gen_random_uuid(),
  estabelecimento_id uuid references public.estabelecimentos(id) on delete cascade,
  nome text not null,
  taxa_percentual numeric not null default 0,
  ativo boolean not null default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.tipos_pagamento enable row level security;

-- Policy simplificada para desenvolvimento
create policy "DEV: Allow all for authenticated" on public.tipos_pagamento
for all
to authenticated
using (true)
with check (true);

-- Trigger para updated_at
create trigger set_tipos_pagamento_updated_at
before update on public.tipos_pagamento
for each row execute function public.update_updated_at_column();