import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.25.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BodySchema = z.object({
  pedidoId: z.string().uuid(),
  status: z.string().min(1),
  canal: z.enum(["whatsapp", "email"]),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { pedidoId, status, canal } = parsed.data;

    // Get pedido data
    const { data: pedido, error: pedidoError } = await supabase
      .from("pedido_tracking")
      .select("*")
      .eq("id", pedidoId)
      .single();

    if (pedidoError || !pedido) {
      return new Response(JSON.stringify({ error: "Pedido não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get status config for message template
    const { data: statusConfig } = await supabase
      .from("pedido_tracking_status_config")
      .select("*")
      .eq("estabelecimento_id", pedido.estabelecimento_id)
      .eq("nome", status)
      .single();

    // Get estabelecimento for branding
    const { data: estabelecimento } = await supabase
      .from("estabelecimentos")
      .select("nome_fantasia")
      .eq("id", pedido.estabelecimento_id)
      .single();

    const trackingUrl = `${Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", ".lovable.app")}/rastreio/${pedido.token_rastreamento}`;
    const nomeEmpresa = estabelecimento?.nome_fantasia || "Nossa Empresa";

    let notificationSent = false;

    if (canal === "whatsapp" && pedido.telefone_cliente) {
      const wahaUrl = Deno.env.get("WAHA_URL");
      const wahaApiKey = Deno.env.get("WAHA_API_KEY");

      if (!wahaUrl || !wahaApiKey) {
        console.error("WAHA not configured");
        return new Response(JSON.stringify({ error: "WhatsApp não configurado" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Build message from template or default
      let message = statusConfig?.mensagem_whatsapp || `Olá {nome}! Atualização do pedido #{numero}: *${statusConfig?.label || status}*`;
      message = message
        .replace(/{nome}/g, pedido.nome_cliente)
        .replace(/{numero}/g, pedido.numero_pedido)
        .replace(/{status}/g, statusConfig?.label || status)
        .replace(/{empresa}/g, nomeEmpresa)
        .replace(/{link}/g, trackingUrl);

      // Add tracking link if not in template
      if (!message.includes(trackingUrl)) {
        message += `\n\n📦 Acompanhe aqui: ${trackingUrl}`;
      }

      // Send via WAHA
      const phone = pedido.telefone_cliente.replace(/\D/g, "");
      const chatId = `${phone}@c.us`;

      const wahaResponse = await fetch(`${wahaUrl}/api/sendText`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": wahaApiKey,
        },
        body: JSON.stringify({
          chatId,
          text: message,
          session: "default",
        }),
      });

      if (wahaResponse.ok) {
        notificationSent = true;
        // Update historico with notification flag
        await supabase
          .from("pedido_tracking_historico")
          .update({ notificado_whatsapp: true })
          .eq("pedido_tracking_id", pedidoId)
          .eq("status", status)
          .order("created_at", { ascending: false })
          .limit(1);
      } else {
        console.error("WAHA send failed:", await wahaResponse.text());
      }
    }

    if (canal === "email" && pedido.email_cliente) {
      // Send via external email server
      const emailMessage = `
        <h2>Atualização do Pedido #${pedido.numero_pedido}</h2>
        <p>Olá ${pedido.nome_cliente},</p>
        <p>Seu pedido está com o status: <strong>${statusConfig?.label || status}</strong></p>
        <p>Acompanhe em tempo real: <a href="${trackingUrl}">Clique aqui para rastrear</a></p>
        <br/>
        <p>Atenciosamente,<br/>${nomeEmpresa}</p>
      `;

      try {
        const emailResponse = await fetch("https://mailcrm.pilar.com.br/send-emails", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: pedido.email_cliente,
            subject: `Pedido #${pedido.numero_pedido} - ${statusConfig?.label || status}`,
            html: emailMessage,
          }),
        });

        if (emailResponse.ok) {
          notificationSent = true;
          await supabase
            .from("pedido_tracking_historico")
            .update({ notificado_email: true })
            .eq("pedido_tracking_id", pedidoId)
            .eq("status", status)
            .order("created_at", { ascending: false })
            .limit(1);
        }
      } catch (e) {
        console.error("Email send failed:", e);
      }
    }

    return new Response(
      JSON.stringify({ success: true, notificationSent }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
