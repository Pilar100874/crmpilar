import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WhatsAppWebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: { display_phone_number: string; phone_number_id: string };
        messages?: Array<{ from: string; id: string; timestamp: string; text?: { body: string }; type: string }>;
      };
      field: string;
    }>;
  }>;
}

/* ===== Helpers / ENVs ===== */
const env = (k: string, d = "") => (Deno.env.get(k) ?? d).trim();
const SUPABASE_URL = env("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = env("SUPABASE_SERVICE_ROLE_KEY");
const VERIFY_TOKEN = env("WHATSAPP_VERIFY_TOKEN", "conversa_botique_verify");
const JID_SUFFIX = env("WAHA_JID_SUFFIX", "@c.us"); // "@c.us" (WEBJS) ou "@s.whatsapp.net" (Baileys)

const toJid = (numOnly: string) => `${String(numOnly).replace(/\D/g, "")}${JID_SUFFIX}`;

function resolveWahaSession(raw: any): string {
  return String(
    raw?.data?.session ||
      raw?.data?.sessionId ||
      raw?.payload?.session ||
      raw?.session ||
      raw?.sessionId ||
      raw?.instance?.name ||
      raw?.instanceId ||
      raw?.data?.instance ||
      raw?.payload?.instance ||
      "default",
  ).trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Healthcheck + verificação (Meta)
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token === VERIFY_TOKEN && challenge) {
      console.log("Webhook verified (Meta)");
      return new Response(challenge, { status: 200, headers: corsHeaders });
    }
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ====== Parse do corpo robusto ======
    let rawText = "";
    let raw: any = {};
    try {
      rawText = await req.text();                 // lê o corpo cru
      raw = rawText ? JSON.parse(rawText) : {};   // tenta parsear
    } catch {
      raw = {};
    }
    console.log("RAW body:", rawText);
    console.log("Received JSON webhook:", JSON.stringify(raw, null, 2));

    let from = "";                 // número do remetente (apenas dígitos)
    let body = "";                 // texto recebido
    let phoneNumberId = "";        // Meta Graph API phone number id
    let transport: "waha" | "meta" | "twilio" = "meta";
    let wahaSession = "default";

    // ====== Heurística WAHA ======

    // A) { event:'message' | type:'message', data/message... }
    if ((raw?.event === "message" || raw?.type === "message") && (raw?.data || raw?.message)) {
      transport = "waha";
      from = String(raw.data?.from || raw.message?.from || raw.from || "").replace(/\D/g, "");
      body =
        raw.data?.text ||
        raw.message?.text ||
        raw.data?.message?.conversation ||
        raw.message?.conversation ||
        raw.data?.message?.extendedTextMessage?.text ||
        "";
      wahaSession = resolveWahaSession(raw);
      console.log("[WAHA] Message received:", { sessionName: wahaSession, fromNumber: from, text: body });
    }

    // B) Baileys: { messages:[{ key:{remoteJid}, message:{...} }], ... }
    if (transport !== "waha" && Array.isArray(raw?.messages) && raw.messages[0]?.key) {
      transport = "waha";
      const msg0 = raw.messages[0];
      const remote = msg0.key?.remoteJid || "";
      from = String(remote).split("@")[0].replace(/\D/g, "");
      body =
        msg0.message?.conversation ||
        msg0.message?.extendedTextMessage?.text ||
        msg0.message?.imageMessage?.caption ||
        "";
      wahaSession = resolveWahaSession(raw);
      console.log("[WAHA] Message received (baileys):", { sessionName: wahaSession, fromNumber: from, text: body });
    }

    // C) WEBJS: { event:'message', payload:{ from, body }, session: ... }
    if (transport !== "waha" && (raw?.event === "message" || raw?.type === "message") && raw?.payload) {
      transport = "waha";
      const p = raw.payload || {};
      const fromJid = String(p.from || p._data?.id?.remote || "");
      from = fromJid.split("@")[0].replace(/\D/g, "");
      body = String(p.body || p.text || p.message?.conversation || p._data?.body || "");
      wahaSession = resolveWahaSession(raw);
      console.log("[WAHA] Message received (webjs):", { sessionName: wahaSession, fromNumber: from, text: body });
    }

    // ====== Meta oficial (se não caiu em WAHA) ======
    if (transport !== "waha") {
      const payload: WhatsAppWebhookPayload = raw;
      if (!payload.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
        console.log("Received WhatsApp (Meta) webhook:", JSON.stringify(raw));
        console.log("No message in webhook");
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const messageData = payload.entry[0].changes[0].value.messages[0];
      from = messageData.from;
      body = messageData.text?.body || "";
      phoneNumberId = payload.entry[0].changes[0].value.metadata.phone_number_id;
      transport = "meta";
    }

    console.log("Processed message:", { from, body, phoneNumberId, transport });

    // ====== Busca configuração do WAHA ======
    let WAHA_URL = "";
    let WAHA_API_KEY = "";
    
    if (transport === "waha") {
      // Primeiro busca a sessão para pegar o estabelecimento_id
      const { data: sessionData } = await supabase
        .from("whatsapp_sessions")
        .select("estabelecimento_id")
        .eq("session_name", wahaSession)
        .maybeSingle();
      
      if (sessionData?.estabelecimento_id) {
        // Agora busca a configuração WAHA do estabelecimento
        const { data: wahaConfig } = await supabase
          .from("whatsapp_config")
          .select("waha_url, waha_api_key")
          .eq("estabelecimento_id", sessionData.estabelecimento_id)
          .maybeSingle();
        
        if (wahaConfig) {
          WAHA_URL = wahaConfig.waha_url || "";
          WAHA_API_KEY = wahaConfig.waha_api_key || "";
          console.log("[WAHA] Using config from whatsapp_config:", { sessionName: wahaSession, hasUrl: !!WAHA_URL, hasApiKey: !!WAHA_API_KEY });
        } else {
          console.error("[WAHA] No whatsapp_config found for estabelecimento_id:", sessionData.estabelecimento_id);
        }
      } else {
        console.error("[WAHA] No session found with name:", wahaSession);
      }
    }
    
    // ====== Carrega fluxo ativo ======
    const { data: flowData } = await supabase.from("bot_flows").select("*").eq("active", true).maybeSingle();

    const respond = async (text?: string, mediaUrl?: string, mediaType?: string) => {
      if (transport === "waha") {
        if (mediaUrl && mediaType) {
          await sendWahaMediaMessage(from, text, mediaType, mediaUrl, wahaSession, WAHA_URL, WAHA_API_KEY);
        } else if (text) {
          await sendWahaTextMessage(from, text, wahaSession, WAHA_URL, WAHA_API_KEY);
        }
      } else {
        if (mediaUrl && mediaType) await sendWhatsAppMedia(phoneNumberId, from, mediaUrl, mediaType, text);
        else if (text) await sendWhatsAppMessage(phoneNumberId, from, text);
      }
    };

    if (!flowData) {
      await respond("Olá! Nenhum fluxo ativo encontrado. Configure um bot no painel.");
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ====== Contexto por sessão (isola por WAHA) ======
    const sessionKey = transport === "waha" ? `whatsapp_${wahaSession}_${from}` : `whatsapp_meta_${from}`;
    console.log("[SESSION] Looking for session:", sessionKey);

    const { data: sessionData } = await supabase
      .from("chat_sessions")
      .select("*")
      .eq("session_id", sessionKey)
      .maybeSingle();

    console.log("[SESSION] Session data found:", {
      exists: !!sessionData,
      hasPendingNode: !!sessionData?.context?.pendingNodeId,
      pendingNodeId: sessionData?.context?.pendingNodeId,
      fullContext: sessionData?.context ? true : false,
    });

    let context: any = sessionData?.context || { vars: {} };
    if (!context.pendingNodeId) context = { vars: {} };

    context.vars.userMessage = body;
    context.vars.from = from;
    context.vars.phoneNumber = from;
    context.vars.session = wahaSession;

    const onResponse = async (message: string, mediaUrl?: string, mediaType?: string) => {
      if (message) await respond(message);
      if (mediaUrl) await respond(undefined, mediaUrl, mediaType);
    };

    // ====== Execução do fluxo ======
    if (context.pendingNodeId) {
      const pendingNode = flowData.flow_data.nodes.find((n: any) => n.id === context.pendingNodeId);
      
      // Processa resposta para reply_buttons
      if (pendingNode?.data?.type === "reply_buttons") {
        const cfg = pendingNode.data.config || {};
        const variable = cfg.variable || "button_response";
        const userResponse = (context.vars.userMessage || "").trim();
        const idx = parseInt(userResponse) - 1;

        if (idx >= 0 && idx < (cfg.buttons?.length || 0)) {
          context.vars[variable] = cfg.buttons[idx].value;
        } else {
          const m = (cfg.buttons || []).find((b: any) => b.text?.toLowerCase() === userResponse.toLowerCase());
          context.vars[variable] = m ? m.value : userResponse;
        }

        delete context.pendingNodeId;
        const selectedIndex = (cfg.buttons || []).findIndex((b: any) => b.value === context.vars[variable]);
        if (selectedIndex >= 0) {
          const handle = `button_${selectedIndex}`;
          const edge = flowData.flow_data.edges.find((e: any) => e.source === pendingNode.id && e.sourceHandle === handle);
          const nextNode = edge && flowData.flow_data.nodes.find((n: any) => n.id === edge.target);
          if (nextNode) await executeNode(nextNode, flowData.flow_data.nodes, flowData.flow_data.edges, context, onResponse);
        }
      }
      // Processa resposta para blocos ask_*
      else if (pendingNode?.data?.type?.startsWith("ask_")) {
        const cfg = pendingNode.data.config || {};
        const variable = cfg.variable || "resposta";
        const userResponse = (context.vars.userMessage || "").trim();
        
        // Salva a resposta do usuário
        context.vars[variable] = userResponse;
        delete context.pendingNodeId;
        
        // Continua para o próximo nó
        const nextEdge = flowData.flow_data.edges.find((e: any) => e.source === pendingNode.id);
        if (nextEdge) {
          const nextNode = flowData.flow_data.nodes.find((n: any) => n.id === nextEdge.target);
          if (nextNode) await executeNode(nextNode, flowData.flow_data.nodes, flowData.flow_data.edges, context, onResponse);
        }
      }
    } else {
      const startNode = flowData.flow_data.nodes.find((n: any) => n.data.type === "start");
      await executeFlow({ nodes: flowData.flow_data.nodes, edges: flowData.flow_data.edges }, context, startNode, onResponse);
    }

    // Salva contexto
    await supabase.from("chat_sessions").upsert(
      { session_id: sessionKey, context, updated_at: new Date().toISOString() },
      { onConflict: "session_id" },
    );

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ success: true, error: "processed" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/* ======= Senders ======= */

// Meta (oficial)
async function sendWhatsAppMessage(phoneNumberId: string, to: string, text: string) {
  const supabase = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
  const { data: config } = await supabase.from("whatsapp_config").select("*").limit(1).maybeSingle();
  if (!config?.business_token) return;
  const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.business_token}` },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body: text } }),
  });
  const res = await r.json().catch(() => ({}));
  if (!r.ok) console.error("Meta send error:", res);
}

async function sendWhatsAppMedia(phoneNumberId: string, to: string, mediaUrl: string, mediaType: string, caption?: string) {
  const supabase = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
  const { data: config } = await supabase.from("whatsapp_config").select("*").limit(1).maybeSingle();
  if (!config?.business_token) return;
  const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
  const typeMap: Record<string, string> = { image: "image", video: "video", audio: "audio", file: "document", document: "document" };
  const t = typeMap[(mediaType || "").toLowerCase()] || "document";
  const body: any = { messaging_product: "whatsapp", to, type: t, [t]: { link: mediaUrl } };
  if (caption && (t === "image" || t === "video" || t === "document")) body[t].caption = caption;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.business_token}` },
    body: JSON.stringify(body),
  });
  const res = await r.json().catch(() => ({}));
  if (!r.ok) console.error("Meta media error:", res);
}

