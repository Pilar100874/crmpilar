-- Fallback policy to ensure admin email pattern works during INSERT
create policy "Insert funis (admin email fallback)"
on public.funis for insert
to authenticated
with check (
  current_setting('request.jwt.claim.email', true) ilike 'admin_%@sistema.local'
);
