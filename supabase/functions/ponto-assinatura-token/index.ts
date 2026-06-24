import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

// Magic link + 2FA: gera token e código 6 dígitos, ou valida.
// POST { action: 'gerar', funcionario_id, espelho_id, canal }
// POST { action: 'validar', token, codigo }

async function sha256(str: string) {
  const buf = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const body = await req.json();
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    if (body.action === 'gerar') {
      const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '');
      const token_hash = await sha256(token);
      const codigo_2fa = String(Math.floor(100000 + Math.random() * 900000));
      const expira_em = new Date(Date.now() + 15 * 60 * 1000).toISOString();

      const { error } = await supabase.from('ponto_assinatura_tokens').insert({
        funcionario_id: body.funcionario_id,
        espelho_id: body.espelho_id,
        token_hash,
        codigo_2fa,
        canal_2fa: body.canal || 'email',
        expira_em,
      });
      if (error) throw error;

      // TODO: integrar com canal real (email/SMS/whatsapp). Por ora retorna para auditoria interna.
      return new Response(JSON.stringify({
        ok: true,
        token,
        link: `${body.base_url || ''}/ponto/assinar?token=${token}`,
        codigo_2fa, // remover em produção; só para teste/log interno
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (body.action === 'validar') {
      const token_hash = await sha256(body.token);
      const { data: row } = await supabase
        .from('ponto_assinatura_tokens')
        .select('*')
        .eq('token_hash', token_hash)
        .maybeSingle();

      if (!row) return new Response(JSON.stringify({ ok: false, motivo: 'token_invalido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      if (row.validado_em) return new Response(JSON.stringify({ ok: false, motivo: 'ja_usado' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      if (new Date(row.expira_em) < new Date()) return new Response(JSON.stringify({ ok: false, motivo: 'expirado' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      if (row.tentativas >= row.max_tentativas) return new Response(JSON.stringify({ ok: false, motivo: 'bloqueado' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      if (String(body.codigo) !== row.codigo_2fa) {
        await supabase.from('ponto_assinatura_tokens').update({ tentativas: row.tentativas + 1 }).eq('id', row.id);
        return new Response(JSON.stringify({ ok: false, motivo: 'codigo_incorreto' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
      const ua = req.headers.get('user-agent') || null;
      await supabase.from('ponto_assinatura_tokens').update({
        validado_em: new Date().toISOString(),
        ip_validacao: ip,
        user_agent_validacao: ua,
      }).eq('id', row.id);

      if (row.espelho_id) {
        await supabase.from('ponto_assinaturas_espelho').insert({
          espelho_id: row.espelho_id,
          funcionario_id: row.funcionario_id,
          metodo: '2fa_magic_link',
          ip_assinatura: ip,
          user_agent: ua,
          assinado_em: new Date().toISOString(),
        });
      }

      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'action inválido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
