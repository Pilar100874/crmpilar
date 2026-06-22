// Calcula banco de horas diariamente: HE vira crédito, faltas viram débito, expira saldos vencidos
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const ontem = body.data || new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    // Pega espelhos do dia
    const { data: espelhos } = await sb
      .from("ponto_espelho_diario").select("*").eq("data", ontem);

    let processados = 0;
    for (const e of espelhos || []) {
      const credito = (e.he_50 || 0) + (e.he_100 || 0);
      const debito = e.minutos_faltantes || 0;
      const delta = credito - debito;
      if (delta === 0) continue;

      // Saldo ativo do funcionário
      let { data: saldo } = await sb
        .from("ponto_banco_horas_saldos")
        .select("*")
        .eq("funcionario_id", e.funcionario_id)
        .eq("ativo", true)
        .maybeSingle();

      if (!saldo) {
        const { data: novo } = await sb.from("ponto_banco_horas_saldos").insert({
          funcionario_id: e.funcionario_id,
          estabelecimento_id: e.estabelecimento_id,
          saldo_minutos: 0,
          data_expiracao: new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10),
        }).select().single();
        saldo = novo;
      }
      if (!saldo) continue;

      await sb.from("ponto_banco_horas_lancamentos").insert({
        saldo_id: saldo.id,
        funcionario_id: e.funcionario_id,
        estabelecimento_id: e.estabelecimento_id,
        data: ontem,
        tipo: delta > 0 ? "credito" : "debito",
        minutos: Math.abs(delta),
        origem: "espelho_diario",
        espelho_id: e.id,
      });
      await sb.from("ponto_banco_horas_saldos")
        .update({ saldo_minutos: (saldo.saldo_minutos || 0) + delta })
        .eq("id", saldo.id);
      processados++;
    }

    // Expira saldos vencidos
    const hoje = new Date().toISOString().slice(0, 10);
    const { data: vencidos } = await sb.from("ponto_banco_horas_saldos")
      .select("*").eq("ativo", true).lte("data_expiracao", hoje).gt("saldo_minutos", 0);
    for (const v of vencidos || []) {
      await sb.from("ponto_banco_horas_lancamentos").insert({
        saldo_id: v.id, funcionario_id: v.funcionario_id,
        estabelecimento_id: v.estabelecimento_id, data: hoje,
        tipo: "expiracao", minutos: v.saldo_minutos, origem: "cron_expiracao",
      });
      await sb.from("ponto_banco_horas_saldos")
        .update({ saldo_minutos: 0, ativo: false }).eq("id", v.id);
    }

    return new Response(JSON.stringify({ ok: true, processados, expirados: (vencidos || []).length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
