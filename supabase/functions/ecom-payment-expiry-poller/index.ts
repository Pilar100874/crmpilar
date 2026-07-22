import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Expira pedidos e-commerce com pagamento pendente (Pix/Boleto) após 24h.
 * Atualiza pedidos_ecommerce.status → 'cancelado_expirado' e notifica admins.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const resultado = { expirados: 0, erros: [] as string[] };

  try {
    const limite = new Date();
    limite.setHours(limite.getHours() - 24);

    const { data: pedidos } = await admin
      .from("pedidos_ecommerce")
      .select("id, estabelecimento_id, numero_pedido, status, created_at, nome_cliente")
      .lte("created_at", limite.toISOString())
      .in("status", ["aguardando_pagamento", "pendente", "pending"])
      .limit(200);

    for (const p of pedidos ?? []) {
      await admin.from("pedidos_ecommerce")
        .update({ status: "cancelado_expirado", updated_at: new Date().toISOString() })
        .eq("id", p.id);

      const { data: admins } = await admin
        .from("usuarios")
        .select("id")
        .eq("estabelecimento_id", p.estabelecimento_id)
        .in("nivel_acesso", ["admin", "administrador", "supervisor"]);
      const links = (admins ?? []).map((u: any) => ({
        usuario_id: u.id,
        tipo: "pedido_expirado",
        titulo: "Pedido expirado",
        mensagem: `Pedido ${p.numero_pedido} de ${p.nome_cliente || "cliente"} foi cancelado por falta de pagamento em 24h.`,
        lida: false,
        estabelecimento_id: p.estabelecimento_id,
      }));
      if (links.length) await admin.from("notificacoes_log").insert(links);
      resultado.expirados++;
    }

    return new Response(JSON.stringify({ success: true, ...resultado }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("ecom-payment-expiry-poller error", err);
    return new Response(JSON.stringify({ success: false, error: err.message, ...resultado }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
