import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

    if (mode === "subscribe" && token === verifyToken) {
      console.log("Webhook verified");
      return new Response(challenge, { status: 200 });
    }

    return new Response("Forbidden", { status: 403 });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const contentType = req.headers.get("content-type") || "";
    let from = "";
    let body = "";
    let isTwilio = false;
    let phoneNumberId = "";

    // Check if it's Twilio (form data) or WhatsApp Business API (JSON)
    if (contentType.includes("application/x-www-form-urlencoded")) {
      // Twilio Sandbox format
      isTwilio = true;
      const formData = await req.formData();
      from = (formData.get("From") as string || "").replace("whatsapp:", "");
      body = formData.get("Body") as string || "";
      console.log("Received Twilio webhook:", { from, body });
    } else {
      // WhatsApp Business API format
      const payload: WhatsAppWebhookPayload = await req.json();
      console.log("Received WhatsApp webhook:", JSON.stringify(payload, null, 2));

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
    const sessionId = `whatsapp_${from}`;
    const { data: sessionData } = await supabase
      .from("chat_sessions")
      .select("*")
      .eq("session_id", sessionId)
      .maybeSingle();

    const context = sessionData?.context || { vars: {} };
    context.vars.userMessage = body;
    context.vars.from = from;
    context.vars.phoneNumber = from;

    // Execute flow
    const responses: string[] = [];
    
    // Check if there's a pending node (waiting for button response)
    let startNode = flowData.flow_data.nodes.find((n: any) => n.data.type === "start");
    let isResuming = false;
    
    if (context.pendingNodeId) {
      // Resume from the pending node
      const pendingNode = flowData.flow_data.nodes.find((n: any) => n.id === context.pendingNodeId);
      if (pendingNode) {
        console.log("Resuming from pending node:", pendingNode.id);
        startNode = pendingNode;
        isResuming = true;
        // Mark context as resuming so nodes know not to re-execute
        context.isResuming = true;
      }
    }
    
    await executeFlow(
      { nodes: flowData.flow_data.nodes, edges: flowData.flow_data.edges },
      context,
      startNode,
      async (message: string, mediaUrl?: string, mediaType?: string) => {
        responses.push(message);
        if (isTwilio) {
          // Send via Twilio
          if (mediaUrl) {
            await sendTwilioMessage(from, message || "", mediaUrl);
          } else if (message) {
            await sendTwilioMessage(from, message);
          }
        } else {
          // Send via WhatsApp Business API
          if (mediaUrl && mediaType) {
            await sendWhatsAppMedia(phoneNumberId, from, mediaUrl, mediaType, message);
          } else if (message) {
            await sendWhatsAppMessage(phoneNumberId, from, message);
          }
        }
      }
    );
    
    // Clean up resuming flag
    delete context.isResuming;

    // Save session
    await supabase.from("chat_sessions").upsert({
      session_id: sessionId,
      context: context,
      updated_at: new Date().toISOString(),
    });

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
    
    // Add media if provided
    if (mediaUrl) {
      formData.append("MediaUrl", mediaUrl);
      console.log("Sending media:", mediaUrl);
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${btoa(`${accountSid}:${authToken}`)}`,
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

async function sendWhatsAppMessage(
  phoneNumberId: string,
  to: string,
  text: string
) {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  // Get WhatsApp config
  const { data: config } = await supabase
    .from("whatsapp_config")
    .select("*")
    .limit(1)
    .maybeSingle();

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

async function sendWhatsAppMedia(
  phoneNumberId: string,
  to: string,
  mediaUrl: string,
  mediaType: string,
  caption?: string
) {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const { data: config } = await supabase
    .from("whatsapp_config")
    .select("*")
    .limit(1)
    .maybeSingle();

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
  onResponse: (message: string, mediaUrl?: string, mediaType?: string) => Promise<void>
) {
  const { nodes, edges } = flowData;

  if (!startNode) {
    startNode = nodes.find((n: any) => n.data.type === "start");
    if (!startNode) {
      throw new Error("No start node found");
    }
  }

  await executeNode(startNode, nodes, edges, context, onResponse);
}

async function executeNode(
  node: any,
  nodes: any[],
  edges: any[],
  context: any,
  onResponse: (message: string, mediaUrl?: string, mediaType?: string) => Promise<void>
) {
  const data = node.data;
  const config = data.config || {};
  console.log(`Executing node: ${data.type}`, config);

  const interpolate = (text: string): string => {
    if (!text) return "";
    return text.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
      const trimmedKey = key.trim();
      return context.vars[trimmedKey] !== undefined ? String(context.vars[trimmedKey]) : "";
    });
  };

  const getNextNodes = (currentNodeId: string) => {
    const outgoingEdges = edges.filter((e: any) => e.source === currentNodeId);
    return outgoingEdges
      .map((e: any) => nodes.find((n: any) => n.id === e.target))
      .filter(Boolean);
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
            // Small delay between messages
            await new Promise(resolve => setTimeout(resolve, 500));
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
      console.log(`[MEDIA NODE] Starting execution - Node ID: ${node.id}`);
      const mediaUrl = interpolate(config.url || "");
      const caption = interpolate(config.caption || "");
      const mediaType = config.mediaType || "image";
      
      console.log(`[MEDIA NODE] URL: ${mediaUrl}, Caption: ${caption}, Type: ${mediaType}`);
      
      if (mediaUrl) {
        console.log(`[MEDIA NODE] Sending media via onResponse`);
        await onResponse(caption, mediaUrl, mediaType);
        console.log(`[MEDIA NODE] Media sent successfully`);
      }
      
      const nextNodes = getNextNodes(node.id);
      console.log(`[MEDIA NODE] Next nodes count: ${nextNodes.length}`);
      for (const next of nextNodes) {
        console.log(`[MEDIA NODE] Executing next node: ${next.id} (${next.data.type})`);
        await executeNode(next, nodes, edges, context, onResponse);
      }
      console.log(`[MEDIA NODE] Finished execution`);
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
      console.log(`[REPLY_BUTTONS] Starting - Node ID: ${node.id}`);
      console.log(`[REPLY_BUTTONS] Is resuming: ${context.isResuming}, Pending: ${context.pendingNodeId}`);
      
      const variable = config.variable || "button_response";
      
      // If we're resuming (user just responded), process the response
      if (context.isResuming && context.pendingNodeId === node.id) {
        console.log(`[REPLY_BUTTONS] Processing user response`);
        
        const userResponse = context.vars.userMessage?.trim() || "";
        const buttonIndex = parseInt(userResponse) - 1;
        
        if (buttonIndex >= 0 && buttonIndex < config.buttons.length) {
          context.vars[variable] = config.buttons[buttonIndex].value;
          console.log(`[REPLY_BUTTONS] Selected: ${config.buttons[buttonIndex].value}`);
        } else {
          const matchedButton = config.buttons.find((btn: any) => 
            btn.text.toLowerCase() === userResponse.toLowerCase()
          );
          context.vars[variable] = matchedButton ? matchedButton.value : userResponse;
        }
        
        // Clear pending state
        delete context.pendingNodeId;
        delete context.isResuming;
        
        // Find the matching edge and execute next node
        const selectedButtonIndex = config.buttons.findIndex((btn: any) => btn.value === context.vars[variable]);
        
        if (selectedButtonIndex >= 0) {
          const buttonHandle = `button_${selectedButtonIndex}`;
          const matchingEdge = edges.find((e: any) => 
            e.source === node.id && e.sourceHandle === buttonHandle
          );
          
          if (matchingEdge) {
            const nextNode = nodes.find((n: any) => n.id === matchingEdge.target);
            if (nextNode) {
              console.log(`[REPLY_BUTTONS] Next: ${nextNode.id}`);
              await executeNode(nextNode, nodes, edges, context, onResponse);
            }
          }
        }
      } else {
        // First time - send buttons and wait
        console.log(`[REPLY_BUTTONS] First visit - sending buttons`);
        
        let buttonText = interpolate(config.text || "");
        if (config.buttons && config.buttons.length > 0) {
          buttonText += "\n\nEscolha uma opção:";
          config.buttons.forEach((btn: any, idx: number) => {
            buttonText += `\n${idx + 1}. ${btn.text}`;
          });
        }
        
        if (buttonText) {
          await onResponse(buttonText);
        }
        
        // Mark as pending and stop
        context.pendingNodeId = node.id;
        console.log(`[REPLY_BUTTONS] Waiting for response`);
        return;
      }
      
      break;
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
