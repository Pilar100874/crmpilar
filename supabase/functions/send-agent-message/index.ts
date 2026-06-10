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

// ===== Helpers para envio via Evolution API =====

async function sendAgentWahaTextMessage(
  toNumberOnly: string,
  text: string,
  sessionName: string,
  wahaUrl: string,
  wahaApiKey: string,
) {
  const base = (wahaUrl || "").replace(/\/+$/, "");
  if (!base || !wahaApiKey) {
    console.error("[AGENT][EVOLUTION] Faltam URL ou apikey");
    return;
  }
  const instance = sessionName || "default";
  const number = String(toNumberOnly).replace(/\D/g, "");
  try {
    const res = await fetch(`${base}/message/sendText/${encodeURIComponent(instance)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", apikey: wahaApiKey },
      body: JSON.stringify({ number, text }),
    });
    const json = await res.text().catch(() => "");
    console.log("[AGENT][EVOLUTION] sendText:", res.status, json.slice(0, 300));
  } catch (e) {
    console.error("[AGENT][EVOLUTION] sendText error:", e);
  }
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
  const base = (wahaUrl || "").replace(/\/+$/, "");
  if (!base || !wahaApiKey) {
    console.error("[AGENT][EVOLUTION] Faltam URL ou apikey");
    return;
  }
  const instance = sessionName || "default";
  const number = String(toNumberOnly).replace(/\D/g, "");
  const lower = (mediaType || "").toLowerCase();
  const evoType = lower === "image" || lower === "video" || lower === "audio" || lower === "document"
    ? lower : "document";

  const lastPath = (() => {
    try { return new URL(mediaUrl).pathname.split("/").pop() || "arquivo"; }
    catch { return mediaUrl.split("?")[0].split("/").pop() || "arquivo"; }
  })();
  const inferredName = decodeURIComponent(lastPath);
  const ln = inferredName.toLowerCase();
  const mime = ln.endsWith(".pdf") ? "application/pdf"
    : ln.endsWith(".xlsx") ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    : "application/octet-stream";

  try {
    let endpoint: string;
    let body: Record<string, unknown>;
    if (evoType === "audio") {
      endpoint = `${base}/message/sendWhatsAppAudio/${encodeURIComponent(instance)}`;
      body = { number, audio: mediaUrl };
    } else {
      endpoint = `${base}/message/sendMedia/${encodeURIComponent(instance)}`;
      body = { number, mediatype: evoType, mimetype: mime, media: mediaUrl, fileName: inferredName, ...(caption ? { caption } : {}) };
    }
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", apikey: wahaApiKey },
      body: JSON.stringify(body),
    });
    const json = await res.text().catch(() => "");
    console.log("[AGENT][EVOLUTION] sendMedia:", res.status, json.slice(0, 300));
  } catch (e) {
    console.error("[AGENT][EVOLUTION] sendMedia error:", e);
  }
}

