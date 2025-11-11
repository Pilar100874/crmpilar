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
      const fromMe = raw.payload?.fromMe || raw.data?.fromMe || raw.message?.fromMe || false;
      
      // Ignora mensagens enviadas pelo próprio bot
      if (fromMe) {
        console.log("[WAHA] Ignoring message from bot itself");
        return new Response(JSON.stringify({ success: true, ignored: "fromMe" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
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
      
      // Ignora mensagens enviadas pelo próprio bot
      if (p.fromMe) {
        console.log("[WAHA] Ignoring message from bot itself (webjs)");
        return new Response(JSON.stringify({ success: true, ignored: "fromMe" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
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
    
    // ====== Carrega fluxo ativo para a sessão ======
    let flowData = null;
    
    if (transport === "waha") {
      // Busca o estabelecimento_id da sessão
      const { data: sessionData } = await supabase
        .from("whatsapp_sessions")
        .select("estabelecimento_id")
        .eq("session_name", wahaSession)
        .maybeSingle();
      
      if (sessionData?.estabelecimento_id) {
        // Busca o bot ativo desse estabelecimento
        const { data } = await supabase
          .from("bot_flows")
          .select("*")
          .eq("active", true)
          .eq("estabelecimento_id", sessionData.estabelecimento_id)
          .maybeSingle();
        flowData = data;
      }
    } else {
      // Para Meta, busca qualquer bot ativo (comportamento antigo)
      const { data } = await supabase.from("bot_flows").select("*").eq("active", true).maybeSingle();
      flowData = data;
    }

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
    let shouldSaveContext = true;
    let shouldReturn = false;
    
    if (context.pendingNodeId) {
      const pendingNode = flowData.flow_data.nodes.find((n: any) => n.id === context.pendingNodeId);
      console.log("[FLOW] Processing pending node:", {
        pendingNodeId: context.pendingNodeId,
        foundNode: !!pendingNode,
        nodeType: pendingNode?.data?.type,
        userResponse: body
      });
      
      if (!pendingNode) {
        console.error("[FLOW] Pending node not found, resetting context");
        context = { vars: { userMessage: body, from, phoneNumber: from, session: wahaSession } };
        const startNode = flowData.flow_data.nodes.find((n: any) => n.data.type === "start");
        if (startNode) {
          await executeFlow({ nodes: flowData.flow_data.nodes, edges: flowData.flow_data.edges }, context, startNode, onResponse);
        }
        shouldSaveContext = true;
        shouldReturn = true;
      }
      // Processa resposta para reply_buttons
      else if (pendingNode?.data?.type === "reply_buttons") {
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
        const blockType = pendingNode.data.type;
        
        console.log("[FLOW] Processing ask block:", {
          blockType,
          variable,
          userResponse,
          hasConfig: !!cfg
        });
        
        // Validação baseada no tipo de bloco
        let isValid = true;
        let errorMessage = "";
        
        if (blockType === "ask_email") {
          isValid = validateEmail(userResponse);
          errorMessage = cfg.errorMessage || "Por favor, informe um email válido.";
        } else if (blockType === "ask_phone") {
          isValid = validatePhone(userResponse);
          errorMessage = cfg.errorMessage || "Por favor, informe um telefone válido.";
        } else if (blockType === "ask_cnpj") {
          isValid = validateCNPJ(userResponse);
          errorMessage = cfg.errorMessage || "Por favor, informe um CNPJ válido no formato XX.XXX.XXX/XXXX-XX.";
        } else if (blockType === "ask_cep") {
          isValid = validateCEP(userResponse);
          errorMessage = cfg.errorMessage || "Por favor, informe um CEP válido no formato XXXXX-XXX.";
        } else if (blockType === "ask_number") {
          const num = parseFloat(userResponse);
          if (isNaN(num)) {
            isValid = false;
            errorMessage = cfg.errorMessage || "Por favor, informe um número válido.";
          } else if (cfg.min !== undefined && num < cfg.min) {
            isValid = false;
            errorMessage = cfg.errorMessage || `Por favor, informe um número maior ou igual a ${cfg.min}.`;
          } else if (cfg.max !== undefined && num > cfg.max) {
            isValid = false;
            errorMessage = cfg.errorMessage || `Por favor, informe um número menor ou igual a ${cfg.max}.`;
          }
        }
        
        console.log("[FLOW] Validation result:", { isValid, blockType });
        
        if (!isValid) {
          // Validação falhou - envia mensagem de erro e mantém o nó pendente
          console.log("[FLOW] Validation failed, sending error:", errorMessage);
          await respond(errorMessage);
          // Mantém pendingNodeId para reperguntar
          shouldReturn = true;
        } else {
          // Validação passou - salva resposta e continua
          console.log("[FLOW] Validation passed, saving variable:", variable, "=", userResponse);
          context.vars[variable] = userResponse;
          
          // Para ask_cnpj, chama a API e aguarda os dados
          if (blockType === "ask_cnpj") {
            console.log("[FLOW] Calling CNPJ API...");
            await respond("Aguarde, consultando CNPJ...");
            
            try {
              const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
              const { data: cnpjData, error: cnpjError } = await supabaseClient.functions.invoke('consultar-cnpj', {
                body: { cnpj: userResponse }
              });
              
              console.log("[FLOW] CNPJ API response:", { success: !cnpjError, hasData: !!cnpjData });
              
              if (cnpjError || !cnpjData?.success) {
                console.error("[FLOW] CNPJ API error:", cnpjError);
                await respond("Erro ao consultar CNPJ. Por favor, tente novamente.");
                shouldReturn = true;
              } else {
                // Mapeia os campos do CNPJ para variáveis conforme configuração
                const cnpjInfo = cnpjData.data;
                const fieldMapping = cfg.fields || {};
                
                // Salva todas as variáveis configuradas
                for (const [apiField, varName] of Object.entries(fieldMapping)) {
                  const varNameStr = String(varName);
                  const apiFieldStr = String(apiField);
                  if (varNameStr && cnpjInfo[apiFieldStr]) {
                    context.vars[varNameStr] = cnpjInfo[apiFieldStr];
                    console.log(`[FLOW] Saved CNPJ field: ${varNameStr} = ${cnpjInfo[apiFieldStr]}`);
                  }
                }
                
                await respond("CNPJ consultado com sucesso!");
              }
            } catch (err) {
              console.error("[FLOW] CNPJ API exception:", err);
              await respond("Erro ao consultar CNPJ. Por favor, tente novamente.");
              shouldReturn = true;
            }
          }
          
          // Para ask_cep, chama a API ViaCEP e aguarda os dados
          if (blockType === "ask_cep") {
            console.log("[FLOW] Calling CEP API...");
            await respond("Aguarde, consultando CEP...");
            
            try {
              const cleanCEP = userResponse.replace(/\D/g, '');
              const cepResponse = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
              const cepData = await cepResponse.json();
              
              console.log("[FLOW] CEP API response:", { hasError: !!cepData.erro, cep: cleanCEP });
              
              if (cepData.erro) {
                await respond("CEP não encontrado. Por favor, tente novamente.");
                shouldReturn = true;
              } else {
                // Mapeia os campos do CEP para variáveis conforme configuração
                const fieldMapping = cfg.fields || {};
                
                // Salva todas as variáveis configuradas
                for (const [apiField, varName] of Object.entries(fieldMapping)) {
                  const varNameStr = String(varName);
                  const apiFieldStr = String(apiField);
                  if (varNameStr && cepData[apiFieldStr]) {
                    context.vars[varNameStr] = cepData[apiFieldStr];
                    console.log(`[FLOW] Saved CEP field: ${varNameStr} = ${cepData[apiFieldStr]}`);
                  }
                }
                
                await respond("CEP consultado com sucesso!");
              }
            } catch (err) {
              console.error("[FLOW] CEP API exception:", err);
              await respond("Erro ao consultar CEP. Por favor, tente novamente.");
              shouldReturn = true;
            }
          }
          
          // Se não houver erro, prossegue para o próximo nó
          if (!shouldReturn) {
            delete context.pendingNodeId;
            
            // Continua para o próximo nó
            const nextEdge = flowData.flow_data.edges.find((e: any) => e.source === pendingNode.id);
            console.log("[FLOW] Looking for next edge:", { hasEdge: !!nextEdge, sourceId: pendingNode.id });
            
            if (nextEdge) {
              const nextNode = flowData.flow_data.nodes.find((n: any) => n.id === nextEdge.target);
              console.log("[FLOW] Found next node:", { hasNode: !!nextNode, nodeId: nextEdge.target, nodeType: nextNode?.data?.type });
              if (nextNode) {
                await executeNode(nextNode, flowData.flow_data.nodes, flowData.flow_data.edges, context, onResponse);
              }
            } else {
              console.log("[FLOW] No next edge found, flow ends here");
            }
          }
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

/* ======= Validadores ======= */

function validateEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  const trimmedEmail = email.trim();
  if (trimmedEmail.length === 0 || trimmedEmail.length > 254) return false;
  if (trimmedEmail.startsWith(".") || trimmedEmail.endsWith(".")) return false;
  if (trimmedEmail.includes("..")) return false;
  const emailRegex = /^[a-zA-Z0-9]([a-zA-Z0-9._-]*[a-zA-Z0-9])?@[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(trimmedEmail)) return false;
  const atCount = (trimmedEmail.match(/@/g) || []).length;
  if (atCount !== 1) return false;
  const [localPart, domain] = trimmedEmail.split("@");
  if (localPart.length === 0 || localPart.length > 64) return false;
  if (domain.length === 0 || domain.length > 253) return false;
  if (!domain.includes(".")) return false;
  const domainParts = domain.split(".");
  for (const part of domainParts) {
    if (part.length === 0) return false;
    if (part.startsWith("-") || part.endsWith("-")) return false;
  }
  return true;
}

function validatePhone(phone: string): boolean {
  if (!phone || typeof phone !== "string") return false;
  const cleanPhone = phone.replace(/\D/g, "");
  if (cleanPhone.startsWith("55")) {
    return cleanPhone.length === 12 || cleanPhone.length === 13;
  }
  return cleanPhone.length >= 10 && cleanPhone.length <= 11;
}

function validateCNPJ(cnpj: string): boolean {
  const cleanCNPJ = cnpj.replace(/\D/g, "");
  if (cleanCNPJ.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cleanCNPJ)) return false;
  let length = cleanCNPJ.length - 2;
  let numbers = cleanCNPJ.substring(0, length);
  const digits = cleanCNPJ.substring(length);
  let sum = 0;
  let pos = length - 7;
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;
  length = length + 1;
  numbers = cleanCNPJ.substring(0, length);
  sum = 0;
  pos = length - 7;
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;
  return true;
}

function validateCEP(cep: string): boolean {
  const cleanCEP = cep.replace(/\D/g, "");
  return cleanCEP.length === 8;
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


