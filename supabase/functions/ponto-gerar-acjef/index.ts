// Gera ACJEF (Arquivo de Controle de Jornada para Efeitos Fiscais)
// Layout simplificado conforme Portaria 671/2021 art. 84-95
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

function pad(s: string|number, n: number, c='0') { return String(s).padStart(n, c); }
function formatHHMM(min: number) { const h = Math.floor(min/60); const m = min%60; return pad(h,2)+pad(m,2); }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  try {
    const { empresa_id, periodo_inicio, periodo_fim } = await req.json();
    if (!empresa_id || !periodo_inicio || !periodo_fim) {
      return new Response(JSON.stringify({ error: 'Parâmetros obrigatórios: empresa_id, periodo_inicio, periodo_fim' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: empresa } = await supabase.from('ponto_empresas').select('*').eq('id', empresa_id).single();
    const { data: funcionarios } = await supabase.from('ponto_funcionarios').select('id, nome, pis, cpf').eq('empresa_id', empresa_id);
    const { data: espelhos } = await supabase.from('ponto_espelho_diario')
      .select('*').in('funcionario_id', (funcionarios||[]).map(f=>f.id))
      .gte('data', periodo_inicio).lte('data', periodo_fim).order('data');

    const linhas: string[] = [];
    // Header
    linhas.push(`1${pad(empresa?.cnpj||'', 14)}${pad(empresa?.razao_social||'', 150, ' ')}${pad(periodo_inicio.replace(/-/g,''), 8)}${pad(periodo_fim.replace(/-/g,''), 8)}`);

    // Registros de jornada (tipo 2)
    let seq = 1;
    for (const esp of espelhos ?? []) {
      const func = funcionarios?.find(f => f.id === esp.funcionario_id);
      if (!func) continue;
      linhas.push(
        `2${pad(seq++, 9)}${pad(func.pis||'', 12)}${pad(esp.data.replace(/-/g,''), 8)}` +
        `${formatHHMM(esp.trabalho_min||0)}${formatHHMM(esp.extra_min||0)}` +
        `${formatHHMM(esp.noturno_min||0)}${formatHHMM(esp.atraso_min||0)}` +
        `${formatHHMM(esp.dsr_min||0)}`
      );
    }

    // Trailer
    linhas.push(`9${pad(linhas.length+1, 9)}`);

    const conteudo = linhas.join('\n');
    return new Response(conteudo, {
      headers: { ...corsHeaders, 'Content-Type': 'text/plain', 'Content-Disposition': `attachment; filename="ACJEF_${empresa_id}_${periodo_inicio}_${periodo_fim}.txt"` },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
