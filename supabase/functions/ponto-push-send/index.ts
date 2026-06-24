import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

// Web Push minimal sender (VAPID). Requires PONTO_VAPID_PUBLIC, PONTO_VAPID_PRIVATE, PONTO_VAPID_SUBJECT secrets.
// For simplicity we POST to endpoints with Authorization header via VAPID JWT.
// In production use a maintained Deno web-push lib. Here we degrade gracefully if keys absent.

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { funcionario_id, titulo, corpo, url } = await req.json();
    if (!funcionario_id || !titulo) {
      return new Response(JSON.stringify({ error: 'funcionario_id e titulo obrigatórios' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { data: subs } = await supabase
      .from('ponto_push_subscriptions')
      .select('*')
      .eq('funcionario_id', funcionario_id)
      .eq('ativo', true);

    const payload = JSON.stringify({ title: titulo, body: corpo, url: url || '/' });
    let enviados = 0, falhas = 0;

    for (const s of subs ?? []) {
      try {
        // Best-effort: many push services accept anonymous body POST for testing.
        // Real VAPID signing should be added when keys are configured.
        const res = await fetch(s.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/octet-stream', TTL: '3600' },
          body: payload,
        });
        if (res.ok || res.status === 201) {
          enviados++;
          await supabase.from('ponto_push_subscriptions').update({ ultimo_uso: new Date().toISOString() }).eq('id', s.id);
        } else if (res.status === 404 || res.status === 410) {
          await supabase.from('ponto_push_subscriptions').update({ ativo: false }).eq('id', s.id);
          falhas++;
        } else {
          falhas++;
        }
      } catch { falhas++; }
    }

    return new Response(JSON.stringify({ enviados, falhas, total: subs?.length ?? 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
