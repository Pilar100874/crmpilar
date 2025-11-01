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

  // GET = verificação / healthcheck
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    const verifyToken = Deno.env.get("WHATSAPP_VERIFY_TOKEN") || "conversa_botique_verify";

    // Verificação Meta (WhatsApp Cloud API)
    if (mode === "subscribe" && token === verifyToken && challenge) {
      console.log("Webhook verified (Meta)");
      return new Response(challenge, { status: 200, headers: corsHeaders });
    }

    // Healthcheck genérico
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
    let phoneNumberId = ""; // Meta Graph API phone_number_id
    let transport: "twilio" | "meta" | "waha" = "meta";
    let wahaSession = "";

    // 1. Twilio (form-urlencoded)
    if (contentType.includes("application/x-www-form-urlencoded")) {
      isTwilio = true;
      transport = "twilio";
      const formData = await req.formData();
      from = ((formData.get("From") as string) || "").replace("whatsapp:", "");
      body = (formData.get("Body") as string) || "";
      console.log("Received Twilio webhook:", { from, body });
    } else {
      // 2. JSON: pode ser Meta oficial OU WAHA
      const raw: any = await req.json().catch(() => ({}));
      console.log("Received JSON webhook:", JSON.stringify(raw, null, 2));

      // --- tentar identificar WAHA primeiro ---
      // Padrão A: { event: 'message', data: { from, text }, session: '...' }
      let isWaha = false;
      if ((raw?.event === "message" || raw?.type === "message") && (raw?.data || raw?.message)) {
        isWaha = true;
        transport = "waha";
        from = String(raw.data?.from || raw.message?.from || raw.from || "").replace(/\D/g, ""); // só números
        body =
          raw.data?.text || raw.message?.text || raw.data?.message?.conversation || raw.message?.conversation || "";
        wahaSession = String(
          raw.session || raw.sessionId || raw.instanceId || raw.instance?.name || raw.instance || "",
        );
      }

      // Padrão B WAHA (baileys-like): { messages: [ { key: { remoteJid }, message: {...} } ] }
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
        wahaSession = String(raw.session || raw.instanceId || raw.instance?.name || "");
      }

      // Se NÃO for WAHA, então é Meta oficial (Cloud API)
      if (!isWaha) {
        const payload: WhatsAppWebhookPayload = raw;
        console.log("Received WhatsApp (Meta) webhook:", JSON.stringify(payload, null, 2));

        if (!payload.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
          console.log("No message in webhook");
          return new Response(JSON.stringify({ success: true }), {
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          });
        }

        const messageData = payload.entry[0].changes[0].value.messages[0];
        from = messageData.from;
        body = messageData.text?.body || "";
        phoneNumberId = payload.entry[0].changes[0].value.metadata.phone_number_id;
        transport = "meta";
      }
    }

    console.log("Processed message:", {
      from,
      body,
      phoneNumberId,
      transport,
      wahaSession,
      isTwilio,
    });

    // fallback: se o WAHA não mandou nome da sessão, força sua sessão "Pilar"
    if (transport === "waha" && !wahaSession) {
      wahaSession = "Pilar";
    }

    // ------------------------------------------------------------------
    // 3. FLUXO / BOT
    // carrega o fluxo ativo do banco
    const { data: flowData, error: flowError } = await supabase
      .from("bot_flows")
      .select("*")
      .eq("active", true)
      .maybeSingle();

    if (flowError || !flowData) {
      console.log("No active flow found, using default response");

      // Sem flow configurado: manda uma resposta default
      if (transport === "twilio") {
        await sendTwilioMessage(from, "Bot sem fluxo ativo 🙃");
      } else if (transport === "waha") {
        // responde via WAHA (texto)
        await sendWahaTextMessage(from, "Bot sem fluxo ativo 🙃", wahaSession);
      } else {
        // Meta oficial
        await sendWhatsAppMessage(
          phoneNumberId,
          from,
          "Olá! Nenhum fluxo ativo encontrado. Configure um bot no painel.",
        );
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    console.log("Active bot found:", flowData.name);

    // 4. sessão no banco
    const sessionId = `whatsapp_${from}`;
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

    // conversa nova? reseta contexto
    if (!context.pendingNodeId) {
      console.log("Fresh conversation start - resetting context");
      context = { vars: {} };
    } else {
      console.log("[SESSION] Resuming from pending node:", context.pendingNodeId);
    }

    context.vars.userMessage = body;
    context.vars.from = from;
    context.vars.phoneNumber = from;

    console.log("Context state:", {
      pendingNodeId: context.pendingNodeId,
      isResuming: context.isResuming,
      hasVars: !!context.vars,
    });

    // 5. Executar o fluxo
    const responses: string[] = [];

    // Função util interna pra mandar a resposta PRA PESSOA CERTA dependendo do canal
    const deliverResponse = async (message: string, mediaUrl?: string, mediaType?: string) => {
      responses.push(message);

      if (transport === "twilio") {
        // Twilio
        if (mediaUrl) {
          await sendTwilioMessage(from, message || "", mediaUrl);
        } else if (message) {
          await sendTwilioMessage(from, message);
        }
        return;
      }

      if (transport === "waha") {
        // WAHA (se veio do seu bot WAHA)
        if (mediaUrl && mediaType === "image") {
          await sendWahaImageMessage(from, mediaUrl, message, wahaSession);
        } else if (message) {
          await sendWahaTextMessage(from, message, wahaSession);
        }
        return;
      }

      // Meta oficial (WhatsApp Cloud API)
      if (mediaUrl && mediaType) {
        await sendWhatsAppMedia(phoneNumberId, from, mediaUrl, mediaType, message);
      } else if (message) {
        await sendWhatsAppMessage(phoneNumberId, from, message);
      }
    };

    if (context.pendingNodeId) {
      // retomando nó pendente (ex: botões)
      console.log("Resuming from pending button node:", context.pendingNodeId);

      const pendingNode = flowData.flow_data.nodes.find((n: any) => n.id === context.pendingNodeId);
      if (pendingNode && pendingNode.data.type === "reply_buttons") {
        const config = pendingNode.data.config || {};
        const variable = config.variable || "button_response";

        // interpretar resposta do usuário
        const userResponse = context.vars.userMessage?.trim() || "";
        const buttonIndex = parseInt(userResponse) - 1;

        if (buttonIndex >= 0 && buttonIndex < (config.buttons?.length || 0)) {
          context.vars[variable] = config.buttons[buttonIndex].value;
          console.log(`Button selected: ${config.buttons[buttonIndex].value}`);
        } else {
          const matchedButton = config.buttons?.find(
            (btn: any) => btn.text?.toLowerCase() === userResponse.toLowerCase(),
          );
          context.vars[variable] = matchedButton ? matchedButton.value : userResponse;
        }

        // limpa pendência
        delete context.pendingNodeId;

        // segue pro próximo nó específico dessa escolha
        const selectedButtonIndex = config.buttons?.findIndex((btn: any) => btn.value === context.vars[variable]);

        if (selectedButtonIndex !== undefined && selectedButtonIndex >= 0) {
          const buttonHandle = `button_${selectedButtonIndex}`;
          const matchingEdge = flowData.flow_data.edges.find(
            (e: any) => e.source === pendingNode.id && e.sourceHandle === buttonHandle,
          );

          if (matchingEdge) {
            const nextNode = flowData.flow_data.nodes.find((n: any) => n.id === matchingEdge.target);
            if (nextNode) {
              console.log(`Executing next node: ${nextNode.id} (${nextNode.data.type})`);
              await executeNode(nextNode, flowData.flow_data.nodes, flowData.flow_data.edges, context, deliverResponse);
            }
          }
        }
      }
    } else {
      // conversa nova -> roda fluxo normal
      console.log("Starting fresh flow");
      const startNode = flowData.flow_data.nodes.find((n: any) => n.data.type === "start");

      await executeFlow(
        { nodes: flowData.flow_data.nodes, edges: flowData.flow_data.edges },
        context,
        startNode,
        deliverResponse,
      );
    }

    // Se NÃO estamos aguardando botão, salva contexto atualizado
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

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing webhook:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// -----------------
// Envio Twilio
// -----------------
async function sendTwilioMessage(to: string, text: string, mediaUrl?: string) {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const twilioNumber = Deno.env.get("TWILIO_WHATSAPP_NUMBER") || "+14155238886";

  if (!accountSid || !authToken) {
    console.log("Twilio not configured");
    return;
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    const formData = new URLSearchParams();
    formData.append("From", `whatsapp:${twilioNumber}`);
    formData.append("To", `whatsapp:${to}`);
    formData.append("Body", text || " ");

    if (mediaUrl) {
      formData.append("MediaUrl", mediaUrl);
      console.log("Sending media:", mediaUrl);
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData,
    });

    const result = await response.json();
    console.log("Twilio message sent:", result);

    if (!response.ok) {
      console.error("Twilio API error:", result);
    }
  } catch (error) {
    console.error("Error sending Twilio message:", error);
  }
}

// -----------------
// Envio via Meta Cloud API oficial
// -----------------
async function sendWhatsAppMessage(phoneNumberId: string, to: string, text: string) {
  const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

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

// -----------------
// Envio via Meta Cloud API para mídia
// -----------------
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

// -----------------
// Envio via WAHA (TEXTO)
// -----------------
async function sendWahaTextMessage(toNumberOnly: string, text: string, sessionName: string) {
  try {
    // WAHA normalmente exige o formato chatId = "<numero>@c.us"
    const chatId = `${toNumberOnly}@c.us`;

    // TODO: se sua API WAHA não usa Bearer e sim X-Api-Key, ajuste headers abaixo
    const response = await fetch(`https://waha.pilar.com.br/api/sessions/${sessionName}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer Ceotto2468",
      },
      body: JSON.stringify({
        type: "text",
        to: chatId,
        text: text,
      }),
    });

    const result = await response.json().catch(() => ({}));
    console.log("WAHA text sent:", result);

    if (!response.ok) {
      console.error("WAHA API error (text):", result);
    }
  } catch (error) {
    console.error("Error sending WAHA text:", error);
  }
}

// -----------------
// Envio via WAHA (IMAGEM)
// -----------------
async function sendWahaImageMessage(toNumberOnly: string, imageUrl: string, caption: string, sessionName: string) {
  try {
    const chatId = `${toNumberOnly}@c.us`;

    // TODO: confirme se sua rota aceita "type: image" com { url, caption }
    // Algumas builds usam {image:{url:'...',caption:'...'}} em vez de {imageUrl:'...'}
    const response = await fetch(`https://waha.pilar.com.br/api/sessions/${sessionName}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer Ceotto2468",
      },
      body: JSON.stringify({
        type: "image",
        to: chatId,
        image: {
          url: imageUrl,
          caption: caption || "",
        },
      }),
    });

    const result = await response.json().catch(() => ({}));
    console.log("WAHA image sent:", result);

    if (!response.ok) {
      console.error("WAHA API error (image):", result);
    }
  } catch (error) {
    console.error("Error sending WAHA image:", error);
  }
}

// -----------------
// Flow executor (igual ao seu, só passando deliverResponse)
// -----------------
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

      // grava a última mensagem do user naquela variável
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

      // monta texto de botões como lista numerada simples
      let buttonText = "Escolha uma opção:";
      if (config.buttons && config.buttons.length > 0) {
        config.buttons.forEach((btn: any, idx: number) => {
          buttonText += `\n${idx + 1}. ${btn.text}`;
        });
      }

      await onResponse(buttonText);

      // marca conversa como "aguardando escolha"
      context.pendingNodeId = node.id;
      console.log(`[BUTTON] Setting pendingNodeId to: ${node.id}`);

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      );

      const sessionId = `whatsapp_${context.vars.from}`;
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
      return;
    }

    case "list_buttons": {
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

    default: {
      console.log(`Node type ${data.type} - passing through`);
      const nextNodes = getNextNodes(node.id);
      for (const next of nextNodes) {
        await executeNode(next, nodes, edges, context, onResponse);
      }
    }
  }
}
