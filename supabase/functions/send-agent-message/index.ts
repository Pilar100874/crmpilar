import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const env = (k: string, d = "") => (Deno.env.get(k) ?? d).trim();

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversationId, text, fileUrl, fileName, contentType } = await req.json();

    if (!conversationId || !text) {
      return new Response(
        JSON.stringify({ error: "conversationId and text are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));

    // Get conversation details
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select(`
        *,
        customer:customers!conversations_customer_id_fkey (
          telefone
        )
      `)
      .eq("id", conversationId)
      .single();

    if (convError || !conversation) {
      console.error("Conversation not found:", convError);
      return new Response(
        JSON.stringify({ error: "Conversation not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get WAHA config
    const { data: wahaConfig } = await supabase
      .from("whatsapp_config")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (!wahaConfig?.waha_url || !wahaConfig?.waha_api_key) {
      console.error("WAHA not configured");
      return new Response(
        JSON.stringify({ error: "WhatsApp not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const customerPhone = conversation.customer?.telefone;
    if (!customerPhone) {
      return new Response(
        JSON.stringify({ error: "Customer phone not found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send via WAHA usando a mesma estratégia robusta do bot
    const toNumberOnly = customerPhone.replace(/\D/g, "");
    const wahaUrl = wahaConfig.waha_url.replace(/\/$/, "");
    const sessionName = wahaConfig.session_name || "default";
    const wahaApiKey = wahaConfig.waha_api_key;

    console.log("[AGENT] Sending to WAHA", {
      toNumberOnly,
      hasFile: !!fileUrl,
      contentType,
      fileName,
      sessionName,
    });

    if (fileUrl) {
      // Enviar como DOCUMENTO (PDF / EXCEL), igual ao fluxo do bot
      await sendAgentWahaMediaMessage(
        toNumberOnly,
        text || undefined,
        contentType || "document",
        fileUrl,
        sessionName,
        wahaUrl,
        wahaApiKey,
      );
    } else if (text) {
      // Somente texto
      await sendAgentWahaTextMessage(toNumberOnly, text, sessionName, wahaUrl, wahaApiKey);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[AGENT] Error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ===== Helpers para envio via WAHA (simplificados a partir do whatsapp-webhook) =====

async function sendAgentWahaTextMessage(
  toNumberOnly: string,
  text: string,
  sessionName: string,
  wahaUrl: string,
  wahaApiKey: string,
) {
  if (!wahaUrl || !wahaApiKey) {
    console.error("[AGENT][WAHA] Missing WAHA_URL or WAHA_API_KEY");
    return;
  }

  const baseUrl = wahaUrl.replace(/\/$/, "");
  const chatId = `${toNumberOnly}@c.us`;

  const endpoints = [
    `${baseUrl}/api/sendText`,
    `${baseUrl}/api/sessions/${sessionName}/sendText`,
    `${baseUrl}/api/sessions/${sessionName}/messages/send`,
  ];

  const variants: any[] = [
    { session: sessionName, chatId, text },
    { session: sessionName, to: chatId, text },
    { chatId, text },
    { to: chatId, text },
    { number: toNumberOnly, text },
  ];

  const headerSets: Array<Record<string, string>> = [
    {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${wahaApiKey}`,
      "X-API-KEY": wahaApiKey,
      "X-Api-Key": wahaApiKey,
      "x-api-key": wahaApiKey,
      apikey: wahaApiKey,
      "X-Session-Name": sessionName,
    },
  ];

  for (const endpoint of endpoints) {
    for (const headers of headerSets) {
      for (const body of variants) {
        try {
          console.log("[AGENT][WAHA] Trying TEXT ->", endpoint, "with body keys:", Object.keys(body));
          const res = await fetch(endpoint, {
            method: "POST",
            headers,
            body: JSON.stringify(body),
          });
          const json = await res.json().catch(() => ({}));
          console.log("[AGENT][WAHA] TEXT result:", res.status, JSON.stringify(json));
          if (res.ok) return;
        } catch (e) {
          console.error("[AGENT][WAHA] TEXT error:", e);
        }
      }
    }
  }

  console.error("[AGENT][WAHA] Failed to send text message");
}

async function sendAgentWahaMediaMessage(
  toNumberOnly: string,
  caption: string | undefined,
  mediaType: string,
  mediaUrl: string,
  sessionName: string,
  wahaUrl: string,
  wahaApiKey: string,
) {
  if (!wahaUrl || !wahaApiKey) {
    console.error("[AGENT][WAHA] Missing WAHA_URL or WAHA_API_KEY");
    return;
  }

  const chatId = `${toNumberOnly}@c.us`;
  const t = ["image", "video", "audio", "document"].includes((mediaType || "").toLowerCase())
    ? mediaType.toLowerCase()
    : "document";

  // Inferir nome do arquivo pelo path da URL, se não vier explícito
  const lastPath = (() => {
    try {
      return new URL(mediaUrl).pathname.split("/").pop() || "arquivo";
    } catch {
      return mediaUrl.split("?")[0].split("/").pop() || "arquivo";
    }
  })();
  const inferredName = decodeURIComponent(lastPath);
  const lowerName = inferredName.toLowerCase();
  const isPdf = lowerName.endsWith(".pdf");
  const isXlsx = lowerName.endsWith(".xlsx");
  const mime = isPdf
    ? "application/pdf"
    : isXlsx
    ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    : "application/octet-stream";

  const baseUrl = wahaUrl.replace(/\/$/, "");
  const endpoints = [
    `${baseUrl}/api/sendFile`,
    `${baseUrl}/api/sessions/${sessionName}/sendFile`,
    `${baseUrl}/api/sessions/${sessionName}/messages`,
  ];

  const variantBase: any[] = [
    // url direto com tipo/documento
    { session: sessionName, chatId, type: t, url: mediaUrl, caption, fileName: inferredName, filename: inferredName },
    { session: sessionName, to: chatId, type: t, url: mediaUrl, caption, fileName: inferredName },

    // nested object (formato WAHA Plus)
    { session: sessionName, to: chatId, [t]: { url: mediaUrl, filename: inferredName }, caption },
    { session: sessionName, chatId, [t]: { url: mediaUrl, filename: inferredName }, caption },

    // campo file com mimetype
    { session: sessionName, chatId, file: { url: mediaUrl, mimetype: mime, filename: inferredName }, caption },
    { session: sessionName, to: chatId, file: { url: mediaUrl, mimetype: mime, filename: inferredName }, caption },

    // sem session na raiz
    { chatId, type: t, url: mediaUrl, caption, fileName: inferredName },
    { to: chatId, type: t, url: mediaUrl, caption, fileName: inferredName },
  ];

  const headerSets: Array<Record<string, string>> = [
    {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${wahaApiKey}`,
      "X-API-KEY": wahaApiKey,
      "X-Api-Key": wahaApiKey,
      "x-api-key": wahaApiKey,
      "X-Session-Name": sessionName,
    },
  ];

  for (const endpoint of endpoints) {
    for (const headers of headerSets) {
      for (const body of variantBase) {
        try {
          console.log("[AGENT][WAHA] Trying MEDIA ->", endpoint, "with body keys:", Object.keys(body));
          const res = await fetch(endpoint, {
            method: "POST",
            headers,
            body: JSON.stringify(body),
          });
          const json = await res.json().catch(() => ({}));
          console.log("[AGENT][WAHA] MEDIA result:", res.status, JSON.stringify(json));
          if (res.ok) return;
        } catch (e) {
          console.error("[AGENT][WAHA] MEDIA error:", e);
        }
      }
    }
  }

  console.error("[AGENT][WAHA] Failed to send media message");
}
