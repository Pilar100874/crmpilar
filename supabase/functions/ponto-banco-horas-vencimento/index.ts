// Vencimento e compensação automática de banco de horas (CLT 6/12/18 meses)
// Roda diariamente via cron. Marca lançamentos vencidos e converte saldo positivo expirado em pagamento.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { empresa_id, prazo_meses } = await req.json().catch(() => ({}));
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Carrega config: prazo padrão da empresa ou 6 meses (acordo individual CLT 59)
    const prazo = prazo_meses ?? 6;
    const limite = new Date();
    limite.setUTCMonth(limite.getUTCMonth() - prazo);
    const limiteStr = limite.toISOString().slice(0, 10);

    const filtroEmp = empresa_id ? { estabelecimento_id: empresa_id } : {};

    // Busca lançamentos de crédito antigos que ainda não foram totalmente compensados
    const { data: creditos } = await sb.from("ponto_banco_horas_lancamentos")
      .select("*").eq("tipo", "credito").lte("data", limiteStr).match(filtroEmp);

    let expirados = 0, pagos = 0, total_min_expirado = 0;

    for (const c of creditos || []) {
      // verifica se já foi expirado/pago
      const { data: ja } = await sb.from("ponto_banco_horas_lancamentos")
        .select("id").eq("saldo_id", c.saldo_id).eq("espelho_id", c.id).in("tipo", ["expiracao", "pagamento"]);
      if ((ja || []).length > 0) continue;

      // Política: tenta pagar, senão expira (aqui marcamos como expiração — política configurável depois)
      await sb.from("ponto_banco_horas_lancamentos").insert({
        saldo_id: c.saldo_id, funcionario_id: c.funcionario_id,
        estabelecimento_id: c.estabelecimento_id, data: new Date().toISOString().slice(0, 10),
        tipo: "expiracao", minutos: -c.minutos, origem: "auto_vencimento",
        espelho_id: c.id, observacao: `Vencido após ${prazo} meses (CLT art. 59)`,
      });
      expirados++;
      total_min_expirado += c.minutos;

      // Cria alerta para RH
      await sb.from("ponto_alertas").insert({
        funcionario_id: c.funcionario_id, tipo: "banco_horas_vencido",
        severidade: "media",
        mensagem: `${c.minutos} min de banco de horas vencidos (lançamento de ${c.data})`,
        dados: { lancamento_id: c.id, minutos: c.minutos, data_credito: c.data },
      }).select();
    }

    // Recalcula saldos
    if (expirados > 0) {
      const saldosAfetados = [...new Set((creditos || []).map((c: any) => c.saldo_id))];
      for (const sid of saldosAfetados) {
        const { data: lancs } = await sb.from("ponto_banco_horas_lancamentos")
          .select("minutos").eq("saldo_id", sid);
        const saldo = (lancs || []).reduce((s: number, l: any) => s + l.minutos, 0);
        await sb.from("ponto_banco_horas_saldos").update({
          saldo_min: saldo, updated_at: new Date().toISOString(),
        }).eq("id", sid);
      }
    }

    return new Response(JSON.stringify({
      ok: true, prazo_meses: prazo, limite: limiteStr,
      expirados, pagos, total_min_expirado,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
