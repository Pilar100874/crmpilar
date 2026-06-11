import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const env = (k: string, d = "") => (Deno.env.get(k) ?? d).trim();

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { conversationId, text, fileUrl, fileName, contentType, whatsappNumeroId } = await req.json();

    if (!conversationId || (!text && !fileUrl)) {
      return new Response(
        JSON.stringify({ error: "conversationId and text/fileUrl are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));

    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select(`
        id, bot_id, estabelecimento_id,
        customer:customers!conversations_customer_id_fkey ( telefone )
      `)
      .eq("id", conversationId)
      .single();

    if (convError || !conversation) {
      return new Response(
        JSON.stringify({ error: "Conversation not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const customerPhone = (conversation as any).customer?.telefone;
    if (!customerPhone) {
      return new Response(
        JSON.stringify({ error: "Customer phone not found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const toNumberOnly = String(customerPhone).replace(/\D/g, "");

    // ===== Resolve número (prioridade: override do atendente > bot > padrão) =====
    let numero: any = null;
    if (whatsappNumeroId) {
      const { data: n } = await supabase
        .from("whatsapp_numeros").select("*").eq("id", whatsappNumeroId).eq("ativo", true).maybeSingle();
      numero = n;
    }
    if (!numero && conversation.bot_id) {
      const { data: bot } = await supabase
        .from("bot_flows")
        .select("whatsapp_numero_id")
        .eq("id", conversation.bot_id)
        .maybeSingle();
      if (bot?.whatsapp_numero_id) {
        const { data: n } = await supabase
          .from("whatsapp_numeros")
          .select("*")
          .eq("id", bot.whatsapp_numero_id)
          .eq("ativo", true)
          .maybeSingle();
        numero = n;
      }
    }
    if (!numero && conversation.estabelecimento_id) {
      const { data: n } = await supabase
        .from("whatsapp_numeros")
        .select("*")
        .eq("estabelecimento_id", conversation.estabelecimento_id)
        .eq("ativo", true)
        .eq("is_default", true)
        .maybeSingle();
      numero = n;
    }

    // Fallback antigo (compatibilidade): whatsapp_config singleton
    if (!numero) {
      const { data: wahaConfig } = await supabase
        .from("whatsapp_config")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (wahaConfig?.waha_url && wahaConfig?.waha_api_key) {
        numero = {
          provider: "evolution",
          waha_url: wahaConfig.waha_url,
          waha_api_key: wahaConfig.waha_api_key,
          session_name: wahaConfig.session_name || "default",
        };
      }
    }

    if (!numero) {
      return new Response(
        JSON.stringify({ error: "Nenhum número WhatsApp configurado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[AGENT] Enviando via", numero.provider, { nome: numero.nome });

    if (numero.provider === "cloud_api") {
      if (fileUrl) {
        await sendCloudMedia(numero.cloud_phone_number_id, numero.cloud_access_token, toNumberOnly, fileUrl, contentType || "document", text);
      } else {
        await sendCloudText(numero.cloud_phone_number_id, numero.cloud_access_token, toNumberOnly, text);
      }
    } else {
      const base = (numero.waha_url || "").replace(/\/+$/, "");
      const session = numero.session_name || "default";
      const apiKey = numero.waha_api_key;
      if (fileUrl) {
        await sendEvolutionMedia(toNumberOnly, text || undefined, contentType || "document", fileUrl, session, base, apiKey);
      } else {
        await sendEvolutionText(toNumberOnly, text, session, base, apiKey);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[AGENT] Error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/* ===== Evolution senders ===== */
async function sendEvolutionText(toNumberOnly: string, text: string, sessionName: string, base: string, apiKey: string) {
  if (!base || !apiKey) return console.error("[AGENT][EVO] Faltam URL/apikey");
  const number = String(toNumberOnly).replace(/\D/g, "");
  const res = await fetch(`${base}/message/sendText/${encodeURIComponent(sessionName)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: apiKey },
    body: JSON.stringify({ number, text }),
  });
  console.log("[AGENT][EVO] sendText:", res.status);
}

async function sendEvolutionMedia(toNumberOnly: string, caption: string | undefined, mediaType: string, mediaUrl: string, sessionName: string, base: string, apiKey: string) {
  if (!base || !apiKey) return console.error("[AGENT][EVO] Faltam URL/apikey");
  const number = String(toNumberOnly).replace(/\D/g, "");
  const lower = (mediaType || "").toLowerCase();
  const evoType = ["image", "video", "audio", "document"].includes(lower) ? lower : "document";
  const lastPath = (() => {
    try { return new URL(mediaUrl).pathname.split("/").pop() || "arquivo"; }
    catch { return mediaUrl.split("?")[0].split("/").pop() || "arquivo"; }
  })();
  const inferredName = decodeURIComponent(lastPath);
  const ln = inferredName.toLowerCase();
  const mime = ln.endsWith(".pdf") ? "application/pdf"
    : ln.endsWith(".xlsx") ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    : "application/octet-stream";

  let endpoint: string; let body: Record<string, unknown>;
  if (evoType === "audio") {
    endpoint = `${base}/message/sendWhatsAppAudio/${encodeURIComponent(sessionName)}`;
    body = { number, audio: mediaUrl };
  } else {
    endpoint = `${base}/message/sendMedia/${encodeURIComponent(sessionName)}`;
    body = { number, mediatype: evoType, mimetype: mime, media: mediaUrl, fileName: inferredName, ...(caption ? { caption } : {}) };
  }
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: apiKey },
    body: JSON.stringify(body),
  });
  console.log("[AGENT][EVO] sendMedia:", res.status);
}

/* ===== Cloud API senders ===== */
async function sendCloudText(phoneNumberId: string, accessToken: string, to: string, text: string) {
  if (!phoneNumberId || !accessToken) return console.error("[AGENT][CLOUD] Faltam credenciais");
  const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body: text } }),
  });
  if (!r.ok) console.error("[AGENT][CLOUD] sendText error:", await r.text().catch(() => ""));
}

async function sendCloudMedia(phoneNumberId: string, accessToken: string, to: string, mediaUrl: string, mediaType: string, caption?: string) {
  if (!phoneNumberId || !accessToken) return console.error("[AGENT][CLOUD] Faltam credenciais");
  const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
  const typeMap: Record<string, string> = { image: "image", video: "video", audio: "audio", file: "document", document: "document" };
  const t = typeMap[(mediaType || "").toLowerCase()] || "document";
  const body: any = { messaging_product: "whatsapp", to, type: t, [t]: { link: mediaUrl } };
  if (caption && (t === "image" || t === "video" || t === "document")) body[t].caption = caption;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(body),
  });
  if (!r.ok) console.error("[AGENT][CLOUD] sendMedia error:", await r.text().catch(() => ""));
}
