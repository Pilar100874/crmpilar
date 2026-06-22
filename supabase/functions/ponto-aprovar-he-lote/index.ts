// Aprovação em lote de HE no período.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { empresa_id, inicio, fim, funcionario_ids, decisao } = await req.json();
    if (!empresa_id || !inicio || !fim) {
      return new Response(JSON.stringify({ error: "empresa_id, inicio, fim obrigatórios" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    let q = supabase.from("ponto_ajustes").select("id, funcionario_id").eq("status", "pendente")
      .ilike("tipo", "%hora_extra%").gte("data", inicio).lte("data", fim);
    if (funcionario_ids?.length) q = q.in("funcionario_id", funcionario_ids);
    const { data: ajustes } = await q;
    const ids = (ajustes || []).map((a: any) => a.id);
    const novoStatus = decisao === "rejeitar" ? "rejeitado" : "aprovado";

    if (ids.length) {
      await supabase.from("ponto_ajustes")
        .update({ status: novoStatus, aprovado_em: new Date().toISOString() })
        .in("id", ids);
    }

    return new Response(JSON.stringify({ ok: true, total: ids.length, status: novoStatus }),
      { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
