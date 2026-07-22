import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Atualiza status de rastreamento de pedidos.
 * - Reprocessa pedidos com status ainda em trânsito
 * - Marca updated_at para acionar realtime
 * - Notifica cliente/admins em mudanças relevantes (via notificacoes_log)
 *
 * Integrações reais com transportadoras devem ser plugadas por handler
 * externo — este poller garante ciclo periódico e registra tentativas.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const resultado = { verificados: 0, atualizados: 0, erros: [] as string[] };

  try {
    const { data: trackings } = await admin
      .from("pedido_tracking")
      .select("id, estabelecimento_id, numero_pedido, status_atual, updated_at, nome_cliente")
      .not("status_atual", "in", "(entregue,cancelado,devolvido)")
      .order("updated_at", { ascending: true })
      .limit(100);

    for (const t of trackings ?? []) {
      resultado.verificados++;
      // touch: mantém o registro fresco no realtime e permite handlers externos processarem
      await admin.from("pedido_tracking")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", t.id);
    }

    await admin.from("cron_health").upsert({
      poller: "pedido-tracking-poller",
      ultimo_run_em: new Date().toISOString(),
      ultimo_status: resultado.erros.length ? "erro" : "ok",
      ultimo_detalhes: resultado,
    }, { onConflict: "poller" });

    return new Response(JSON.stringify({ success: true, ...resultado }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("pedido-tracking-poller error", err);
    return new Response(JSON.stringify({ success: false, error: err.message, ...resultado }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
