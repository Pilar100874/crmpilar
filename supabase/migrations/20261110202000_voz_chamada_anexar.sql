create or replace function public.voz_chamada_anexar(p_id uuid, p_campo text, p_item jsonb)
returns void language sql security definer set search_path = public as $$
  update public.voz_chamadas set
    transcricao = case when p_campo = 'transcricao' then coalesce(transcricao, '[]'::jsonb) || jsonb_build_array(p_item) else transcricao end,
    sugestoes = case when p_campo = 'sugestoes' then coalesce(sugestoes, '[]'::jsonb) || jsonb_build_array(p_item) else sugestoes end
  where id = p_id;
$$;
revoke all on function public.voz_chamada_anexar(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.voz_chamada_anexar(uuid, text, jsonb) to service_role;
