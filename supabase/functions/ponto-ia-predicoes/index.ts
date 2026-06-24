import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

// IA preditiva: usa Lovable AI Gateway (gemini-2.5-flash) sobre histórico do funcionário
// para gerar score 0-100 de risco de absenteísmo, turnover, HE excessivas.

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { funcionario_id, tipos } = await req.json();
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;

    // Coleta últimos 90 dias
    const desde = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
    const [func, espelho, atest, anomalias] = await Promise.all([
      supabase.from('ponto_funcionarios').select('id,nome,cargo_id,data_admissao').eq('id', funcionario_id).maybeSingle(),
      supabase.from('ponto_espelho_diario').select('data,horas_trabalhadas,horas_extras,faltas,atrasos').eq('funcionario_id', funcionario_id).gte('data', desde),
      supabase.from('ponto_atestados').select('data_inicio,data_fim,tipo').eq('funcionario_id', funcionario_id).gte('data_inicio', desde),
      supabase.from('ponto_anomalias').select('tipo,severidade,data').eq('funcionario_id', funcionario_id).gte('data', desde),
    ]);

    const contexto = {
      funcionario: func.data,
      espelho_resumo: {
        dias: espelho.data?.length ?? 0,
        total_he: espelho.data?.reduce((a: number, d: any) => a + (d.horas_extras ?? 0), 0) ?? 0,
        total_faltas: espelho.data?.reduce((a: number, d: any) => a + (d.faltas ?? 0), 0) ?? 0,
        total_atrasos: espelho.data?.reduce((a: number, d: any) => a + (d.atrasos ?? 0), 0) ?? 0,
      },
      atestados: atest.data?.length ?? 0,
      anomalias_alta: anomalias.data?.filter((a: any) => a.severidade === 'alta').length ?? 0,
    };

    const tiposAnalisar: string[] = tipos ?? ['absenteismo', 'turnover', 'horas_extras'];
    const prompt = `Você é um especialista em RH. Analise o histórico do funcionário (últimos 90 dias) e retorne JSON estrito:
{
  "predicoes": [
    {"tipo":"absenteismo|turnover|horas_extras","score":0-100,"nivel":"baixo|medio|alto|critico","fatores":["..."],"recomendacoes":["..."]}
  ]
}

Avalie apenas: ${tiposAnalisar.join(', ')}.
Dados: ${JSON.stringify(contexto)}`;

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      }),
    });
    if (!aiRes.ok) throw new Error(`AI ${aiRes.status}: ${await aiRes.text()}`);
    const ai = await aiRes.json();
    const parsed = JSON.parse(ai.choices?.[0]?.message?.content ?? '{"predicoes":[]}');

    const inseridas: any[] = [];
    for (const p of parsed.predicoes ?? []) {
      const { data } = await supabase.from('ponto_predicoes_ia').insert({
        funcionario_id, tipo: p.tipo, score: p.score, nivel: p.nivel,
        fatores: { fatores: p.fatores }, recomendacoes: p.recomendacoes,
        modelo: 'google/gemini-2.5-flash',
        periodo_analisado: `[${desde},${new Date().toISOString().slice(0, 10)})`,
      }).select().single();
      if (data) inseridas.push(data);
    }

    return new Response(JSON.stringify({ ok: true, predicoes: inseridas }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
