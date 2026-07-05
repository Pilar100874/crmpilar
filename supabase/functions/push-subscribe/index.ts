import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const body = await req.json();
    const { endpoint, p256dh, auth, usuario_id, contato_id, plataforma, user_agent } = body || {};
    if (!endpoint || !p256dh || !auth) {
      return new Response(JSON.stringify({ error: 'Campos obrigatórios ausentes' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data, error } = await supabase
      .from('push_subscriptions')
      .upsert({
        endpoint,
        p256dh,
        auth,
        usuario_id: usuario_id || null,
        contato_id: contato_id || null,
        plataforma: plataforma || 'web',
        user_agent: user_agent || null,
        ativo: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'endpoint' })
      .select()
      .single();

    if (error) throw error;
    return new Response(JSON.stringify({ ok: true, id: data.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
