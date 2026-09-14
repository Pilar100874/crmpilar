import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { validarChaveColetor } from '../_shared/coletorAuth.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const body = await req.json().catch(() => ({}));
    const autenticacao = await validarChaveColetor(supabase, body?.chave);
    if ('response' in autenticacao) return autenticacao.response;
    const estabelecimentoId = autenticacao.estabelecimentoId;
    const acao = String(body?.acao || '');
    const deviceKey = String(body?.device_key || '').trim();
    if (!deviceKey || deviceKey.length > 100) return json({ error: 'device_key inválido' }, 400);

    if (acao === 'heartbeat') {
      const { data: atual } = await supabase
        .from('coletor_dispositivos')
        .select('id, comando, estabelecimento_id')
        .eq('device_key', deviceKey)
        .eq('estabelecimento_id', estabelecimentoId)
        .maybeSingle();

      const registro = {
        device_key: deviceKey,
        hostname: body?.hostname ? String(body.hostname).slice(0, 120) : null,
        plataforma: body?.plataforma ? String(body.plataforma).slice(0, 120) : null,
        versao: body?.versao ? String(body.versao).slice(0, 40) : null,
        unidade_id: body?.unidade_id || null,
        unidade_nome: body?.unidade_nome ? String(body.unidade_nome).slice(0, 120) : null,
        ultimo_contato: new Date().toISOString(),
        estabelecimento_id: estabelecimentoId,
      };

      if (atual) {
        await supabase.from('coletor_dispositivos').update(registro).eq('id', atual.id);
        if (atual.comando) {
          await supabase
            .from('coletor_dispositivos')
            .update({ comando_status: 'executando' })
            .eq('id', atual.id);
        }
        return json({ ok: true, comando: atual.comando || null });
      }

      await supabase.from('coletor_dispositivos').insert(registro);
      return json({ ok: true, comando: null });
    }

    if (acao === 'ack') {
      const status = body?.status === 'erro' ? 'erro' : 'concluido';
      await supabase
        .from('coletor_dispositivos')
        .update({
          comando: null,
          comando_status: status,
          comando_resultado: body?.resultado ? String(body.resultado).slice(0, 500) : null,
          ultimo_contato: new Date().toISOString(),
        })
        .eq('device_key', deviceKey)
        .eq('estabelecimento_id', estabelecimentoId);
      return json({ ok: true });
    }

    return json({ error: 'ação desconhecida' }, 400);
  } catch (e) {
    console.error('[coletor-dispositivo]', e);
    return json({ error: String((e as Error).message || e) }, 500);
  }
});
