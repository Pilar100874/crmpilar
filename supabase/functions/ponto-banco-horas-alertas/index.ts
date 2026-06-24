import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

// Cron: verifica saldos de banco de horas perto do vencimento e dispara push/email.
// Alerta em 90, 60, 30, 15 e 7 dias.

const JANELAS = [90, 60, 30, 15, 7];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const hoje = new Date();
    let alertas = 0;

    for (const dias of JANELAS) {
      const alvo = new Date(hoje.getTime() + dias * 86400000).toISOString().slice(0, 10);
      const { data: lancamentos } = await supabase
        .from('ponto_banco_horas_lancamentos')
        .select('id,funcionario_id,saldo_minutos,validade')
        .gt('saldo_minutos', 0)
        .eq('validade', alvo);

      for (const l of lancamentos ?? []) {
        const horas = (l.saldo_minutos / 60).toFixed(1);
        await supabase.from('ponto_alertas').insert({
          funcionario_id: l.funcionario_id,
          tipo: 'banco_horas_vencimento',
          severidade: dias <= 15 ? 'alta' : 'media',
          mensagem: `${horas}h do seu banco de horas vencem em ${dias} dia(s) (${alvo}).`,
          referencia_id: l.id,
        });
        await supabase.functions.invoke('ponto-push-send', {
          body: {
            funcionario_id: l.funcionario_id,
            titulo: 'Banco de horas perto do vencimento',
            corpo: `${horas}h vencem em ${dias} dia(s). Programe a compensação.`,
            url: '/ponto/banco-horas',
          },
        });
        alertas++;
      }
    }

    return new Response(JSON.stringify({ ok: true, alertas }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
