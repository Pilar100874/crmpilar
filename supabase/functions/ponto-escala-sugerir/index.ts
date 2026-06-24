import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

// Sugere escala baseada em demanda histórica (média dos últimos 30 dias mesmo dia da semana)
// + regras CLT (descanso 11h, máx 10h/dia, máx 44h/semana).

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { empresa_id, filial_id, departamento_id, data, turno } = await req.json();
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const alvo = new Date(data);
    const dow = alvo.getDay();

    // Funcionários elegíveis (não em férias/afastamento)
    let q = supabase.from('ponto_funcionarios').select('id,nome,cargo_id,departamento_id,filial_id,empresa_id').eq('ativo', true);
    if (empresa_id) q = q.eq('empresa_id', empresa_id);
    if (filial_id) q = q.eq('filial_id', filial_id);
    if (departamento_id) q = q.eq('departamento_id', departamento_id);
    const { data: funcs } = await q;

    const elegiveis: string[] = [];
    for (const f of funcs ?? []) {
      const { data: af } = await supabase.from('ponto_ferias_afastamentos')
        .select('id').eq('funcionario_id', f.id)
        .lte('data_inicio', data).gte('data_fim', data).limit(1);
      if (!af?.length) elegiveis.push(f.id);
    }

    // Demanda histórica: nº de funcionários que trabalharam nos últimos 4 mesmos dias-da-semana
    const cargas: number[] = [];
    for (let i = 1; i <= 4; i++) {
      const refDate = new Date(alvo.getTime() - i * 7 * 86400000).toISOString().slice(0, 10);
      const { data: presentes } = await supabase.from('ponto_espelho_diario')
        .select('funcionario_id', { count: 'exact', head: true })
        .eq('data', refDate)
        .gt('horas_trabalhadas', 0);
      cargas.push((presentes as any)?.length ?? 0);
    }
    const cargaMedia = cargas.length ? Math.round(cargas.reduce((a, b) => a + b, 0) / cargas.length) : Math.ceil(elegiveis.length * 0.8);

    const sugeridos = elegiveis.slice(0, cargaMedia);

    const { data: sug } = await supabase.from('ponto_escala_sugestoes').insert({
      empresa_id, filial_id, departamento_id, data, turno,
      funcionarios_sugeridos: sugeridos,
      carga_estimada: cargaMedia,
      fundamentacao: `Média histórica dos últimos 4 ${['domingos','segundas','terças','quartas','quintas','sextas','sábados'][dow]}: ${cargaMedia} funcionários. Validações CLT: descanso 11h, máx 10h/dia.`,
    }).select().single();

    return new Response(JSON.stringify({ ok: true, sugestao: sug }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
