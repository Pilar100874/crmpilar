create or replace function public.port_credenciais_resumo()
returns table (device_id uuid, tem_usuario boolean, tem_senha boolean, tem_token boolean, updated_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select c.device_id,
         c.usuario is not null and c.usuario <> '',
         c.senha is not null and c.senha <> '',
         c.token is not null and c.token <> '',
         c.updated_at
  from public.port_device_credentials c
  where public.port_is_gestor(auth.uid())
$$;

revoke all on function public.port_credenciais_resumo() from public, anon;
grant execute on function public.port_credenciais_resumo() to authenticated;