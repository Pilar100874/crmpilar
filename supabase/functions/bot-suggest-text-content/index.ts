const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY não configurada');

    const body = await req.json().catch(() => ({}));
    const briefing: string = (body.briefing || '').toString().trim();
    const contentType: string = (body.contentType || '').toString().trim();
    const count: number = Math.max(2, Math.min(4, parseInt(body.count) || 2));

    if (!briefing) throw new Error('Briefing vazio');

    const systemPrompt = `Você é um copywriter especialista em criar TEXTOS CURTOS para serem renderizados DENTRO de imagens publicitárias (peças visuais para redes sociais, anúncios, posts).

REGRAS:
- Gere EXATAMENTE ${count} variações distintas entre si (tons, ângulos ou abordagens diferentes).
- Cada variação contém: title (TÍTULO - chamada principal, no máximo 6 palavras), subtitle (SUBTÍTULO - reforço, no máximo 10 palavras) e body (TEXTO COMPLEMENTAR opcional, no máximo 12 palavras; pode ser string vazia).
- Português brasileiro. Sem emojis. Sem aspas dentro dos textos.
- Frases curtas e diretas — imagens renderizam mal frases longas.
${contentType ? `- Tipo de conteúdo: "${contentType}". Adapte o tom (promocao=urgência/oferta, institucional=sóbrio, divulgacao=aspiracional, lancamento=premium/novidade, evento=convite, educacional=informativo).` : ''}

RETORNE APENAS JSON válido no formato:
{"suggestions":[{"title":"...","subtitle":"...","body":"..."}, ...]}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Briefing: ${briefing}\n\nGere ${count} variações distintas.` },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!aiResponse.ok) {
      const txt = await aiResponse.text();
      throw new Error(`AI Gateway ${aiResponse.status}: ${txt}`);
    }

    const aiData = await aiResponse.json();
    const raw = aiData?.choices?.[0]?.message?.content || '{}';
    let parsed: any = {};
    try { parsed = JSON.parse(raw); } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : {};
    }
    const suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
    const clean = suggestions
      .slice(0, count)
      .map((s: any) => ({
        title: String(s?.title || '').trim(),
        subtitle: String(s?.subtitle || '').trim(),
        body: String(s?.body || '').trim(),
      }))
      .filter((s: any) => s.title || s.subtitle);

    if (clean.length === 0) throw new Error('Nenhuma sugestão válida foi retornada pela IA');

    return new Response(JSON.stringify({ success: true, suggestions: clean }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('❌ bot-suggest-text-content:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
