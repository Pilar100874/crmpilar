import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

/** Recebe o áudio da ligação, transcreve e devolve resumo, data de retorno combinada e objeção. */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization') ?? '';
    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
    const { data: claims } = await sb.auth.getClaims(auth.replace('Bearer ', ''));
    if (!claims?.claims) return json({ error: 'Não autenticado' }, 401);
    const key = Deno.env.get('LOVABLE_API_KEY');
    if (!key) throw new Error('LOVABLE_API_KEY ausente');

    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof Blob)) return json({ error: 'Áudio ausente' }, 400);
    const up = new FormData();
    up.append('model', 'openai/gpt-transcribe');
    up.append('language', 'pt');
    up.append('file', file, `ligacao.${(file.type || '').includes('mp4') ? 'mp4' : 'webm'}`);
    const tr = await fetch('https://ai.gateway.lovable.dev/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: up });
    if (!tr.ok) return json({ error: 'Falha na transcrição', status: tr.status }, 200);
    const texto = String((await tr.json()).text ?? '').trim();
    if (texto.length < 15) return json({ resumo: null });

    const hoje = new Date().toISOString().slice(0, 10);
    const ai = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-3.8-flash',
        messages: [
          { role: 'system', content: `Hoje é ${hoje}. Resuma ligações comerciais em português. Responda SOMENTE JSON: {"resumo":"até 2 frases","data_retorno":"YYYY-MM-DD ou null se nada foi combinado","motivo":"motivo do retorno ou null","objecao":"objeção do cliente ou null"}` },
          { role: 'user', content: texto.slice(0, 12000) },
        ],
      }),
    });
    const bruto = String((await ai.json()).choices?.[0]?.message?.content ?? '');
    let r: any = {};
    try { r = JSON.parse(bruto.slice(bruto.indexOf('{'), bruto.lastIndexOf('}') + 1)); } catch { r = { resumo: bruto.slice(0, 300) }; }
    const data = typeof r.data_retorno === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.data_retorno) && r.data_retorno >= hoje ? r.data_retorno : null;
    return json({ resumo: r.resumo ?? null, data_retorno: data, motivo: r.motivo ?? null, objecao: r.objecao ?? null });
  } catch (e: any) {
    return json({ error: e.message }, 500);
  }
});
