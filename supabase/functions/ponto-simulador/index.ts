// Simulador de cenários — calcula impacto de mudanças de jornada/escala
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Body = {
  empresa_id: string;
  cenario: {
    nova_carga_diaria_min?: number;     // ex: 480 = 8h
    novo_intervalo_min?: number;        // ex: 60
    adicional_noturno_pct?: number;     // ex: 20
    he_pct?: number;                    // ex: 50
    dias_uteis_mes?: number;            // default 22
    aumento_quadro?: number;            // % adicional de funcionários
  };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = (await req.json()) as Body;
    const { empresa_id, cenario } = body;
    if (!empresa_id) {
      return new Response(JSON.stringify({ error: "empresa_id é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const desde = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const [{ data: funcs }, { data: espelho }] = await Promise.all([
      supabase.from("ponto_funcionarios")
        .select("id, salario_base").eq("empresa_id", empresa_id).eq("status", "ativo"),
      supabase.from("ponto_espelho_diario")
        .select("extra_min, noturno_min, atraso_min, falta, ponto_funcionarios!inner(empresa_id)")
        .eq("ponto_funcionarios.empresa_id", empresa_id)
        .gte("data", desde),
    ]);

    const nFuncs = (funcs || []).length;
    const folhaMedia = (funcs || []).reduce((s: number, f: any) => s + Number(f.salario_base || 0), 0);
    const rows = (espelho || []) as any[];
    const totHE = rows.reduce((s, r) => s + (r.extra_min || 0), 0);
    const totNot = rows.reduce((s, r) => s + (r.noturno_min || 0), 0);
    const totFaltas = rows.filter((r) => r.falta).length;

    const diasUteis = cenario?.dias_uteis_mes ?? 22;
    const hePct = (cenario?.he_pct ?? 50) / 100;
    const notPct = (cenario?.adicional_noturno_pct ?? 20) / 100;

    // base atual (custo mensal estimado)
    const hHoraMedia = nFuncs ? (folhaMedia / nFuncs) / 220 : 0;
    const custoHEatual = (totHE / 60) * hHoraMedia * (1 + hePct);
    const custoNoturnoAtual = (totNot / 60) * hHoraMedia * notPct;
    const custoFaltas = totFaltas * (hHoraMedia * 8);
    const custoAtualTotal = folhaMedia + custoHEatual + custoNoturnoAtual - custoFaltas;

    // simulado
    const fatorQuadro = 1 + ((cenario?.aumento_quadro ?? 0) / 100);
    const novaFolha = folhaMedia * fatorQuadro;
    // se reduzir carga diária, HE projetada aumenta proporcionalmente
    let novaHE = totHE;
    if (cenario?.nova_carga_diaria_min) {
      const cargaAtual = 480; // assumimos 8h padrão
      const dif = cargaAtual - cenario.nova_carga_diaria_min;
      // se aumentou carga, HE cai; se diminuiu, HE sobe
      novaHE = Math.max(0, totHE - dif * diasUteis * nFuncs * 0.1);
    }
    const custoHEsim = (novaHE / 60) * (novaFolha / Math.max(1, nFuncs) / 220) * (1 + hePct);
    const custoSimTotal = novaFolha + custoHEsim + custoNoturnoAtual - custoFaltas;

    const economia = +(custoAtualTotal - custoSimTotal).toFixed(2);

    return new Response(JSON.stringify({
      base: {
        funcionarios: nFuncs,
        folha_mensal: +folhaMedia.toFixed(2),
        custo_he_mes: +custoHEatual.toFixed(2),
        custo_noturno_mes: +custoNoturnoAtual.toFixed(2),
        custo_total_estimado: +custoAtualTotal.toFixed(2),
        he_min_30d: totHE,
        noturno_min_30d: totNot,
        faltas_30d: totFaltas,
      },
      simulado: {
        folha_mensal: +novaFolha.toFixed(2),
        custo_he_mes: +custoHEsim.toFixed(2),
        custo_total_estimado: +custoSimTotal.toFixed(2),
        he_min_projetada: Math.round(novaHE),
      },
      economia,
      economia_anual: +(economia * 12).toFixed(2),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
