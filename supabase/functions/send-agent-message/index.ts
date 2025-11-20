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

    // Send via WAHA
    const chatId = `${customerPhone.replace(/\D/g, "")}@c.us`;
    const wahaUrl = wahaConfig.waha_url.replace(/\/$/, "");
    const sessionName = wahaConfig.session_name || "default";

    console.log("[AGENT] Sending to:", { chatId, contentType, hasFile: !!fileUrl });

    let sendUrl = `${wahaUrl}/api/sendText`;
    let body: Record<string, unknown> = {
      session: sessionName,
      chatId,
    };

    if (fileUrl) {
      // Use sendFile para todos os tipos de arquivo (incluindo imagens)
      // pois WAHA Plus WEBJS tem problemas com sendImage
      sendUrl = `${wahaUrl}/api/sendFile`;
      body.file = {
        url: fileUrl,
        filename: fileName || "arquivo",
        // Passar mimetype ajuda o WAHA Plus a tratar corretamente o arquivo
        mimetype: contentType || "application/octet-stream",
      };
      if (text) body.caption = text;
    } else {
      body.text = text;
    }

    const response = await fetch(sendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": wahaConfig.waha_api_key,
      },
      body: JSON.stringify(body),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("[AGENT] WAHA send failed:", response.status, result);
      return new Response(
        JSON.stringify({ error: "Failed to send message", details: result }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[AGENT] Message sent successfully:", result);

    return new Response(
      JSON.stringify({ success: true, result }),
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
