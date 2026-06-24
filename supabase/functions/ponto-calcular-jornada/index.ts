// Calcula jornada diária a partir dos registros e grava em ponto_espelho_diario
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function toMin(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function fromDate(d: Date) {
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

interface Regra {
  tolerancia_atraso_min: number;
  tolerancia_saida_antec_min: number;
  hora_extra_pct: number;
  adicional_noturno_pct: number;
  noturno_inicio: string;
  noturno_fim: string;
  banco_horas_ativo: boolean;
}

function calcNoturno(entrada: Date, saida: Date, ini: string, fim: string): number {
  // simplificado: minutos entre 22:00 e 05:00 do dia
  const iniMin = toMin(ini);
  const fimMin = toMin(fim);
  let total = 0;
  const cursor = new Date(entrada);
  while (cursor < saida) {
    const m = cursor.getUTCHours() * 60 + cursor.getUTCMinutes();
    const inNoturno = iniMin > fimMin ? (m >= iniMin || m < fimMin) : (m >= iniMin && m < fimMin);
    if (inNoturno) total++;
    cursor.setUTCMinutes(cursor.getUTCMinutes() + 1);
  }
  return total;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { funcionario_id, data, empresa_id } = await req.json();
    if (!funcionario_id || !data) {
      return new Response(JSON.stringify({ error: "funcionario_id e data são obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Carrega funcionário + escala + regras
    const { data: func } = await supabase
      .from("ponto_funcionarios")
      .select("id, empresa_id, escala_id, registra_ponto, jornada_contratada_horas, tipo_contrato, status, data_inicio_ponto, ponto_escalas(jornada,intervalo_minutos)")
      .eq("id", funcionario_id).single();

    // Funcionário não registra ponto (ex.: isento, comissionista puro) → não calcula
    if (func && func.registra_ponto === false) {
      return new Response(JSON.stringify({ ok: true, skipped: "funcionario_nao_registra_ponto" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    // Antes da data de início do ponto → não calcula
    if (func?.data_inicio_ponto && data < func.data_inicio_ponto) {
      return new Response(JSON.stringify({ ok: true, skipped: "antes_inicio_ponto" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    // Funcionário inativo/demitido → não calcula
    if (func?.status && !["ativo", "ferias", "afastado"].includes(func.status)) {
      return new Response(JSON.stringify({ ok: true, skipped: `status_${func.status}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const empId = empresa_id || func?.empresa_id;
    const { data: regra } = await supabase
      .from("ponto_regras_jornada").select("*").eq("empresa_id", empId).maybeSingle();

    const r: Regra = {
      tolerancia_atraso_min: regra?.tolerancia_atraso_min ?? 10,
      tolerancia_saida_antec_min: regra?.tolerancia_saida_antec_min ?? 10,
      hora_extra_pct: Number(regra?.hora_extra_pct ?? 50),
      adicional_noturno_pct: Number(regra?.adicional_noturno_pct ?? 20),
      noturno_inicio: regra?.noturno_inicio ?? "22:00",
      noturno_fim: regra?.noturno_fim ?? "05:00",
      banco_horas_ativo: regra?.banco_horas_ativo ?? false,
    };

    // Carga diária derivada da jornada contratada do funcionário (sobrescreve escala se definida)
    const cargaContratadaDiariaMin = (func as any)?.jornada_contratada_horas
      ? Math.round(Number((func as any).jornada_contratada_horas) * 60 / 5) // semanal → diária (5 dias)
      : null;

    // Registros do dia
    const ini = `${data}T00:00:00Z`;
    const fim = `${data}T23:59:59Z`;
    const { data: regs } = await supabase
      .from("ponto_registros")
      .select("data_hora, tipo")
      .eq("funcionario_id", funcionario_id)
      .gte("data_hora", ini).lte("data_hora", fim)
      .order("data_hora", { ascending: true });

    const lista = regs || [];
    const entrada = lista.find(x => x.tipo === "entrada");
    const saidaIntervalo = lista.find(x => x.tipo === "saida_intervalo");
    const retornoIntervalo = lista.find(x => x.tipo === "retorno_intervalo");
    const saida = [...lista].reverse().find(x => x.tipo === "saida");

    const falta = !entrada && !saida;
    let minutos_trabalhados = 0;
    let atraso_min = 0;
    let saida_antec_min = 0;
    let extra_min = 0;
    let noturno_min = 0;

    const jornada = (func as any)?.ponto_escalas?.jornada || {};
    const dow = new Date(`${data}T12:00:00Z`).getUTCDay();
    const diaKeys = ["dom","seg","ter","qua","qui","sex","sab"];
    const jornadaDia = jornada[diaKeys[dow]]; // {entrada,saida,carga_min}

    if (entrada && saida) {
      const e = new Date(entrada.data_hora);
      const s = new Date(saida.data_hora);
      let total = (s.getTime() - e.getTime()) / 60000;

      if (saidaIntervalo && retornoIntervalo) {
        const si = new Date(saidaIntervalo.data_hora);
        const ri = new Date(retornoIntervalo.data_hora);
        total -= (ri.getTime() - si.getTime()) / 60000;
      } else {
        total -= ((func as any)?.ponto_escalas?.intervalo_minutos ?? 60);
      }
      minutos_trabalhados = Math.max(0, Math.round(total));

      if (jornadaDia?.entrada) {
        const previstoEntrada = toMin(jornadaDia.entrada);
        const realEntrada = fromDate(e);
        const diff = realEntrada - previstoEntrada;
        if (diff > r.tolerancia_atraso_min) atraso_min = diff;
      }
      if (jornadaDia?.saida) {
        const previstoSaida = toMin(jornadaDia.saida);
        const realSaida = fromDate(s);
        const diff = previstoSaida - realSaida;
        if (diff > r.tolerancia_saida_antec_min) saida_antec_min = diff;
      }

      // Carga prevista: prioriza jornada do dia da escala, depois jornada contratada do funcionário, default 480
      const cargaPrevista = jornadaDia?.carga_min ?? cargaContratadaDiariaMin ?? 480;
      if (minutos_trabalhados > cargaPrevista) extra_min = minutos_trabalhados - cargaPrevista;

      noturno_min = calcNoturno(e, s, r.noturno_inicio, r.noturno_fim);
    }

    const saldo_banco_min = r.banco_horas_ativo ? extra_min : 0;
    // Hora reduzida noturna (CLT art. 73 §1º): 52min30s = 1 hora noturna
    const noturno_min_reduzido = Math.round(noturno_min * (60 / 52.5));
    // DSR sobre HE — aproximação diária: HE / 6 (dias úteis)
    const dsr_min = Math.round(extra_min / 6);

    const payload = {
      funcionario_id,
      data,
      entrada: entrada ? new Date(entrada.data_hora).toISOString().slice(11, 19) : null,
      saida_intervalo: saidaIntervalo ? new Date(saidaIntervalo.data_hora).toISOString().slice(11, 19) : null,
      retorno_intervalo: retornoIntervalo ? new Date(retornoIntervalo.data_hora).toISOString().slice(11, 19) : null,
      saida: saida ? new Date(saida.data_hora).toISOString().slice(11, 19) : null,
      minutos_trabalhados,
      atraso_min,
      falta,
      saida_antec_min,
      extra_min,
      noturno_min,
      noturno_min_reduzido,
      dsr_min,
      saldo_banco_min,
      calculado_em: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("ponto_espelho_diario")
      .upsert(payload, { onConflict: "funcionario_id,data" });

    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, espelho: payload }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
