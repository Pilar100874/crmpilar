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
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          text?: { body: string };
          type: string;
        }>;
      };
      field: string;
    }>;
  }>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Handle GET request for webhook verification
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    const verifyToken = Deno.env.get("WHATSAPP_VERIFY_TOKEN") || "conversa_botique_verify";

    // Meta (WhatsApp Business API) verification flow
    if (mode === "subscribe" && token === verifyToken && challenge) {
      console.log("Webhook verified (Meta)");
      return new Response(challenge, { status: 200, headers: corsHeaders });
    }

    // Generic healthcheck (e.g., WAHA workers ping this endpoint)
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

    const contentType = req.headers.get("content-type") || "";
    let from = "";
    let body = "";
    let isTwilio = false;
    let phoneNumberId = ""; // Meta Graph API phone number id
    let transport: "meta" | "waha" = "meta";
    let wahaSession = "";

    // Check if it's Twilio (form data) or WhatsApp Business API (JSON)
    if (false /* Twilio disabled */) {
      // Twilio Sandbox format
      isTwilio = true;
      transport = "twilio";
      const formData = await req.formData();
      from = ((formData.get("From") as string) || "").replace("whatsapp:", "");
      body = (formData.get("Body") as string) || "";
      console.log("Received Twilio webhook:", { from, body });
    } else {
      // JSON payload: could be Meta (Graph) OR WAHA (Baileys)
      const raw: any = await req.json().catch(() => ({}));
      console.log("Received JSON webhook:", JSON.stringify(raw, null, 2));

      // Try to detect WAHA/BAILEYS style first
      let isWaha = false;
      // Case A: { event: 'message', data: { from, text }, session: '...' }
      if ((raw?.event === "message" || raw?.type === "message") && (raw?.data || raw?.message)) {
        isWaha = true;
        transport = "waha";
        from = String(raw.data?.from || raw.message?.from || raw.from || "").replace(/[@\D]/g, "");
        body =
          raw.data?.text || raw.message?.text || raw.data?.message?.conversation || raw.message?.conversation || "";
        wahaSession = String(
          raw.data?.session || raw.data?.sessionId || raw.session || raw.sessionId || raw.instanceId || raw.instance?.name || raw.instance || "default",
        );
      }
      // Case B: { messages: [ { key: { remoteJid }, message: { conversation | extendedTextMessage.text } } ] }
      if (!isWaha && Array.isArray(raw?.messages) && raw.messages[0]?.key) {
        isWaha = true;
        transport = "waha";
        const msg0 = raw.messages[0];
        const remote = msg0.key?.remoteJid || "";
        from = String(remote).split("@")[0].replace(/\D/g, "");
        body =
          msg0.message?.conversation ||
          msg0.message?.extendedTextMessage?.text ||
          msg0.message?.imageMessage?.caption ||
          "";
        wahaSession = String(raw.data?.session || raw.data?.sessionId || raw.session || raw.sessionId || raw.instanceId || raw.instance?.name || "default");
      }

      // Log WAHA message received
      if (isWaha) {
        console.log("[WAHA] Message received:", { sessionName: wahaSession, fromNumber: from, text: body });
      }

      if (!isWaha) {
        // WhatsApp Business API (Meta) format
        const payload: WhatsAppWebhookPayload = raw;
        console.log("Received WhatsApp (Meta) webhook:", JSON.stringify(payload, null, 2));

        if (!payload.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
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
    }

    console.log("Processed message:", { from, body, phoneNumberId, isTwilio });

    // Load active bot flow from database
    const { data: flowData, error: flowError } = await supabase
      .from("bot_flows")
      .select("*")
      .eq("active", true)
      .maybeSingle();

    if (flowError || !flowData) {
      console.log("No active flow found, using default response");

      await sendWhatsAppMessage(phoneNumberId, from, "Olá! Nenhum fluxo ativo encontrado. Configure um bot no painel.");

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Active bot found:", flowData.name);

    // Get or create session context
    const sessionPart = transport === "waha" ? (wahaSession || "default") : "meta";
    const sessionId = `whatsapp_${sessionPart}_${from}`;
    console.log("[SESSION] Looking for session:", sessionId);

    const { data: sessionData } = await supabase
      .from("chat_sessions")
      .select("*")
      .eq("session_id", sessionId)
      .maybeSingle();

    console.log("[SESSION] Session data found:", {
      exists: !!sessionData,
      hasPendingNode: !!sessionData?.context?.pendingNodeId,
      pendingNodeId: sessionData?.context?.pendingNodeId,
      fullContext: JSON.stringify(sessionData?.context),
    });

    let context = sessionData?.context || { vars: {} };

    // If no pending node, this is a fresh start - reset context
    if (!context.pendingNodeId) {
      console.log("Fresh conversation start - resetting context");
      context = { vars: {} };
    } else {
      console.log("[SESSION] Resuming from pending node:", context.pendingNodeId);
    }

    context.vars.userMessage = body;
    context.vars.from = from;
    context.vars.phoneNumber = from;
    if (wahaSession) context.vars.sessionName = wahaSession;

    console.log("Context state:", {
      pendingNodeId: context.pendingNodeId,
      isResuming: context.isResuming,
      hasVars: !!context.vars,
    });

    // Execute flow
    const responses: string[] = [];

    if (context.pendingNodeId) {
      // Resuming from a pending button node - process only that node
      console.log("Resuming from pending button node:", context.pendingNodeId);

      const pendingNode = flowData.flow_data.nodes.find((n: any) => n.id === context.pendingNodeId);
      if (pendingNode && pendingNode.data.type === "reply_buttons") {
        const config = pendingNode.data.config || {};
        const variable = config.variable || "button_response";

        // Process user's button selection
        const userResponse = context.vars.userMessage?.trim() || "";
        const buttonIndex = parseInt(userResponse) - 1;

        if (buttonIndex >= 0 && buttonIndex < config.buttons.length) {
          context.vars[variable] = config.buttons[buttonIndex].value;
          console.log(`Button selected: ${config.buttons[buttonIndex].value}`);
        } else {
          const matchedButton = config.buttons.find(
            (btn: any) => btn.text.toLowerCase() === userResponse.toLowerCase(),
          );
          context.vars[variable] = matchedButton ? matchedButton.value : userResponse;
        }

        // Clear pending state
        delete context.pendingNodeId;

        // Find and execute ONLY the next node based on button selection
        const selectedButtonIndex = config.buttons.findIndex((btn: any) => btn.value === context.vars[variable]);

        if (selectedButtonIndex >= 0) {
          const buttonHandle = `button_${selectedButtonIndex}`;
          const matchingEdge = flowData.flow_data.edges.find(
            (e: any) => e.source === pendingNode.id && e.sourceHandle === buttonHandle,
          );

          if (matchingEdge) {
            const nextNode = flowData.flow_data.nodes.find((n: any) => n.id === matchingEdge.target);
            if (nextNode) {
              console.log(`Executing next node: ${nextNode.id} (${nextNode.data.type})`);
              await executeNode(
                nextNode,
                flowData.flow_data.nodes,
                flowData.flow_data.edges,
                context,
                async (message: string, mediaUrl?: string, mediaType?: string) => {
                  responses.push(message);
                  if (transport === "twilio") {
                    if (mediaUrl) {
                      await sendTwilioMessage(from, message || "", mediaUrl);
                    } else if (message) {
                      await sendTwilioMessage(from, message);
                    }
                  } else if (transport === "waha") {
                    if (mediaUrl && mediaType) {
                      await sendWahaMediaMessage(from, mediaUrl, mediaType, message, wahaSession);
                    } else if (message) {
                      await sendWahaTextMessage(from, message, wahaSession);
                    }
                  } else {
                    if (mediaUrl && mediaType) {
                      await sendWhatsAppMedia(phoneNumberId, from, mediaUrl, mediaType, message);
                    } else if (message) {
                      await sendWhatsAppMessage(phoneNumberId, from, message);
                    }
                  }
                },
              );
            }
          }
        }
      }
    } else {
      // Fresh start - execute full flow
      console.log("Starting fresh flow");
      const startNode = flowData.flow_data.nodes.find((n: any) => n.data.type === "start");

      await executeFlow(
        { nodes: flowData.flow_data.nodes, edges: flowData.flow_data.edges },
        context,
        startNode,
        async (message: string, mediaUrl?: string, mediaType?: string) => {
          responses.push(message);
          if (transport === "twilio") {
            if (mediaUrl) {
              await sendTwilioMessage(from, message || "", mediaUrl);
            } else if (message) {
              await sendTwilioMessage(from, message);
            }
           } else if (transport === "waha") {
             if (mediaUrl && mediaType) {
               await sendWahaMediaMessage(from, mediaUrl, mediaType, message, wahaSession);
             } else if (message) {
               await sendWahaTextMessage(from, message, wahaSession);
             }
           } else {
             if (mediaUrl && mediaType) {
               await sendWhatsAppMedia(phoneNumberId, from, mediaUrl, mediaType, message);
             } else if (message) {
               await sendWhatsAppMessage(phoneNumberId, from, message);
             }
           }
        },
      );
    }

    // Save session only if not already saved by a node (e.g., reply_buttons)
    if (!context.pendingNodeId) {
      await supabase.from("chat_sessions").upsert(
        {
          session_id: sessionId,
          context: context,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "session_id",
        },
      );
    }

    // SEMPRE retornar 200 OK para evitar reenvios do WAHA
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing webhook:", error);
    // SEMPRE retornar 200 mesmo com erro para evitar reenvios do WAHA
    return new Response(JSON.stringify({ success: true, error: "processed" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Twilio support removed from this endpoint (stub to satisfy types)
async function sendTwilioMessage(to: string, text: string, mediaUrl?: string) { return; }

async function sendWhatsAppMessage(phoneNumberId: string, to: string, text: string) {
  const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

  // Get WhatsApp config
  const { data: config } = await supabase.from("whatsapp_config").select("*").limit(1).maybeSingle();

  if (!config || !config.business_token) {
    console.log("WhatsApp not configured");
    return;
  }

  try {
    const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.business_token}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: to,
        type: "text",
        text: { body: text },
      }),
    });

    const result = await response.json();
    console.log("WhatsApp message sent:", result);

    if (!response.ok) {
      console.error("WhatsApp API error:", result);
    }
  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
  }
}

async function sendWahaMediaMessage(
  toNumberOnly: string,
  mediaUrl: string,
  mediaType: string,
  caption: string | undefined,
  sessionName: string,
) {
  const wahaUrl = Deno.env.get("WAHA_URL") || "";
  const wahaApiKey = Deno.env.get("WAHA_API_KEY") || "";
  const chatId = `${toNumberOnly}@c.us`;

  if (!wahaUrl || !wahaApiKey) {
    console.error("[WAHA] Missing WAHA_URL or WAHA_API_KEY env vars");
    return;
  }

  try {
    const url = `${wahaUrl}/api/sessions/${sessionName}/messages`;
    console.log(`[WAHA] Sending media to ${chatId} via session ${sessionName}`);

    const type = mediaType?.toLowerCase();
    let payload: any = { type: "text", to: chatId, text: caption || "" };

    if (type === "image") {
      payload = {
        type: "image",
        to: chatId,
        image: { url: mediaUrl, caption: caption || undefined },
      };
    } else if (type === "video") {
      payload = { type: "video", to: chatId, video: { url: mediaUrl, caption: caption || undefined } };
    } else if (type === "audio") {
      payload = { type: "audio", to: chatId, audio: { url: mediaUrl } };
    } else if (type === "document") {
      const fileName = mediaUrl.split("/").pop() || "document";
      payload = { type: "document", to: chatId, document: { url: mediaUrl, fileName } };
    } else {
      // Fallback: send link as text
      payload = { type: "text", to: chatId, text: `${caption ? caption + "\n" : ""}${mediaUrl}` };
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${wahaApiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json().catch(() => ({ status: response.status }));
    console.log(`[WAHA] Media sent:`, { sessionName, to: chatId, statusCode: response.status, result });

    if (!response.ok) {
      console.error(`[WAHA] Failed to send media:`, result);
    }
  } catch (error) {
    console.error(`[WAHA] Error sending media:`, error);
  }
}

async function sendWahaTextMessage(toNumberOnly: string, text: string, sessionName: string) {
  const wahaUrl = Deno.env.get("WAHA_URL") || "";
  const wahaApiKey = Deno.env.get("WAHA_API_KEY") || "";
  const chatId = `${toNumberOnly}@c.us`;


  try {
    const url = `${wahaUrl}/api/sessions/${sessionName}/messages`;
    console.log(`[WAHA] Sending text to ${chatId} via session ${sessionName}`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${wahaApiKey}`,
      },
      body: JSON.stringify({
        type: "text",
        to: chatId,
        text: text,
      }),
    });

    const result = await response.json().catch(() => ({ status: response.status }));
    console.log(`[WAHA] Text sent:`, { sessionName, to: chatId, statusCode: response.status });

    if (!response.ok) {
      console.error(`[WAHA] Failed to send text:`, result);
    }
  } catch (error) {
    console.error(`[WAHA] Error sending text:`, error);
  }
}

async function sendWhatsAppMedia(
  phoneNumberId: string,
  to: string,
  mediaUrl: string,
  mediaType: string,
  caption?: string,
) {
  const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

  const { data: config } = await supabase.from("whatsapp_config").select("*").limit(1).maybeSingle();

  if (!config || !config.business_token) {
    console.log("WhatsApp not configured");
    return;
  }

  try {
    const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

    const typeMap: Record<string, string> = {
      image: "image",
      video: "video",
      audio: "audio",
      file: "document",
    };

    const whatsappType = typeMap[mediaType] || "document";

    const body: any = {
      messaging_product: "whatsapp",
      to: to,
      type: whatsappType,
      [whatsappType]: {
        link: mediaUrl,
      },
    };

    if (caption && (whatsappType === "image" || whatsappType === "video" || whatsappType === "document")) {
      body[whatsappType].caption = caption;
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.business_token}`,
      },
      body: JSON.stringify(body),
    });

    const result = await response.json();
    console.log("WhatsApp media sent:", result);

    if (!response.ok) {
      console.error("WhatsApp API error:", result);
    }
  } catch (error) {
    console.error("Error sending WhatsApp media:", error);
  }
}

async function executeFlow(
  flowData: any,
  context: any,
  startNode: any,
  onResponse: (message: string, mediaUrl?: string, mediaType?: string) => Promise<void>,
) {
  const { nodes, edges } = flowData;

  if (!startNode) {
    startNode = nodes.find((n: any) => n.data.type === "start");
    if (!startNode) {
      throw new Error("No start node found");
    }
  }

  console.log(`[FLOW] Starting from node: ${startNode.id} (${startNode.data.type}), isResuming: ${context.isResuming}`);
  await executeNode(startNode, nodes, edges, context, onResponse);
}

async function executeNode(
  node: any,
  nodes: any[],
  edges: any[],
  context: any,
  onResponse: (message: string, mediaUrl?: string, mediaType?: string) => Promise<void>,
) {
  const data = node.data;
  const config = data.config || {};
  console.log(`Executing node: ${data.type}, Node ID: ${node.id}`);

  const interpolate = (text: string): string => {
    if (!text) return "";
    return text.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
      const trimmedKey = key.trim();
      return context.vars[trimmedKey] !== undefined ? String(context.vars[trimmedKey]) : "";
    });
  };

  const getNextNodes = (currentNodeId: string) => {
    const outgoingEdges = edges.filter((e: any) => e.source === currentNodeId);
    return outgoingEdges.map((e: any) => nodes.find((n: any) => n.id === e.target)).filter(Boolean);
  };

  switch (data.type) {
    case "start": {
      const nextNodes = getNextNodes(node.id);
      for (const next of nextNodes) {
        await executeNode(next, nodes, edges, context, onResponse);
      }
      break;
    }

    case "send_message": {
      const messages = config.messages || [];
      if (messages.length > 0) {
        for (const msg of messages) {
          const text = interpolate(msg.text || "");
          if (text) {
            await onResponse(text);
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        }
      } else if (config.text) {
        const text = interpolate(config.text);
        if (text) {
          await onResponse(text);
        }
      }

      const nextNodes = getNextNodes(node.id);
      for (const next of nextNodes) {
        await executeNode(next, nodes, edges, context, onResponse);
      }
      break;
    }

    case "media": {
      const mediaUrl = interpolate(config.url || "");
      const caption = interpolate(config.caption || "");
      const mediaType = config.mediaType || "image";

      if (mediaUrl) {
        await onResponse(caption, mediaUrl, mediaType);
        // Aguardar 1 segundo para garantir que a mídia seja enviada antes dos próximos nós
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      const nextNodes = getNextNodes(node.id);
      for (const next of nextNodes) {
        await executeNode(next, nodes, edges, context, onResponse);
      }
      break;
    }

    case "goodbye": {
      const text = interpolate(config.text || "Até logo!");
      await onResponse(text);
      // Don't continue to next nodes - end conversation
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
    case "ask_url": {
      const question = interpolate(config.question || "Por favor, responda:");
      const variable = config.variable || "resposta";

      await onResponse(question);

      // Save user message to variable
      if (context.vars.userMessage) {
        context.vars[variable] = context.vars.userMessage;
      }

      const nextNodes = getNextNodes(node.id);
      for (const next of nextNodes) {
        await executeNode(next, nodes, edges, context, onResponse);
      }
      break;
    }

    case "set_field": {
      const fieldName = config.fieldName || "";
      const value = interpolate(config.value || "");

      if (fieldName) {
        context.vars[fieldName] = value;
        console.log(`Set variable: ${fieldName} = ${value}`);
      }

      const nextNodes = getNextNodes(node.id);
      for (const next of nextNodes) {
        await executeNode(next, nodes, edges, context, onResponse);
      }
      break;
    }

    case "reply_buttons": {
      const variable = config.variable || "button_response";

      // Send buttons and wait for response
      let buttonText = "Escolha uma opção:";
      if (config.buttons && config.buttons.length > 0) {
        config.buttons.forEach((btn: any, idx: number) => {
          buttonText += `\n${idx + 1}. ${btn.text}`;
        });
      }

      await onResponse(buttonText);

      // Mark as pending and SAVE IMMEDIATELY before stopping execution
      context.pendingNodeId = node.id;
      console.log(`[BUTTON] Setting pendingNodeId to: ${node.id}`);

      // Save session immediately with pending state
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      );

      const sessionPart = context.vars.sessionName || "meta";
      const sessionId = `whatsapp_${sessionPart}_${context.vars.from}`;
      await supabase.from("chat_sessions").upsert(
        {
          session_id: sessionId,
          context: context,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "session_id",
        },
      );

      console.log(`[BUTTON] Session saved with pendingNodeId: ${node.id}`);
      return; // Stop here and wait for user response
    }

    case "list_buttons": {
      // Send text message with list items as simple text
      let listText = interpolate(config.text || config.headerText || "");
      if (config.items && config.items.length > 0) {
        listText += "\n\nEscolha uma opção:";
        config.items.forEach((item: any, idx: number) => {
          listText += `\n${idx + 1}. ${item.title}`;
          if (item.description) {
            listText += ` - ${item.description}`;
          }
        });
      }

      if (listText) {
        await onResponse(listText);
      }

      const nextNodes = getNextNodes(node.id);
      for (const next of nextNodes) {
        await executeNode(next, nodes, edges, context, onResponse);
      }
      break;
    }

    default:
      console.log(`Node type ${data.type} - passing through`);
      const nextNodes = getNextNodes(node.id);
      for (const next of nextNodes) {
        await executeNode(next, nodes, edges, context, onResponse);
      }
  }
}
