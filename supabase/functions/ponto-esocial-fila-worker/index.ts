import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

// Cron a cada 5 min: processa fila eSocial com backoff exponencial.
// Tentativa N => espera 2^N minutos (1, 2, 4, 8, 16). Após max_tentativas => DLQ.

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: batch } = await supabase
      .from('ponto_esocial_fila')
      .select('*')
      .in('status', ['pendente', 'falha'])
      .lte('proxima_tentativa', new Date().toISOString())
      .order('proxima_tentativa', { ascending: true })
      .limit(20);

    let ok = 0, falhas = 0, dlq = 0;

    for (const item of batch ?? []) {
      await supabase.from('ponto_esocial_fila').update({ status: 'processando', updated_at: new Date().toISOString() }).eq('id', item.id);

      try {
        // Chamada à função existente de transmissão
        const res = await supabase.functions.invoke('ponto-esocial-transmitir', {
          body: { evento_id: item.evento_id, payload: item.payload, tipo: item.tipo_evento },
        });

        if (res.error) throw new Error(res.error.message);
        await supabase.from('ponto_esocial_fila').update({
          status: 'sucesso', processado_em: new Date().toISOString(), updated_at: new Date().toISOString(),
        }).eq('id', item.id);
        ok++;
      } catch (e) {
        const novasTentativas = item.tentativas + 1;
        if (novasTentativas >= item.max_tentativas) {
          await supabase.from('ponto_esocial_fila').update({
            status: 'dlq', tentativas: novasTentativas,
            ultimo_erro: String(e), movido_dlq_em: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }).eq('id', item.id);
          dlq++;
        } else {
          const backoffMin = Math.pow(2, novasTentativas);
          await supabase.from('ponto_esocial_fila').update({
            status: 'falha', tentativas: novasTentativas,
            ultimo_erro: String(e),
            proxima_tentativa: new Date(Date.now() + backoffMin * 60_000).toISOString(),
            updated_at: new Date().toISOString(),
          }).eq('id', item.id);
          falhas++;
        }
      }
    }

    return new Response(JSON.stringify({ ok, falhas, dlq, total: batch?.length ?? 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
