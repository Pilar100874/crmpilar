import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EMBED_MODEL = 'openai/text-embedding-3-small';
const EMBED_DIM = 1536;

function chunkText(text: string, target = 900, overlap = 150): string[] {
  const clean = (text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  if (clean.length <= target) return [clean];
  const paras = clean.split(/(?<=[.?!])\s+/);
  const chunks: string[] = [];
  let cur = '';
  for (const p of paras) {
    if ((cur + ' ' + p).length > target) {
      if (cur) chunks.push(cur.trim());
      cur = cur.length > overlap ? cur.slice(-overlap) + ' ' + p : p;
    } else {
      cur = cur ? cur + ' ' + p : p;
    }
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks;
}

async function embedBatch(inputs: string[], apiKey: string): Promise<number[][]> {
  const res = await fetch('https://ai.gateway.lovable.dev/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Lovable-API-Key': apiKey,
    },
    body: JSON.stringify({ model: EMBED_MODEL, input: inputs, dimensions: EMBED_DIM }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Embedding falhou (${res.status}): ${t}`);
  }
  const data = await res.json();
  return (data.data as Array<{ embedding: number[]; index: number }>)
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) throw new Error('LOVABLE_API_KEY não configurada');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { policyId } = await req.json();
    if (!policyId) throw new Error('policyId obrigatório');

    const { data: policy, error: pErr } = await supabase
      .from('policies')
      .select('id,title,summary,content,status')
      .eq('id', policyId)
      .maybeSingle();
    if (pErr) throw pErr;
    if (!policy) throw new Error('Política não encontrada');

    // Sempre limpa chunks anteriores
    await supabase.from('policy_chunks').delete().eq('policy_id', policyId);

    if (policy.status !== 'ativa') {
      return new Response(JSON.stringify({ ok: true, skipped: 'inativa' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Remove HTML simples
    const plain = (policy.content || '').replace(/<[^>]+>/g, ' ');
    const header = `Título: ${policy.title}\nResumo: ${policy.summary || ''}\n\n`;
    const chunks = chunkText(header + plain, 900, 150);
    if (chunks.length === 0) {
      return new Response(JSON.stringify({ ok: true, chunks: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Batches de 50
    const batches: string[][] = [];
    for (let i = 0; i < chunks.length; i += 50) batches.push(chunks.slice(i, i + 50));

    const rows: Array<Record<string, unknown>> = [];
    let order = 0;
    for (const batch of batches) {
      const vecs = await embedBatch(batch, apiKey);
      batch.forEach((c, i) => {
        rows.push({
          policy_id: policyId,
          content: c,
          embedding: vecs[i] as unknown as number[],
          chunk_order: order++,
        });
      });
    }

    const { error: insErr } = await supabase.from('policy_chunks').insert(rows);
    if (insErr) throw insErr;

    return new Response(JSON.stringify({ ok: true, chunks: rows.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('policies-embed error', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
