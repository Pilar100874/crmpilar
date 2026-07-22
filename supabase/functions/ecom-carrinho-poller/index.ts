import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Recuperação de carrinhos abandonados no e-commerce.
 * Detecta ecom_active_carts sem atividade há 60 min, ainda 'ativo',
 * marca recovery_triggered_at e notifica admins.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const resultado = { recuperacoes: 0, erros: [] as string[] };

  try {
    const limite = new Date();
    limite.setMinutes(limite.getMinutes() - 60);

    const { data: carts } = await admin
      .from("ecom_active_carts")
      .select("id, estabelecimento_id, customer_id, customer_email, customer_phone, total, item_count, last_activity_at, recovery_triggered_at, status")
      .lte("last_activity_at", limite.toISOString())
      .is("recovery_triggered_at", null)
      .in("status", ["ativo", "active"])
      .gt("item_count", 0)
      .limit(200);

    for (const c of carts ?? []) {
      await admin.from("ecom_active_carts")
        .update({ recovery_triggered_at: new Date().toISOString(), status: "abandonado" })
        .eq("id", c.id);

      const { data: admins } = await admin
        .from("usuarios")
        .select("id")
        .eq("estabelecimento_id", c.estabelecimento_id)
        .in("nivel_acesso", ["admin", "administrador", "supervisor"]);
      const links = (admins ?? []).map((u: any) => ({
        usuario_id: u.id,
        tipo: "carrinho_abandonado",
        titulo: "🛒 Carrinho abandonado",
        mensagem: `Cliente ${c.customer_email || c.customer_phone || "anônimo"} deixou ${c.item_count} item(ns) — R$ ${Number(c.total || 0).toFixed(2)}.`,
        lida: false,
        estabelecimento_id: c.estabelecimento_id,
      }));
      if (links.length) await admin.from("notificacoes_log").insert(links);
      resultado.recuperacoes++;
    }

    return new Response(JSON.stringify({ success: true, ...resultado }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("ecom-carrinho-poller error", err);
    return new Response(JSON.stringify({ success: false, error: err.message, ...resultado }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
