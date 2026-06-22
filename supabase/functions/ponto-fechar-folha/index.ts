// Fechamento de folha em 1 clique: roda cálculos do mês para todos e trava o período.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { empresa_id, mes_referencia } = await req.json();
    if (!empresa_id || !mes_referencia) {
      return new Response(JSON.stringify({ error: "empresa_id e mes_referencia obrigatórios" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const [year, month] = mes_referencia.split("-").map(Number);
    const inicio = new Date(Date.UTC(year, month - 1, 1));
    const fim = new Date(Date.UTC(year, month, 0));
    const inicioStr = inicio.toISOString().slice(0, 10);
    const fimStr = fim.toISOString().slice(0, 10);

    const { data: funcs } = await supabase.from("ponto_funcionarios")
      .select("id").eq("empresa_id", empresa_id).eq("status", "ativo");

    let processados = 0;
    for (const f of funcs || []) {
      const cursor = new Date(inicio);
      while (cursor <= fim) {
        await supabase.functions.invoke("ponto-calcular-jornada", {
          body: { funcionario_id: f.id, data: cursor.toISOString().slice(0, 10), empresa_id },
        });
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
      processados++;
    }

    const { data: espMes } = await supabase
      .from("ponto_espelho_diario")
      .select("extra_min, falta, ponto_funcionarios!inner(empresa_id)")
      .eq("ponto_funcionarios.empresa_id", empresa_id)
      .gte("data", inicioStr).lte("data", fimStr);
    const rows = (espMes || []) as any[];
    const totHE = rows.reduce((s, r) => s + (r.extra_min || 0), 0);
    const totFaltas = rows.filter((r) => r.falta).length;

    const { error: upErr } = await supabase.from("ponto_periodos_fechamento")
      .upsert({
        empresa_id, mes_referencia: `${mes_referencia}-01`,
        fechado_em: new Date().toISOString(),
        total_funcionarios: processados, total_he_min: totHE, total_faltas: totFaltas,
      }, { onConflict: "empresa_id,mes_referencia" });
    if (upErr) throw upErr;

    return new Response(JSON.stringify({
      ok: true, processados, total_he_min: totHE, total_faltas: totFaltas,
    }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
