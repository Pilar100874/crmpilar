-- Fix policies to allow same-establishment authenticated users to manage records

-- produto_categorias
drop policy if exists "Manage categorias (same estab user)" on public.produto_categorias;
create policy "Manage categorias (same estab user)" on public.produto_categorias
for all
to authenticated
using (estabelecimento_id = get_user_estabelecimento_id(auth.uid()))
with check (estabelecimento_id = get_user_estabelecimento_id(auth.uid()));

-- produto_grupos
drop policy if exists "Manage grupos (same estab user)" on public.produto_grupos;
create policy "Manage grupos (same estab user)" on public.produto_grupos
for all
to authenticated
using (estabelecimento_id = get_user_estabelecimento_id(auth.uid()))
with check (estabelecimento_id = get_user_estabelecimento_id(auth.uid()));

-- produtos
drop policy if exists "Manage produtos (same estab user)" on public.produtos;
create policy "Manage produtos (same estab user)" on public.produtos
for all
to authenticated
using (estabelecimento_id = get_user_estabelecimento_id(auth.uid()))
with check (estabelecimento_id = get_user_estabelecimento_id(auth.uid()));

-- condicoes_pagamento
drop policy if exists "Manage condicoes (same estab user)" on public.condicoes_pagamento;
create policy "Manage condicoes (same estab user)" on public.condicoes_pagamento
for all
to authenticated
using (estabelecimento_id = get_user_estabelecimento_id(auth.uid()))
with check (estabelecimento_id = get_user_estabelecimento_id(auth.uid()));

-- tabelas_preco
drop policy if exists "Manage tabelas_preco (same estab user)" on public.tabelas_preco;
create policy "Manage tabelas_preco (same estab user)" on public.tabelas_preco
for all
to authenticated
using (estabelecimento_id = get_user_estabelecimento_id(auth.uid()))
with check (estabelecimento_id = get_user_estabelecimento_id(auth.uid()));

drop policy if exists "View tabelas_preco (same estab or admin)" on public.tabelas_preco;
create policy "View tabelas_preco (same estab or admin)" on public.tabelas_preco
for select
to authenticated
using (
  (estabelecimento_id = get_user_estabelecimento_id(auth.uid()))
  or (exists (select 1 from public.administradores where administradores.id = auth.uid()))
);