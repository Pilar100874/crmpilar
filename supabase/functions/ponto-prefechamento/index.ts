// Pré-fechamento mensal — retorna checklist de pendências antes de fechar a folha
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { empresa_id, mes_referencia, fechar } = await req.json();
    if (!empresa_id || !mes_referencia) throw new Error("empresa_id e mes_referencia obrigatórios");
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const ini = mes_referencia.slice(0, 7) + "-01";
    const fimDate = new Date(ini); fimDate.setUTCMonth(fimDate.getUTCMonth() + 1); fimDate.setUTCDate(0);
    const fim = fimDate.toISOString().slice(0, 10);

    const { data: funcs } = await sb.from("ponto_funcionarios")
      .select("id, nome, cpf, matricula").eq("empresa_id", empresa_id).eq("ativo", true);
    const ids = (funcs || []).map((f) => f.id);
    const total_funcionarios = ids.length;

    if (!ids.length) {
      return new Response(JSON.stringify({ ok: true, checklist: [], total_funcionarios: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fMap = Object.fromEntries((funcs || []).map((f) => [f.id, f]));

    // 1. Faltas sem justificativa
    const { data: faltas } = await sb.from("ponto_espelho_diario")
      .select("funcionario_id, data, tipo_dia")
      .in("funcionario_id", ids).gte("data", ini).lte("data", fim).eq("falta", true);
    const faltasSemJustif = (faltas || []).filter((f) => f.tipo_dia === "normal");

    // 2. Marcações ímpares (ex: entrada sem saída)
    const { data: regs } = await sb.from("ponto_registros")
      .select("funcionario_id, data_hora")
      .in("funcionario_id", ids)
      .gte("data_hora", `${ini}T00:00:00Z`).lte("data_hora", `${fim}T23:59:59Z`);
    const porFuncDia: Record<string, number> = {};
    for (const r of regs || []) {
      const k = `${r.funcionario_id}_${r.data_hora.slice(0, 10)}`;
      porFuncDia[k] = (porFuncDia[k] || 0) + 1;
    }
    const marcacoesImpares = Object.entries(porFuncDia).filter(([, n]) => n % 2 !== 0)
      .map(([k, n]) => {
        const [funcionario_id, data] = k.split("_");
        return { funcionario_id, data, total: n, funcionario: fMap[funcionario_id] };
      });

    // 3. Ajustes pendentes
    const { data: ajustesPend } = await sb.from("ponto_ajustes")
      .select("id, funcionario_id, data, tipo, motivo")
      .in("funcionario_id", ids).gte("data", ini).lte("data", fim).eq("status", "pendente");

    // 4. Atestados pendentes
    const { data: atestPend } = await sb.from("ponto_atestados")
      .select("id, funcionario_id, data_inicio, data_fim, tipo")
      .in("funcionario_id", ids).lte("data_inicio", fim).gte("data_fim", ini).eq("status", "pendente");

    // 5. Espelhos não assinados
    const { data: assinados } = await sb.from("ponto_assinaturas_espelho")
      .select("funcionario_id").in("funcionario_id", ids).eq("mes_referencia", ini);
    const setAss = new Set((assinados || []).map((a: any) => a.funcionario_id));
    const naoAssinados = ids.filter((id) => !setAss.has(id)).map((id) => fMap[id]);

    // 6. Sem registros no mês
    const setRegs = new Set((regs || []).map((r: any) => r.funcionario_id));
    const semRegistros = ids.filter((id) => !setRegs.has(id)).map((id) => fMap[id]);

    const checklist = [
      { chave: "faltas_sem_justif", titulo: "Faltas sem justificativa", count: faltasSemJustif.length, bloqueante: false, items: faltasSemJustif.slice(0, 50).map((f: any) => ({ ...f, funcionario: fMap[f.funcionario_id] })) },
      { chave: "marcacoes_impares", titulo: "Dias com marcações ímpares", count: marcacoesImpares.length, bloqueante: true, items: marcacoesImpares.slice(0, 50) },
      { chave: "ajustes_pendentes", titulo: "Ajustes pendentes de aprovação", count: (ajustesPend || []).length, bloqueante: true, items: (ajustesPend || []).slice(0, 50).map((a: any) => ({ ...a, funcionario: fMap[a.funcionario_id] })) },
      { chave: "atestados_pendentes", titulo: "Atestados pendentes", count: (atestPend || []).length, bloqueante: true, items: (atestPend || []).slice(0, 50).map((a: any) => ({ ...a, funcionario: fMap[a.funcionario_id] })) },
      { chave: "espelhos_nao_assinados", titulo: "Espelhos não assinados", count: naoAssinados.length, bloqueante: false, items: naoAssinados.slice(0, 50) },
      { chave: "sem_registros", titulo: "Funcionários sem registros no mês", count: semRegistros.length, bloqueante: false, items: semRegistros.slice(0, 50) },
    ];

    const bloqueantes = checklist.filter((c) => c.bloqueante && c.count > 0);

    // Totais agregados
    const { data: espelhos } = await sb.from("ponto_espelho_diario")
      .select("extra_min, falta").in("funcionario_id", ids).gte("data", ini).lte("data", fim);
    const total_he_min = (espelhos || []).reduce((s, e: any) => s + (e.extra_min || 0), 0);
    const total_faltas = (espelhos || []).filter((e: any) => e.falta).length;

    if (fechar) {
      if (bloqueantes.length > 0) {
        return new Response(JSON.stringify({
          error: "Existem pendências bloqueantes. Resolva antes de fechar.", checklist,
        }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      await sb.from("ponto_periodos_fechamento").upsert({
        empresa_id, mes_referencia: ini,
        total_funcionarios, total_he_min, total_faltas,
        fechado_em: new Date().toISOString(),
      }, { onConflict: "empresa_id,mes_referencia" });
    }

    return new Response(JSON.stringify({
      ok: true, checklist, total_funcionarios, total_he_min, total_faltas,
      pode_fechar: bloqueantes.length === 0, fechado: !!fechar,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
