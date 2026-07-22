import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const key = Deno.env.get('LOVABLE_API_KEY');
    if (!key) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY ausente' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const prompt = String(body?.prompt ?? '').trim();
    const contexto = String(body?.contexto ?? '').trim();
    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Descreva o que deseja gerar.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const system = [
      'Você é um redator jurídico e corporativo brasileiro.',
      'Gere um texto completo, bem estruturado, formatado em HTML SIMPLES.',
      'Use APENAS as tags: <h1>, <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>, <br>.',
      'NÃO retorne markdown, NÃO use ```html, NÃO envolva em <html>/<body>.',
      'Comece direto pelo título em <h1>. Escreva em português do Brasil.',
      'Para documentos como contratos, use cláusulas numeradas (CLÁUSULA PRIMEIRA, SEGUNDA...) em <h2> ou <h3>.',
    ].join(' ');

    const userMsg = contexto
      ? `${prompt}\n\nContexto adicional: ${contexto}`
      : prompt;

    const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Lovable-API-Key': key,
      },
      body: JSON.stringify({
        model: 'google/gemini-3.6-flash',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userMsg },
        ],
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      return new Response(JSON.stringify({ error: `Gateway: ${resp.status} ${t}` }), {
        status: resp.status === 402 || resp.status === 429 ? resp.status : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await resp.json();
    let html = String(data?.choices?.[0]?.message?.content ?? '').trim();
    // strip ```html fences if the model still returns them
    html = html.replace(/^```(?:html)?\s*/i, '').replace(/```\s*$/i, '').trim();

    return new Response(JSON.stringify({ html }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
