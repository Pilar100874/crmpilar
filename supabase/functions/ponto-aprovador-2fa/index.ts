import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

// 2FA para aprovadores. POST { action: 'gerar'|'validar', codigo?, contexto? }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const auth = req.headers.get('authorization') ?? '';
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'auth' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const body = await req.json();

    if (body.action === 'gerar') {
      const codigo = String(Math.floor(100000 + Math.random() * 900000));
      const expira = new Date(Date.now() + 10 * 60_000).toISOString();
      await supabase.from('ponto_aprovador_2fa').insert({
        usuario_id: user.id, codigo, expira_em: expira, contexto: body.contexto ?? 'aprovacao',
      });
      // TODO: enviar por email/sms. Por ora retorna no payload para integração.
      return new Response(JSON.stringify({ ok: true, codigo, expira_em: expira }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (body.action === 'validar') {
      const { data: row } = await supabase
        .from('ponto_aprovador_2fa')
        .select('*')
        .eq('usuario_id', user.id)
        .is('validado_em', null)
        .gt('expira_em', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!row) return new Response(JSON.stringify({ ok: false, motivo: 'sem_codigo' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      if (row.tentativas >= 5) return new Response(JSON.stringify({ ok: false, motivo: 'bloqueado' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      if (String(body.codigo) !== row.codigo) {
        await supabase.from('ponto_aprovador_2fa').update({ tentativas: row.tentativas + 1 }).eq('id', row.id);
        return new Response(JSON.stringify({ ok: false, motivo: 'incorreto' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
      await supabase.from('ponto_aprovador_2fa').update({
        validado_em: new Date().toISOString(), ip, user_agent: req.headers.get('user-agent') || null,
      }).eq('id', row.id);
      return new Response(JSON.stringify({ ok: true, valido_por_minutos: 30 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'action invalido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
