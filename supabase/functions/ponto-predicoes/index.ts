// Inteligência preditiva — analisa histórico e prevê absenteísmo, HE e custo
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { empresa_id } = await req.json();
    if (!empresa_id) {
      return new Response(JSON.stringify({ error: "empresa_id é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Pega últimos 90 dias do espelho
    const desde = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
    const { data: espelho } = await supabase
      .from("ponto_espelho_diario")
      .select("data, atraso_min, extra_min, falta, saldo_banco_min, ponto_funcionarios!inner(id, nome, empresa_id, salario_base)")
      .eq("ponto_funcionarios.empresa_id", empresa_id)
      .gte("data", desde);

    const rows = (espelho || []) as any[];

    // Agrupa por funcionário
    const porFunc = new Map<string, any>();
    for (const r of rows) {
      const f = r.ponto_funcionarios;
      const k = f.id;
      if (!porFunc.has(k)) {
        porFunc.set(k, {
          id: k, nome: f.nome, salario: Number(f.salario_base || 0),
          dias: 0, faltas: 0, atrasos: 0, extras: 0, saldo: 0,
        });
      }
      const a = porFunc.get(k);
      a.dias++;
      if (r.falta) a.faltas++;
      a.atrasos += r.atraso_min || 0;
      a.extras += r.extra_min || 0;
      a.saldo = r.saldo_banco_min || a.saldo;
    }

    // Predições por funcionário
    const previsoes = [...porFunc.values()].map((a) => {
      const taxaFalta = a.dias ? a.faltas / a.dias : 0;
      const mediaAtrasoDia = a.dias ? a.atrasos / a.dias : 0;
      const mediaExtraDia = a.dias ? a.extras / a.dias : 0;
      // risco simples 0-100
      const riscoAbsenteismo = Math.min(100, Math.round(taxaFalta * 300 + mediaAtrasoDia * 0.8));
      // projeção próximos 30 dias úteis (~22)
      const projFaltas30 = +(taxaFalta * 22).toFixed(1);
      const projHE30 = +((mediaExtraDia * 22) / 60).toFixed(1);
      const custoHEmes = a.salario
        ? +((a.salario / 220) * 1.5 * projHE30).toFixed(2)
        : 0;
      return {
        funcionario_id: a.id,
        nome: a.nome,
        risco_absenteismo: riscoAbsenteismo,
        previsao_faltas_30d: projFaltas30,
        previsao_he_30d_h: projHE30,
        custo_he_estimado: custoHEmes,
        saldo_banco_min: a.saldo,
      };
    }).sort((a, b) => b.risco_absenteismo - a.risco_absenteismo);

    const totais = {
      funcionarios: previsoes.length,
      custo_he_total: +previsoes.reduce((s, p) => s + p.custo_he_estimado, 0).toFixed(2),
      he_total_30d_h: +previsoes.reduce((s, p) => s + p.previsao_he_30d_h, 0).toFixed(1),
      em_alto_risco: previsoes.filter((p) => p.risco_absenteismo >= 60).length,
    };

    return new Response(JSON.stringify({ totais, previsoes }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
