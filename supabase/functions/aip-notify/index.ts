import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const notificationId = body?.notification_id;
    if (!notificationId || typeof notificationId !== "string") {
      return new Response(JSON.stringify({ error: "notification_id obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: notif } = await supabase
      .from("aip_notifications")
      .select("*")
      .eq("id", notificationId)
      .maybeSingle();

    if (!notif) {
      return new Response(JSON.stringify({ error: "notificação não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: cfg } = await supabase
      .from("aip_notification_settings")
      .select("*")
      .eq("estabelecimento_id", notif.estabelecimento_id)
      .maybeSingle();

    const resultado: Record<string, unknown> = { webhook: "ignorado", email: "ignorado" };

    // Webhook
    if (cfg?.webhook_url) {
      try {
        const res = await fetch(cfg.webhook_url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            evento: notif.evento,
            nivel: notif.nivel,
            titulo: notif.titulo,
            mensagem: notif.mensagem,
            execution_id: notif.execution_id,
            approval_id: notif.approval_id,
            payload: notif.payload,
            criado_em: notif.created_at,
          }),
        });
        resultado.webhook = `${res.status}`;
      } catch (e) {
        resultado.webhook = `erro: ${e instanceof Error ? e.message : "desconhecido"}`;
      }
    }

    // E-mail (Resend, se configurado)
    const emails: string[] = Array.isArray(cfg?.emails) ? cfg!.emails : [];
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (emails.length > 0 && resendKey) {
      try {
        const html = `
          <div style="font-family:Arial,sans-serif;padding:16px">
            <h2 style="margin:0 0 8px">${notif.titulo}</h2>
            <p style="margin:0 0 12px;color:#444">${notif.mensagem ?? ""}</p>
            <p style="font-size:12px;color:#777">Evento: ${notif.evento} · Execução: ${notif.execution_id ?? "-"}</p>
          </div>`;
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Agentes IA <onboarding@resend.dev>",
            to: emails,
            subject: notif.titulo,
            html,
          }),
        });
        resultado.email = `${res.status}`;
      } catch (e) {
        resultado.email = `erro: ${e instanceof Error ? e.message : "desconhecido"}`;
      }
    } else if (emails.length > 0) {
      resultado.email = "RESEND_API_KEY ausente";
    }

    await supabase
      .from("aip_notifications")
      .update({ payload: { ...(notif.payload ?? {}), entrega: resultado } })
      .eq("id", notif.id);

    return new Response(JSON.stringify({ ok: true, resultado }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "erro" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
