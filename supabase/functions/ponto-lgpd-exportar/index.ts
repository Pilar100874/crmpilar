import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

// Atende solicitação LGPD: exporta JSON completo do titular ou anonimiza dados.
// POST { solicitacao_id }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { solicitacao_id } = await req.json();
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: sol } = await supabase.from('ponto_lgpd_solicitacoes').select('*').eq('id', solicitacao_id).maybeSingle();
    if (!sol) throw new Error('solicitação não encontrada');

    const fid = sol.funcionario_id;

    if (sol.tipo === 'exportacao' || sol.tipo === 'portabilidade') {
      const [func, regs, ajustes, atest, espelho, banco, ferias] = await Promise.all([
        supabase.from('ponto_funcionarios').select('*').eq('id', fid).maybeSingle(),
        supabase.from('ponto_registros').select('*').eq('funcionario_id', fid),
        supabase.from('ponto_ajustes').select('*').eq('funcionario_id', fid),
        supabase.from('ponto_atestados').select('*').eq('funcionario_id', fid),
        supabase.from('ponto_espelho_diario').select('*').eq('funcionario_id', fid),
        supabase.from('ponto_banco_horas_lancamentos').select('*').eq('funcionario_id', fid),
        supabase.from('ponto_ferias_afastamentos').select('*').eq('funcionario_id', fid),
      ]);

      const payload = {
        gerado_em: new Date().toISOString(),
        titular: func.data,
        registros_ponto: regs.data,
        ajustes: ajustes.data,
        atestados: atest.data,
        espelho_diario: espelho.data,
        banco_horas: banco.data,
        ferias_afastamentos: ferias.data,
      };

      const path = `lgpd/${fid}/export-${Date.now()}.json`;
      const { error: upErr } = await supabase.storage.from('ponto-anexos').upload(path, JSON.stringify(payload, null, 2), {
        contentType: 'application/json', upsert: true,
      });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage.from('ponto-anexos').createSignedUrl(path, 60 * 60 * 24 * 7);

      await supabase.from('ponto_lgpd_solicitacoes').update({
        status: 'concluida',
        arquivo_resultado_url: signed?.signedUrl,
        respondido_em: new Date().toISOString(),
        resposta: 'Exportação JSON disponibilizada (link válido por 7 dias).',
      }).eq('id', solicitacao_id);

      return new Response(JSON.stringify({ ok: true, url: signed?.signedUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (sol.tipo === 'anonimizacao' || sol.tipo === 'exclusao') {
      // Anonimização preserva integridade histórica obrigatória (CLT exige guarda 5 anos do AFD)
      await supabase.from('ponto_funcionarios').update({
        nome: `ANONIMIZADO-${fid.slice(0, 8)}`,
        cpf: null, email: null, telefone: null, endereco: null,
        foto_url: null, biometria_facial: null, biometria_digital: null,
      }).eq('id', fid);

      await supabase.from('ponto_lgpd_solicitacoes').update({
        status: 'concluida',
        respondido_em: new Date().toISOString(),
        resposta: 'Dados pessoais anonimizados. Registros de jornada mantidos pelo prazo legal (5 anos) conforme art. 7º Portaria MTP 671/2021.',
      }).eq('id', solicitacao_id);

      return new Response(JSON.stringify({ ok: true, anonimizado: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: false, motivo: 'tipo não automatizado' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
