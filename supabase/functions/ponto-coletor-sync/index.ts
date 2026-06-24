import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

// Sync idempotente do coletor offline.
// POST { equipamento_id, batidas: [{ nsr, funcionario_id, data_hora, tipo, hash }] }
// Conflict on (equipamento_id, nsr) => ignora silenciosamente (já registrada).

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { equipamento_id, batidas } = await req.json();
    if (!equipamento_id || !Array.isArray(batidas)) {
      return new Response(JSON.stringify({ error: 'equipamento_id e batidas[] obrigatórios' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    let inseridas = 0, duplicadas = 0, erros = 0;
    for (const b of batidas) {
      try {
        const { error } = await supabase.from('ponto_registros').insert({
          equipamento_id,
          nsr: b.nsr,
          funcionario_id: b.funcionario_id,
          data_hora: b.data_hora,
          tipo: b.tipo,
          hash: b.hash,
          origem: 'coletor_offline',
        });
        if (error) {
          if (String(error.code) === '23505') duplicadas++;
          else { erros++; console.error('insert err', error); }
        } else inseridas++;
      } catch (e) { erros++; console.error(e); }
    }

    return new Response(JSON.stringify({ inseridas, duplicadas, erros, total: batidas.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
