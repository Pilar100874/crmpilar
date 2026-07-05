// Resumo diário/semanal por estabelecimento — dispara UMA notificação consolidada pro gestor
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { estabelecimento_id: only } = await req.json().catch(() => ({}));

    const query = sb.from("ponto_notificacoes_config").select("*").eq("resumo_diario_ativo", true);
    if (only) query.eq("estabelecimento_id", only);
    const { data: configs } = await query;

    const ontem = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    let enviados = 0;

    for (const cfg of configs || []) {
      const est = cfg.estabelecimento_id;

      const [faltas, atrasos, hePend, atestPend, fraudes] = await Promise.all([
        sb.from("ponto_espelho_diario").select("id", { count: "exact", head: true })
          .eq("estabelecimento_id", est).eq("data", ontem).eq("status", "falta"),
        sb.from("ponto_espelho_diario").select("id", { count: "exact", head: true })
          .eq("estabelecimento_id", est).eq("data", ontem).eq("status", "atraso"),
        sb.from("ponto_ajustes").select("id", { count: "exact", head: true })
          .eq("estabelecimento_id", est).eq("status", "pendente").eq("tipo", "hora_extra"),
        sb.from("ponto_atestados").select("id", { count: "exact", head: true })
          .eq("estabelecimento_id", est).eq("status", "pendente"),
        sb.from("ponto_anomalias").select("id", { count: "exact", head: true })
          .eq("estabelecimento_id", est).eq("severidade", "alta")
          .gte("created_at", ontem + "T00:00:00"),
      ]);

      const total = (faltas.count || 0) + (atrasos.count || 0) + (hePend.count || 0) + (atestPend.count || 0) + (fraudes.count || 0);
      if (total === 0) continue;

      const resumo =
        `📊 *Resumo do Ponto — ${ontem}*\n` +
        `• Faltas: ${faltas.count || 0}\n` +
        `• Atrasos: ${atrasos.count || 0}\n` +
        `• HE pendentes: ${hePend.count || 0}\n` +
        `• Atestados pendentes: ${atestPend.count || 0}\n` +
        `• 🛑 Alertas de fraude: ${fraudes.count || 0}\n\n` +
        `Acesse: https://crmpilar.lovable.app/ponto/dashboard`;

      // Dispara pro canal escolhido (whatsapp por padrão) SEM dedupe (é resumo diário)
      await sb.functions.invoke("ponto-notificar-canal", {
        body: {
          estabelecimento_id: est, tipo: "resumo_diario",
          canais: [cfg.resumo_canal || "whatsapp"],
          titulo: `Resumo do Ponto — ${ontem}`,
          mensagem: resumo, forcar: true,
        },
      });
      enviados++;
    }

    return new Response(JSON.stringify({ ok: true, enviados }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
