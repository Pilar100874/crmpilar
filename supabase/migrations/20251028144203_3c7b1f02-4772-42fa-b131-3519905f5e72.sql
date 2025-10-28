-- DESENVOLVIMENTO: Policies simplificadas - qualquer usuário autenticado pode fazer tudo
-- TODO: Restaurar policies restritivas em produção

-- produto_grupos
drop policy if exists "Manage grupos (same estab or no-roles)" on public.produto_grupos;
drop policy if exists "Manage grupos (admin/gestor or admin)" on public.produto_grupos;
drop policy if exists "View grupos (same estab or admin)" on public.produto_grupos;

create policy "DEV: Allow all for authenticated" on public.produto_grupos
for all
to authenticated
using (true)
with check (true);

-- produto_categorias
drop policy if exists "Manage categorias (same estab or no-roles)" on public.produto_categorias;
drop policy if exists "Manage categorias (admin/gestor or admin)" on public.produto_categorias;
drop policy if exists "View categorias (same estab or admin)" on public.produto_categorias;

create policy "DEV: Allow all for authenticated" on public.produto_categorias
for all
to authenticated
using (true)
with check (true);

-- produtos
drop policy if exists "Manage produtos (same estab or no-roles)" on public.produtos;
drop policy if exists "Manage produtos (admin/gestor or admin)" on public.produtos;
drop policy if exists "View produtos (same estab or admin)" on public.produtos;

create policy "DEV: Allow all for authenticated" on public.produtos
for all
to authenticated
using (true)
with check (true);

-- condicoes_pagamento
drop policy if exists "Manage condicoes (same estab or no-roles)" on public.condicoes_pagamento;
drop policy if exists "Manage condicoes pagamento (admin/gestor or admin)" on public.condicoes_pagamento;
drop policy if exists "View condicoes pagamento (same estab or admin)" on public.condicoes_pagamento;

create policy "DEV: Allow all for authenticated" on public.condicoes_pagamento
for all
to authenticated
using (true)
with check (true);

-- tabelas_preco
drop policy if exists "Manage tabelas_preco (same estab or no-roles)" on public.tabelas_preco;
drop policy if exists "Manage tabelas_preco (same estab admin/gestor or admin)" on public.tabelas_preco;
drop policy if exists "View tabelas_preco (same estab or admin)" on public.tabelas_preco;

create policy "DEV: Allow all for authenticated" on public.tabelas_preco
for all
to authenticated
using (true)
with check (true);