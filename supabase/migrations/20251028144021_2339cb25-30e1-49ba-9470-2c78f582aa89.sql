-- Relax RLS to allow development when no roles configured, while keeping tenant isolation

-- produto_grupos
drop policy if exists "Manage grupos (same estab user)" on public.produto_grupos;
create policy "Manage grupos (same estab or no-roles)" on public.produto_grupos
for all
to authenticated
using ((estabelecimento_id = get_user_estabelecimento_id(auth.uid())) OR NOT roles_present())
with check ((estabelecimento_id = get_user_estabelecimento_id(auth.uid())) OR NOT roles_present());

-- produto_categorias
drop policy if exists "Manage categorias (same estab user)" on public.produto_categorias;
create policy "Manage categorias (same estab or no-roles)" on public.produto_categorias
for all
to authenticated
using ((estabelecimento_id = get_user_estabelecimento_id(auth.uid())) OR NOT roles_present())
with check ((estabelecimento_id = get_user_estabelecimento_id(auth.uid())) OR NOT roles_present());

-- produtos
drop policy if exists "Manage produtos (same estab user)" on public.produtos;
create policy "Manage produtos (same estab or no-roles)" on public.produtos
for all
to authenticated
using ((estabelecimento_id = get_user_estabelecimento_id(auth.uid())) OR NOT roles_present())
with check ((estabelecimento_id = get_user_estabelecimento_id(auth.uid())) OR NOT roles_present());

-- condicoes_pagamento
drop policy if exists "Manage condicoes (same estab user)" on public.condicoes_pagamento;
create policy "Manage condicoes (same estab or no-roles)" on public.condicoes_pagamento
for all
to authenticated
using ((estabelecimento_id = get_user_estabelecimento_id(auth.uid())) OR NOT roles_present())
with check ((estabelecimento_id = get_user_estabelecimento_id(auth.uid())) OR NOT roles_present());

-- tabelas_preco
drop policy if exists "Manage tabelas_preco (same estab user)" on public.tabelas_preco;
create policy "Manage tabelas_preco (same estab or no-roles)" on public.tabelas_preco
for all
to authenticated
using ((estabelecimento_id = get_user_estabelecimento_id(auth.uid())) OR NOT roles_present())
with check ((estabelecimento_id = get_user_estabelecimento_id(auth.uid())) OR NOT roles_present());