import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    // 1. Carrega configurações por empresa
    const { data: configs } = await supabase
      .from('ponto_clt_config')
      .select('empresa_id, banco_horas_prazo_meses, banco_horas_alerta_dias_antes, banco_horas_acao_expirado');

    let processados = 0;
    let expirados = 0;
    let alertados = 0;

    for (const cfg of configs ?? []) {
      const prazoMeses = cfg.banco_horas_prazo_meses ?? 6;
      const alertaDias = cfg.banco_horas_alerta_dias_antes ?? 30;
      const acao = cfg.banco_horas_acao_expirado ?? 'pagar';

      // 2. Lança a expirar
      const { data: aExpirar } = await supabase
        .from('ponto_banco_horas_lancamentos')
        .select('id, funcionario_id, minutos, created_at, data')
        .eq('compensado', false)
        .eq('expirado', false)
        .gt('minutos', 0);

      const hoje = new Date();

      for (const l of aExpirar ?? []) {
        const criadoEm = new Date(l.created_at);
        const expiraEm = new Date(criadoEm);
        expiraEm.setMonth(expiraEm.getMonth() + prazoMeses);
        const diasParaExpirar = Math.ceil((expiraEm.getTime() - hoje.getTime()) / 86400000);

        // Verifica se funcionário pertence à empresa do config
        const { data: func } = await supabase
          .from('ponto_funcionarios')
          .select('empresa_id, nome')
          .eq('id', l.funcionario_id)
          .single();
        if (func?.empresa_id !== cfg.empresa_id) continue;

        processados++;

        if (diasParaExpirar <= 0) {
          // Expirou
          await supabase.from('ponto_banco_horas_lancamentos').update({
            expirado: true,
            expirado_em: new Date().toISOString(),
          }).eq('id', l.id);

          await supabase.from('ponto_anomalias').insert({
            empresa_id: cfg.empresa_id,
            funcionario_id: l.funcionario_id,
            data: l.data,
            tipo: 'banco_horas_expirado',
            severidade: 'alta',
            descricao: `Banco de horas (${l.minutos}min) expirou após ${prazoMeses} meses. Ação: ${acao}`,
            detalhes: { minutos: l.minutos, acao, lancamento_id: l.id },
          });
          expirados++;
        } else if (diasParaExpirar <= alertaDias) {
          // Próximo de expirar
          await supabase.from('ponto_alertas').insert({
            empresa_id: cfg.empresa_id,
            funcionario_id: l.funcionario_id,
            tipo: 'banco_horas_a_expirar',
            severidade: diasParaExpirar <= 7 ? 'alta' : 'media',
            mensagem: `${l.minutos}min de banco de horas de ${func.nome} expira em ${diasParaExpirar} dias`,
            data_referencia: l.data,
          }).select();
          alertados++;
        }
      }
    }

    return new Response(JSON.stringify({ processados, expirados, alertados }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
