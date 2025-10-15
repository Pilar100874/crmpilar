import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WhatsAppMessage {
  from: string;
  body: string;
  session: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const payload = await req.json();
    console.log("Received WhatsApp webhook:", payload);

    // WAHA format
    const message: WhatsAppMessage = {
      from: payload.from || payload.chatId,
      body: payload.body || payload.text,
      session: payload.session || "default",
    };

    console.log("Processed message:", message);

    // Load active bot flow from database
    const { data: flowData, error: flowError } = await supabase
      .from("bot_flows")
      .select("*")
      .eq("active", true)
      .single();

    if (flowError || !flowData) {
      console.log("No active flow found, using default response");
      
      await sendWhatsAppMessage(message.session, message.from, {
        type: "message",
        content: "Olá! Nenhum fluxo ativo encontrado.",
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get or create session context
    const { data: sessionData } = await supabase
      .from("chat_sessions")
      .select("*")
      .eq("session_id", `${message.session}_${message.from}`)
      .single();

    const context = sessionData?.context || { vars: {} };
    context.vars.userMessage = message.body;
    context.vars.from = message.from;

    // Execute flow
    await executeFlow(
      flowData.flow_data,
      {
        vars: context.vars,
        userMessage: message.body,
        sessionId: `${message.session}_${message.from}`,
      },
      async (response) => {
        await sendWhatsAppMessage(message.session, message.from, response);
      }
    );

    // Save session
    await supabase.from("chat_sessions").upsert({
      session_id: `${message.session}_${message.from}`,
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

async function sendWhatsAppMessage(
  session: string,
  chatId: string,
  response: any
) {
  const wahaUrl = Deno.env.get("WAHA_URL");
  const wahaToken = Deno.env.get("WAHA_TOKEN");

  if (!wahaUrl) {
    console.log("WAHA_URL not configured, skipping send");
    return;
  }

  try {
    let payload: any = {
      session,
      chatId,
    };

    if (response.type === "message") {
      if (response.buttons && response.buttons.length > 0) {
        // Send buttons
        payload.text = response.content;
        payload.buttons = response.buttons.map((btn: any) => ({
          id: btn.id || btn.label,
          text: btn.label,
        }));

        await fetch(`${wahaUrl}/api/sendButtons`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${wahaToken}`,
          },
          body: JSON.stringify(payload),
        });
      } else {
        // Send text
        payload.text = response.content;

        await fetch(`${wahaUrl}/api/sendText`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${wahaToken}`,
          },
          body: JSON.stringify(payload),
        });
      }
    } else if (response.type === "question") {
      payload.text = response.question;

      await fetch(`${wahaUrl}/api/sendText`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${wahaToken}`,
        },
        body: JSON.stringify(payload),
      });
    }

    console.log("Message sent to WhatsApp:", payload);
  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
  }
}

async function executeFlow(
  flowData: any,
  context: any,
  onResponse: (response: any) => Promise<void>
) {
  const { nodes, edges } = flowData;

  const startNode = nodes.find((n: any) => n.data.type === "start");
  if (!startNode) {
    throw new Error("No start node found");
  }

  await executeNode(startNode, nodes, edges, context, onResponse);
}

async function executeNode(
  node: any,
  nodes: any[],
  edges: any[],
  context: any,
  onResponse: (response: any) => Promise<void>
) {
  const data = node.data;
  console.log(`Executing node: ${data.type}`);

  const interpolate = (text: string): string => {
    return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return context.vars[key] || "";
    });
  };

  const getNextNodes = (currentNodeId: string) => {
    const outgoingEdges = edges.filter((e: any) => e.source === currentNodeId);
    return outgoingEdges
      .map((e: any) => nodes.find((n: any) => n.id === e.target))
      .filter(Boolean);
  };

  switch (data.type) {
    case "start":
    case "message": {
      if (data.type === "message") {
        const config = data.config || {};
        await onResponse({
          type: "message",
          content: interpolate(config.content || ""),
          buttons: config.buttons,
        });
      }
      
      const nextNodes = getNextNodes(node.id);
      for (const next of nextNodes) {
        await executeNode(next, nodes, edges, context, onResponse);
      }
      break;
    }

    case "question": {
      const config = data.config || {};
      await onResponse({
        type: "question",
        question: interpolate(config.question || ""),
      });
      
      if (config.outputVariable) {
        context.vars[config.outputVariable] = context.userMessage;
      }
      break;
    }

    default:
      console.log(`Node type ${data.type} not fully implemented in webhook`);
      const nextNodes = getNextNodes(node.id);
      for (const next of nextNodes) {
        await executeNode(next, nodes, edges, context, onResponse);
      }
  }
}