/* ======= WAHA – tenta múltiplos endpoints ======= */

async function sendWahaTextMessage(toNumberOnly: string, text: string, sessionName: string, wahaUrl: string, wahaApiKey: string) {
  if (!wahaUrl || !wahaApiKey) {
    console.error("[WAHA] Missing WAHA_URL or WAHA_API_KEY");
    return;
  }
  
  const baseUrl = wahaUrl.replace(/\/$/, '');
  const chatId = toJid(toNumberOnly);
  
  // WAHA Plus official API format
  const url = `${baseUrl}/api/sendText`;
  const payload = {
    session: sessionName,
    chatId: chatId,
    text: text
  };

  try {
    console.log(`[WAHA] POST to ${url} with payload:`, JSON.stringify(payload));
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": wahaApiKey,
      },
      body: JSON.stringify(payload),
    });
    
    const result = await resp.text();
    console.log(`[WAHA] Response status: ${resp.status}, body: ${result}`);
    
    if (resp.ok) return;
  } catch (err) {
    console.error(`[WAHA] Error:`, err);
  }
  
  console.error("[WAHA] Failed to send message for session:", sessionName);
}

async function sendWahaMediaMessage(
  toNumberOnly: string,
  caption: string | undefined,
  mediaType: string,
  mediaUrl: string,
  sessionName: string,
  wahaUrl: string,
  wahaApiKey: string,
) {
  if (!wahaUrl || !wahaApiKey) {
    console.error("[WAHA] Missing WAHA_URL or WAHA_API_KEY");
    return;
  }
  const chatId = toJid(toNumberOnly);
  const t = ["image", "video", "audio", "document"].includes((mediaType || "").toLowerCase())
    ? mediaType.toLowerCase()
    : "document";

  const endpoints = [
    `${wahaUrl}/api/sessions/${sessionName}/messages`,
    `${wahaUrl}/api/sessions/${sessionName}/sendMessage`,
    `${wahaUrl}/api/sessions/${sessionName}/messages/send`,
    `${wahaUrl}/api/sessions/${sessionName}/messages/${t}`,
  ];

  const variantBase: any[] = [];
  // Common shapes
  variantBase.push({ type: t, to: chatId, [t]: { url: mediaUrl, caption } });
  variantBase.push({ chatId, type: t, [t]: { url: mediaUrl, caption } });
  variantBase.push({ jid: chatId, type: t, [t]: { url: mediaUrl, caption } });
  variantBase.push({ to: chatId, [t]: { url: mediaUrl, caption } });
  // Some builds expect simplified fields
  variantBase.push({ number: toNumberOnly, type: t, url: mediaUrl, caption });

  for (const url of endpoints) {
    for (const body of variantBase) {
      try {
        console.log(`[WAHA] Trying MEDIA(${t}) -> ${chatId} via ${url} with body keys: ${Object.keys(body).join(',')}`);
        const resp = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${wahaApiKey}`,
            "X-API-KEY": wahaApiKey,
          },
          body: JSON.stringify(body),
        });
        const result = await resp.json().catch(() => ({}));
        console.log("[WAHA] MEDIA result:", resp.status, result);
        if (resp.ok) return;
        if (resp.status === 404) break;
      } catch (err) {
        console.error("[WAHA] error sending media via", url, err);
      }
    }
  }
  console.error("[WAHA] all media endpoints/payloads failed for session:", sessionName);
}

/* ======= Engine do fluxo ======= */

async function executeFlow(
  flowData: any,
  context: any,
  startNode: any,
  onResponse: (message: string, mediaUrl?: string, mediaType?: string) => Promise<void>,
) {
  const { nodes } = flowData;
  if (!startNode) {
    startNode = nodes.find((n: any) => n.data.type === "start");
    if (!startNode) throw new Error("No start node found");
  }
  console.log(`[FLOW] Starting from node: ${startNode.id} (${startNode.data.type})`);
  await executeNode(startNode, flowData.nodes, flowData.edges, context, onResponse);
}

async function executeNode(
  node: any,
  nodes: any[],
  edges: any[],
  context: any,
  onResponse: (message: string, mediaUrl?: string, mediaType?: string) => Promise<void>,
) {
  const data = node.data;
  const cfg = data.config || {};

  const itp = (txt = "") =>
    txt.replace(/\{\{([^}]+)\}\}/g, (_, k) => {
      const key = String(k).trim();
      return context.vars[key] !== undefined ? String(context.vars[key]) : "";
    });

  const nexts = (id: string) =>
    edges
      .filter((e: any) => e.source === id)
      .map((e: any) => nodes.find((n: any) => n.id === e.target))
      .filter(Boolean);

  switch (data.type) {
    case "start": {
      for (const nx of nexts(node.id)) await executeNode(nx, nodes, edges, context, onResponse);
      break;
    }
    case "send_message": {
      if (Array.isArray(cfg.messages) && cfg.messages.length) {
        for (const m of cfg.messages) {
          const t = itp(m.text || "");
          if (t) await onResponse(t);
          await new Promise((r) => setTimeout(r, 500));
        }
      } else if (cfg.text) {
        const t = itp(cfg.text);
        if (t) await onResponse(t);
      }
      for (const nx of nexts(node.id)) await executeNode(nx, nodes, edges, context, onResponse);
      break;
    }
    case "media": {
      const url = itp(cfg.url || "");
      const cap = itp(cfg.caption || "");
      const t = cfg.mediaType || "image";
      if (url) {
        await onResponse(cap, url, t);
        await new Promise((r) => setTimeout(r, 800));
      }
      for (const nx of nexts(node.id)) await executeNode(nx, nodes, edges, context, onResponse);
      break;
    }
    case "goodbye": {
      await onResponse(itp(cfg.text || "Até logo!"));
      break;
    }
    case "ask_name":
    case "ask_question":
    case "ask_email":
    case "ask_number":
    case "ask_phone":
    case "ask_date":
    case "ask_file":
    case "ask_address":
    case "ask_url":
    case "ask_cnpj":
    case "ask_cep": {
      const q = itp(cfg.question || "Por favor, responda:");
      await onResponse(q);
      
      // Define este nó como pendente e para a execução
      context.pendingNodeId = node.id;
      
      // Salva o contexto com o nó pendente
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const sessionKey = `whatsapp_${context?.vars?.session || "default"}_${context?.vars?.from || ""}`;
      await supabase.from("chat_sessions").upsert(
        { session_id: sessionKey, context, updated_at: new Date().toISOString() },
        { onConflict: "session_id" },
      );
      return;
    }
    case "set_field": {
      const name = cfg.fieldName || "";
      const val = itp(cfg.value || "");
      if (name) context.vars[name] = val;
      for (const nx of nexts(node.id)) await executeNode(nx, nodes, edges, context, onResponse);
      break;
    }
    case "reply_buttons": {
      let txt = "Escolha uma opção:";
      if (cfg.buttons?.length) cfg.buttons.forEach((b: any, i: number) => (txt += `\n${i + 1}. ${b.text}`));
      await onResponse(txt);
      context.pendingNodeId = node.id;

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const sessionKey = `whatsapp_${context?.vars?.session || "default"}_${context?.vars?.from || ""}`;
      await supabase.from("chat_sessions").upsert(
        { session_id: sessionKey, context, updated_at: new Date().toISOString() },
        { onConflict: "session_id" },
      );
      return;
    }
    case "list_buttons": {
      let txt = itp(cfg.text || cfg.headerText || "");
      if (cfg.items?.length) {
        txt += "\n\nEscolha uma opção:";
        cfg.items.forEach((item: any, i: number) => {
          txt += `\n${i + 1}. ${item.title}${item.description ? " - " + item.description : ""}`;
        });
      }
      if (txt) await onResponse(txt);
      for (const nx of nexts(node.id)) await executeNode(nx, nodes, edges, context, onResponse);
      break;
    }
    default: {
      for (const nx of nexts(node.id)) await executeNode(nx, nodes, edges, context, onResponse);
    }
  }
}


