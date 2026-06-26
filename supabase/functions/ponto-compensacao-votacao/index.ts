// Gerencia votação de propostas de compensação:
// action: 'abrir' | 'votar' | 'apurar' | 'fechar'
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json();
    const { action, acordo_id } = body;
    if (!action || !acordo_id) throw new Error("action e acordo_id obrigatórios");

    const { data: acordo, error: eA } = await sb.from("ponto_compensacao_acordos").select("*").eq("id", acordo_id).single();
    if (eA || !acordo) throw new Error("Acordo não encontrado");

    if (action === "abrir") {
      const { fecha_em, quorum_percentual = 70 } = body;
      if (!fecha_em) throw new Error("fecha_em obrigatório");
      // total elegíveis = funcionários ativos da empresa
      const { count } = await sb.from("ponto_funcionarios")
        .select("id", { count: "exact", head: true })
        .eq("empresa_id", acordo.empresa_id).eq("status", "ativo");
      await sb.from("ponto_compensacao_acordos").update({
        votacao_ativa: true,
        votacao_abre_em: new Date().toISOString(),
        votacao_fecha_em: fecha_em,
        quorum_percentual,
        total_elegiveis: count || 0,
        votacao_resultado: null,
        status: "votacao",
      }).eq("id", acordo_id);
      return new Response(JSON.stringify({ ok: true, elegiveis: count || 0 }),
        { headers: { ...cors, "Content-Type": "application/json" } });
    }

    if (action === "votar") {
      const { funcionario_id, voto, justificativa } = body;
      if (!funcionario_id || !["sim","nao","abster"].includes(voto)) throw new Error("voto inválido");
      if (!acordo.votacao_ativa) throw new Error("Votação fechada");
      if (acordo.votacao_fecha_em && new Date(acordo.votacao_fecha_em) < new Date()) throw new Error("Prazo encerrado");
      const ip = req.headers.get("x-forwarded-for") || "";
      const ua = req.headers.get("user-agent") || "";
      const { error } = await sb.from("ponto_compensacao_votos").upsert({
        acordo_id, funcionario_id, voto, justificativa, ip, user_agent: ua,
      }, { onConflict: "acordo_id,funcionario_id" });
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    if (action === "apurar" || action === "fechar") {
      const { data: votos } = await sb.from("ponto_compensacao_votos").select("voto, funcionario_id").eq("acordo_id", acordo_id);
      const sim = (votos || []).filter(v => v.voto === "sim").length;
      const nao = (votos || []).filter(v => v.voto === "nao").length;
      const totalVotantes = sim + nao;
      const elegiveis = acordo.total_elegiveis || 1;
      const pctSim = totalVotantes > 0 ? (sim / totalVotantes) * 100 : 0;
      const pctParticipacao = (totalVotantes / elegiveis) * 100;
      const aprovado = pctSim >= (acordo.quorum_percentual || 70) && totalVotantes > 0;
      const resultado = aprovado ? "aprovado" : "rejeitado";

      const updates: any = { total_votos_sim: sim, total_votos_nao: nao };
      if (action === "fechar") {
        updates.votacao_ativa = false;
        updates.votacao_resultado = resultado;
        updates.votacao_finalizada_em = new Date().toISOString();
        updates.status = aprovado ? "ativo" : "cancelado";

        // Termo de ciência (texto/HTML simples salvo como observação)
        const termo = `TERMO DE CIÊNCIA E DELIBERAÇÃO COLETIVA
Proposta: ${acordo.titulo}
Motivo: ${acordo.motivo}
Compensação: ${acordo.minutos_por_dia} min/dia de ${acordo.data_inicio_compensacao} a ${acordo.data_fim_compensacao}.
Total de elegíveis: ${elegiveis} | Votantes: ${totalVotantes} (${pctParticipacao.toFixed(1)}%)
Votos SIM: ${sim} (${pctSim.toFixed(1)}%) | Votos NÃO: ${nao}
Quórum exigido: ${acordo.quorum_percentual}%
RESULTADO: ${resultado.toUpperCase()} em ${new Date().toLocaleString("pt-BR")}
Base legal: ${acordo.base_legal || "CLT art. 59-B"}`;
        updates.observacoes = (acordo.observacoes ? acordo.observacoes + "\n\n" : "") + termo;

        // Se aprovado: cria participantes (todos ativos) e lança banco de horas (se configurado)
        if (aprovado) {
          const { data: funcs } = await sb.from("ponto_funcionarios").select("id")
            .eq("empresa_id", acordo.empresa_id).eq("status", "ativo");
          const rows = (funcs || []).map((f: any) => ({
            acordo_id, funcionario_id: f.id, status: "aceito",
            aceito_em: new Date().toISOString(),
            observacoes: "Aprovado por deliberação coletiva",
          }));
          if (rows.length) await sb.from("ponto_compensacao_participantes").upsert(rows, { onConflict: "acordo_id,funcionario_id" });

          if (acordo.usa_banco_horas) {
            const minutosCompensar = acordo.total_minutos_a_compensar || acordo.minutos_dispensados || 0;
            if (minutosCompensar > 0) {
              for (const f of funcs || []) {
                // garante saldo
                let { data: saldo } = await sb.from("ponto_banco_horas_saldos")
                  .select("id").eq("funcionario_id", f.id).maybeSingle();
                if (!saldo) {
                  const { data: novo } = await sb.from("ponto_banco_horas_saldos")
                    .insert({ funcionario_id: f.id, estabelecimento_id: acordo.empresa_id, saldo_min: 0 })
                    .select("id").single();
                  saldo = novo;
                }
                if (saldo) {
                  await sb.from("ponto_banco_horas_lancamentos").insert({
                    saldo_id: saldo.id, funcionario_id: f.id,
                    estabelecimento_id: acordo.empresa_id,
                    data: acordo.data_inicio_compensacao,
                    tipo: "debito", minutos: -minutosCompensar,
                    origem: "compensacao_votacao",
                    observacao: `Compensação coletiva: ${acordo.titulo}`,
                  });
                }
              }
            }
          }
        }
      }
      await sb.from("ponto_compensacao_acordos").update(updates).eq("id", acordo_id);
      return new Response(JSON.stringify({
        ok: true, sim, nao, total: totalVotantes, elegiveis,
        pct_sim: pctSim, pct_participacao: pctParticipacao,
        aprovado, resultado, fechado: action === "fechar",
      }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    throw new Error("ação desconhecida");
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }),
      { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
