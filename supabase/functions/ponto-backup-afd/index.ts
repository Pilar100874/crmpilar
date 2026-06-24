import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

// Backup mensal AFD/AEJ com hash SHA-256 e retenção legal de 5 anos.
// POST { empresa_id, competencia (YYYY-MM-DD), tipo: 'afd'|'aej' }
// Lê do storage atual, copia para path de backup com hash, registra em ponto_backups.

async function sha256(buf: ArrayBuffer) {
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { empresa_id, competencia, tipo } = await req.json();
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Localiza arquivo origem
    const { data: arquivo } = await supabase
      .from('ponto_afd_arquivos')
      .select('*')
      .eq('empresa_id', empresa_id)
      .eq('competencia', competencia)
      .eq('tipo', tipo)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!arquivo?.arquivo_url) throw new Error('arquivo origem não encontrado');

    const resp = await fetch(arquivo.arquivo_url);
    const buf = await resp.arrayBuffer();
    const hash = await sha256(buf);

    const path = `backups/${empresa_id}/${tipo}/${competencia}-${hash.slice(0, 12)}.${tipo}.txt`;
    const { error: upErr } = await supabase.storage.from('ponto-anexos').upload(path, buf, {
      contentType: 'text/plain', upsert: true,
    });
    if (upErr) throw upErr;

    const retencao = new Date(competencia);
    retencao.setFullYear(retencao.getFullYear() + 5);

    const { data: signed } = await supabase.storage.from('ponto-anexos').createSignedUrl(path, 60 * 60 * 24 * 365);

    const { error: insErr } = await supabase.from('ponto_backups').insert({
      tipo, empresa_id, competencia,
      arquivo_url: signed?.signedUrl ?? path,
      destino: 'storage',
      hash_sha256: hash,
      tamanho_bytes: buf.byteLength,
      retencao_ate: retencao.toISOString().slice(0, 10),
    });
    if (insErr) throw insErr;

    return new Response(JSON.stringify({ ok: true, hash, tamanho: buf.byteLength, retencao_ate: retencao.toISOString().slice(0, 10) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
