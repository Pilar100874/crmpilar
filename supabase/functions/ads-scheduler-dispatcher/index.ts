// Roda a cada minuto via pg_cron.
// Para cada `ads_scheduler_config` ativa, decide se está na hora de rodar
// (compara `proxima_execucao` com now()); se sim, dispara `executar-ads-automacoes`
// em background e atualiza os timestamps.

import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supa = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const now = new Date();

    const { data: configs, error } = await supa
      .from('ads_scheduler_config')
      .select('*')
      .eq('ativo', true)
      .neq('frequencia', 'desligado');
    if (error) return json({ error: error.message }, 500);

    const disparadas: string[] = [];
    for (const c of configs || []) {
      const proxima = c.proxima_execucao ? new Date(c.proxima_execucao) : null;
      if (proxima && proxima > now) continue;

      const proximaNova = calcularProxima(c.frequencia, c.cron_expr, now);

      // Dispara sem esperar
      supa.functions.invoke('executar-ads-automacoes', {
        body: { estabelecimento_id: c.estabelecimento_id },
      }).then(async ({ error: e }) => {
        await supa.from('ads_scheduler_config').update({
          ultima_execucao: now.toISOString(),
          proxima_execucao: proximaNova.toISOString(),
          ultimo_status: e ? 'erro' : 'ok',
          ultimo_erro: e?.message || null,
        }).eq('estabelecimento_id', c.estabelecimento_id);
      });

      disparadas.push(c.estabelecimento_id);
    }
    return json({ ok: true, disparadas });
  } catch (e: any) {
    return json({ error: e?.message || String(e) }, 500);
  }
});

function json(b: any, s = 200) { return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }

function calcularProxima(freq: string, cronExpr: string | null | undefined, base: Date): Date {
  const next = new Date(base.getTime());
  switch (freq) {
    case '15min': next.setMinutes(next.getMinutes() + 15); return next;
    case 'hora': next.setHours(next.getHours() + 1); return next;
    case 'dia': next.setDate(next.getDate() + 1); return next;
    case 'custom': return nextFromCron(cronExpr || '*/30 * * * *', base);
    default: next.setMinutes(next.getMinutes() + 15); return next;
  }
}

// Parser mínimo de cron (5 campos): apoia '*', 'N', '*/N', 'A,B,C', 'A-B'
// Suficiente pra maioria dos casos de scheduler; se falhar, cai em 15min.
function nextFromCron(expr: string, base: Date): Date {
  try {
    const parts = expr.trim().split(/\s+/);
    if (parts.length !== 5) throw new Error('cron inválido');
    const [minP, hourP, domP, monP, dowP] = parts;
    for (let i = 0; i < 60 * 24 * 366; i++) {
      const d = new Date(base.getTime() + (i + 1) * 60_000);
      if (matches(minP, d.getMinutes(), 0, 59) &&
          matches(hourP, d.getHours(), 0, 23) &&
          matches(domP, d.getDate(), 1, 31) &&
          matches(monP, d.getMonth() + 1, 1, 12) &&
          matches(dowP, d.getDay(), 0, 6)) {
        return d;
      }
    }
  } catch {}
  const fallback = new Date(base.getTime()); fallback.setMinutes(fallback.getMinutes() + 15); return fallback;
}
function matches(part: string, v: number, min: number, max: number): boolean {
  if (part === '*') return true;
  for (const seg of part.split(',')) {
    if (seg.startsWith('*/')) { const step = Number(seg.slice(2)); if (step > 0 && (v - min) % step === 0) return true; continue; }
    if (seg.includes('-')) { const [a, b] = seg.split('-').map(Number); if (v >= a && v <= b) return true; continue; }
    if (Number(seg) === v) return true;
  }
  return false;
}
