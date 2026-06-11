import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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
// JID suffix mantido por compatibilidade (não usado pelo Evolution, que aceita só dígitos)
const JID_SUFFIX = env("WAHA_JID_SUFFIX", "@s.whatsapp.net");

const toJid = (numOnly: string) => `${String(numOnly).replace(/\D/g, "")}${JID_SUFFIX}`;

// Detecta evento do Evolution API (messages.upsert) ou formatos antigos compatíveis.
function isWahaMessageEvent(raw: any): boolean {
  const event = String(raw?.event || raw?.type || "").toLowerCase();
  if (!event) return false;
  // Evolution: "messages.upsert" | "messages.update"
  if (event.startsWith("messages.")) return true;
  // Compatibilidade legada (WAHA)
  if (event === "message" || event === "message.any" || event.startsWith("message.")) return true;
  return false;
}

// Resolve o nome da instância/sessão (Evolution usa "instance")
function resolveWahaSession(raw: any): string {
  return String(
    raw?.instance ||
      raw?.instanceName ||
      raw?.data?.instance ||
      raw?.data?.instanceName ||
      raw?.payload?.instance ||
      raw?.session ||
      raw?.sessionId ||
      raw?.data?.session ||
      raw?.data?.sessionId ||
      raw?.payload?.session ||
      "default",
  ).trim();
}

// Extrai texto da mensagem Evolution (data.message)
function extractEvolutionText(msg: any): string {
  if (!msg) return "";
  return (
    msg.conversation ||
    msg.extendedTextMessage?.text ||
    msg.imageMessage?.caption ||
    msg.videoMessage?.caption ||
    msg.documentMessage?.caption ||
    msg.buttonsResponseMessage?.selectedButtonId ||
    msg.listResponseMessage?.singleSelectReply?.selectedRowId ||
    msg.templateButtonReplyMessage?.selectedId ||
    ""
  );
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
    let incomingImage: any = null; // metadados de imagem recebida (anexo)
    let metaAccessToken = "";      // token Meta para baixar mídia
    let inboundMsgId = "";         // id da mensagem recebida (para dedup)




    // ====== Heurística Evolution API (substitui WAHA) ======

    // A) Evolution v2: { event:'messages.upsert', instance, data:{ key:{remoteJid, fromMe}, message:{...} } }
    if (isWahaMessageEvent(raw) && (raw?.data?.key || raw?.data?.message || raw?.data)) {
      transport = "waha";
      const d = raw.data || {};
      const fromMe = d?.key?.fromMe === true;

      if (fromMe) {
        console.log("[EVOLUTION] Ignorando mensagem do próprio bot");
        return new Response(JSON.stringify({ success: true, ignored: "fromMe" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const remoteJid = String(d?.key?.remoteJid || d?.remoteJid || "");
      // Ignora mensagens de grupos por padrão
      if (remoteJid.endsWith("@g.us")) {
        console.log("[EVOLUTION] Ignorando mensagem de grupo:", remoteJid);
        return new Response(JSON.stringify({ success: true, ignored: "group" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      from = remoteJid.split("@")[0].split(":")[0].replace(/\D/g, "");
      body = extractEvolutionText(d?.message) || d?.text || "";
      wahaSession = resolveWahaSession(raw);
      inboundMsgId = String(d?.key?.id || "");
      if (d?.message?.imageMessage) {
        incomingImage = {
          source: "evolution",
          messageId: d?.key?.id,
          remoteJid,
          fromMe: false,
          mimetype: d?.message?.imageMessage?.mimetype || "image/jpeg",
          rawKey: d?.key,
        };
      }
      console.log("[EVOLUTION] Mensagem recebida:", { instance: wahaSession, from, text: body, hasImage: !!incomingImage });
    }

    // B) Baileys cru: { messages:[{ key:{remoteJid}, message:{...} }] } — compatibilidade
    if (transport !== "waha" && Array.isArray(raw?.messages) && raw.messages[0]?.key) {
      transport = "waha";
      const msg0 = raw.messages[0];
      if (msg0.key?.fromMe) {
        return new Response(JSON.stringify({ success: true, ignored: "fromMe" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const remote = msg0.key?.remoteJid || "";
      from = String(remote).split("@")[0].split(":")[0].replace(/\D/g, "");
      body = extractEvolutionText(msg0.message);
      wahaSession = resolveWahaSession(raw);
      inboundMsgId = String(msg0?.key?.id || "");
      if (msg0.message?.imageMessage) {
        incomingImage = {
          source: "evolution",
          messageId: msg0?.key?.id,
          remoteJid: remote,
          fromMe: false,
          mimetype: msg0.message?.imageMessage?.mimetype || "image/jpeg",
          rawKey: msg0?.key,
        };
      }
      console.log("[EVOLUTION] Mensagem recebida (baileys raw):", { instance: wahaSession, from, text: body, hasImage: !!incomingImage });
    }

    // ====== Meta oficial (se não caiu em Evolution) ======
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
      body = messageData.text?.body || (messageData as any)?.image?.caption || "";
      phoneNumberId = payload.entry[0].changes[0].value.metadata.phone_number_id;
      transport = "meta";
      inboundMsgId = String((messageData as any)?.id || "");
      if ((messageData as any)?.image?.id) {
        incomingImage = {
          source: "meta",
          mediaId: (messageData as any).image.id,
          mimetype: (messageData as any).image.mime_type || "image/jpeg",
          phoneNumberId,
        };
      }
    }

    console.log("Processed message:", { from, body, phoneNumberId, transport });

    // ====== Busca configuração do WAHA SEMPRE DO BANCO (nunca de secrets) ======
    let WAHA_URL = "";
    let WAHA_API_KEY = "";
    let estabelecimentoId = "";
    
    if (transport === "waha") {
      console.log("[WAHA] Buscando configuração do banco para sessão:", wahaSession);
      
      // Primeiro busca a sessão para pegar o estabelecimento_id
      const { data: sessionData, error: sessionError } = await supabase
        .from("whatsapp_sessions")
        .select("estabelecimento_id")
        .eq("session_name", wahaSession)
        .maybeSingle();
      
      if (sessionError) {
        console.error("[WAHA] Erro ao buscar sessão:", sessionError);
      }
      
      if (sessionData?.estabelecimento_id) {
        estabelecimentoId = sessionData.estabelecimento_id;
        console.log("[WAHA] Sessão encontrada, estabelecimento_id:", estabelecimentoId);
        
        // Agora busca a configuração WAHA do estabelecimento NA TABELA whatsapp_config
        const { data: wahaConfig, error: configError } = await supabase
          .from("whatsapp_config")
          .select("waha_url, waha_api_key")
          .eq("estabelecimento_id", sessionData.estabelecimento_id)
          .maybeSingle();
        
        if (configError) {
          console.error("[WAHA] Erro ao buscar configuração:", configError);
        }
        
        if (wahaConfig) {
          WAHA_URL = wahaConfig.waha_url || env("WAHA_URL");
          WAHA_API_KEY = env("WAHA_API_KEY") || wahaConfig.waha_api_key || "";
          console.log("[WAHA] ✓ Configuração carregada do banco:", { 
            sessionName: wahaSession, 
            hasUrl: !!WAHA_URL, 
            hasApiKey: !!WAHA_API_KEY,
            urlPreview: WAHA_URL ? WAHA_URL.substring(0, 30) + "..." : "vazio"
          });
          
          if (!WAHA_API_KEY) {
            console.error("[WAHA] ⚠️ WAHA_API_KEY está vazio! Configure através da interface em Config > Configuração WhatsApp WAHA");
          }
        } else {
          console.error("[WAHA] ⚠️ Nenhuma configuração encontrada na tabela whatsapp_config para estabelecimento_id:", sessionData.estabelecimento_id);
          console.error("[WAHA] 📝 Configure o servidor WAHA através da interface em: Config > Configuração WhatsApp WAHA");
        }
      } else {
        console.error("[WAHA] ⚠️ Nenhuma sessão encontrada com nome:", wahaSession);
        console.error("[WAHA] 📝 Crie uma sessão através da interface em: Config > Configuração WhatsApp WAHA");
      }
    }
    
    // ====== Carrega fluxo ativo para a sessão ======
    let flowData = null;
    
    if (transport === "waha") {
      // Busca o estabelecimento_id e bot_flow_id atrelados à sessão
      const { data: sessionData } = await supabase
        .from("whatsapp_sessions")
        .select("estabelecimento_id, bot_flow_id")
        .eq("session_name", wahaSession)
        .maybeSingle();

      // 1) Se a sessão estiver vinculada a um bot específico, usa esse bot
      //    (suporta canais whatsapp E marketing_automation atrelados ao número)
      if (sessionData?.bot_flow_id) {
        const { data } = await supabase
          .from("bot_flows")
          .select("*")
          .eq("id", sessionData.bot_flow_id)
          .eq("active", true)
          .maybeSingle();
        if (data) {
          console.log("[WAHA] Bot via session.bot_flow_id:", { botName: data?.name, canais: data?.canais });
          flowData = data;
        }
      }

      // 2) Fallback: bot ativo do estabelecimento configurado para WAHA
      //    (aceita canal whatsapp OU marketing_automation)
      if (!flowData && sessionData?.estabelecimento_id) {
        const { data } = await supabase
          .from("bot_flows")
          .select("*")
          .eq("active", true)
          .eq("estabelecimento_id", sessionData.estabelecimento_id)
          .or("canais.cs.{whatsapp},canais.cs.{marketing_automation}")
          .eq("whatsapp_type", "waha")
          .maybeSingle();

        console.log("[WAHA] Bot fallback search:", { found: !!data, botName: data?.name });
        flowData = data;
      }
    } else {
      // Para Meta, busca qualquer bot ativo configurado para WhatsApp Business
      const { data } = await supabase
        .from("bot_flows")
        .select("*")
        .eq("active", true)
        .or("canais.cs.{whatsapp},canais.cs.{marketing_automation}")
        .eq("whatsapp_type", "business")
        .maybeSingle();

      console.log("[META] Bot search result:", { found: !!data, botName: data?.name, whatsappType: data?.whatsapp_type });
      flowData = data;
    }

    // ====== Resolve número vinculado ao bot (multi-provider) ======
    // Prioridade: bot_flows.whatsapp_numero_id -> whatsapp_numeros
    // Fallback Meta: busca número por cloud_phone_number_id == phoneNumberId
    let activeProvider: "evolution" | "cloud_api" = transport === "waha" ? "evolution" : "cloud_api";
    let cloudPhoneNumberId = phoneNumberId;
    let cloudAccessToken = "";

    try {
      let numeroRow: any = null;
      if (flowData?.whatsapp_numero_id) {
        const { data } = await supabase
          .from("whatsapp_numeros")
          .select("*")
          .eq("id", flowData.whatsapp_numero_id)
          .eq("ativo", true)
          .maybeSingle();
        numeroRow = data;
      }
      // Fallback Meta: identifica por phone_number_id recebido
      if (!numeroRow && transport === "meta" && phoneNumberId) {
        const { data } = await supabase
          .from("whatsapp_numeros")
          .select("*")
          .eq("provider", "cloud_api")
          .eq("cloud_phone_number_id", phoneNumberId)
          .eq("ativo", true)
          .maybeSingle();
        numeroRow = data;
      }

      if (numeroRow) {
        activeProvider = numeroRow.provider === "cloud_api" ? "cloud_api" : "evolution";
        if (activeProvider === "evolution") {
          if (numeroRow.waha_url) WAHA_URL = numeroRow.waha_url;
          if (numeroRow.waha_api_key) WAHA_API_KEY = numeroRow.waha_api_key;
          if (numeroRow.session_name) wahaSession = numeroRow.session_name;
        } else {
          cloudPhoneNumberId = numeroRow.cloud_phone_number_id || phoneNumberId;
          cloudAccessToken = numeroRow.cloud_access_token || "";
        }
        console.log("[NUMERO] ✓ Vinculado ao bot:", { provider: activeProvider, nome: numeroRow.nome });
      } else {
        console.log("[NUMERO] Nenhum número vinculado, usando configuração padrão");
      }
    } catch (e) {
      console.error("[NUMERO] Erro ao resolver número:", e);
    }

    const respond = async (text?: string, mediaUrl?: string, mediaType?: string, interactive?: any) => {
      if (activeProvider === "evolution") {
        if (interactive?.type === "list") {
          const ok = await sendWahaListMessage(from, interactive, wahaSession, WAHA_URL, WAHA_API_KEY);
          if (!ok) {
            console.log("[FLOW] sendList falhou, usando fallback texto numerado");
            const allRows = (interactive.sections || [])
              .flatMap((section: any) => section.rows || []);
            let fallback = `${interactive.description || text || "Escolha uma opção"}`;
            allRows.forEach((row: any, index: number) => {
              fallback += `\n${index + 1}. ${row.title || `Opção ${index + 1}`}${row.description ? " - " + row.description : ""}`;
            });
            await sendWahaTextMessage(from, fallback, wahaSession, WAHA_URL, WAHA_API_KEY);
          }
          return;
        }
        if (interactive?.type === "buttons") {
          await sendWahaButtonsMessage(from, interactive, wahaSession, WAHA_URL, WAHA_API_KEY);
          return;
        }
        if (mediaUrl && mediaType) {
          await sendWahaMediaMessage(from, text, mediaType, mediaUrl, wahaSession, WAHA_URL, WAHA_API_KEY);
        } else if (text) {
          await sendWahaTextMessage(from, text, wahaSession, WAHA_URL, WAHA_API_KEY);
        }
      } else {
        // Cloud API (Meta oficial)
        const pnId = cloudPhoneNumberId;
        const token = cloudAccessToken;
        if (interactive?.type === "list") {
          const ok = await sendCloudListMessage(pnId, token, from, interactive, text);
          if (!ok) {
            const allRows = (interactive.sections || []).flatMap((s: any) => s.rows || []);
            let fallback = `${interactive.description || text || "Escolha uma opção"}`;
            allRows.forEach((row: any, i: number) => {
              fallback += `\n${i + 1}. ${row.title || `Opção ${i + 1}`}${row.description ? " - " + row.description : ""}`;
            });
            await sendCloudText(pnId, token, from, fallback);
          }
          return;
        }
        if (interactive?.type === "buttons") {
          const ok = await sendCloudButtonsMessage(pnId, token, from, interactive, text);
          if (!ok && text) await sendCloudText(pnId, token, from, text);
          return;
        }
        if (mediaUrl && mediaType) {
          await sendCloudMedia(pnId, token, from, mediaUrl, mediaType, text);
        } else if (text) {
          await sendCloudText(pnId, token, from, text);
        }
      }
    };

    // ====== Redirecionamento por bot (Canal A -> Canal B) ======
    // Se o bot tiver forward_to_numero_id, encaminha a mensagem recebida
    // criando/atualizando um contato no estabelecimento do número de destino
    // e enviando a mensagem original pelo provider do número B.
    if (flowData?.forward_to_numero_id && body) {
      try {
        const { data: targetNumero } = await supabase
          .from("whatsapp_numeros")
          .select("*")
          .eq("id", flowData.forward_to_numero_id)
          .eq("ativo", true)
          .maybeSingle();

        if (targetNumero) {
          console.log("[FORWARD] Encaminhando para número B:", targetNumero.nome);

          // Cria/atualiza contato no estabelecimento do número B
          const targetEstabId = targetNumero.estabelecimento_id;
          if (targetEstabId) {
            const { data: existing } = await supabase
              .from("customers")
              .select("id")
              .eq("telefone", from)
              .eq("estabelecimento_id", targetEstabId)
              .maybeSingle();
            if (!existing) {
              await supabase.from("customers").insert({
                nome: `Encaminhado ${from}`,
                telefone: from,
                email: `${from}@forward.temp`,
                estabelecimento_id: targetEstabId,
              });
              console.log("[FORWARD] Novo contato criado no canal B");
            }
          }

          // Envia a mensagem original pelo Canal B para o mesmo cliente
          const forwardText = `↪️ Encaminhado de ${flowData.name || "bot"}:\n${body}`;
          if (targetNumero.provider === "cloud_api") {
            await sendCloudText(
              targetNumero.cloud_phone_number_id,
              targetNumero.cloud_access_token,
              from,
              forwardText,
            );
          } else {
            await sendWahaTextMessage(
              from,
              forwardText,
              targetNumero.session_name || wahaSession,
              targetNumero.waha_url || WAHA_URL,
              targetNumero.waha_api_key || WAHA_API_KEY,
            );
          }

          return new Response(JSON.stringify({ success: true, forwarded: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch (e) {
        console.error("[FORWARD] Erro ao encaminhar:", e);
      }
    }


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

    // Dedup: ignora reentregas do mesmo messageId (Evolution/Meta às vezes reenviam)
    if (inboundMsgId && context.vars?.__last_inbound_msg_id === inboundMsgId) {
      console.log("[DEDUP] Ignorando mensagem duplicada:", inboundMsgId);
      return new Response(JSON.stringify({ success: true, ignored: "duplicate" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (inboundMsgId) context.vars.__last_inbound_msg_id = inboundMsgId;

    context.vars.userMessage = body;
    context.vars.from = from;
    context.vars.phoneNumber = from;
    context.vars.session = wahaSession;
    if (incomingImage) context.vars.__incoming_image = incomingImage; else delete context.vars.__incoming_image;
    if (estabelecimentoId) context.vars.estabelecimento_id = estabelecimentoId;

    // Persiste o messageId imediatamente para bloquear reentregas concorrentes
    if (inboundMsgId) {
      await supabase.from("chat_sessions").upsert(
        { session_id: sessionKey, context, updated_at: new Date().toISOString() },
        { onConflict: "session_id" },
      );
    }

    // ====== Buscar ou criar customer e conversation ======
    let conversationId: string | null = null;
    let isBotActive = true;
    let customerId: string | null = null;
    
    if (estabelecimentoId) {
      console.log("[ATENDIMENTO] Buscando/criando customer e conversation para:", { from, estabelecimentoId });
      
      // 1. Buscar ou criar customer
      const { data: existingCustomer } = await supabase
        .from("customers")
        .select("id")
        .eq("telefone", from)
        .eq("estabelecimento_id", estabelecimentoId)
        .maybeSingle();
      
      customerId = existingCustomer?.id;
      
      if (!customerId) {
        console.log("[ATENDIMENTO] Criando novo customer");
        const { data: newCustomer, error: customerError } = await supabase
          .from("customers")
          .insert({
            nome: `Cliente ${from}`,
            telefone: from,
            email: `${from}@temp.com`,
            estabelecimento_id: estabelecimentoId
          })
          .select("id")
          .single();
        
        if (customerError) {
          console.error("[ATENDIMENTO] Erro ao criar customer:", customerError);
        } else {
          customerId = newCustomer?.id;
          console.log("[ATENDIMENTO] Customer criado:", customerId);
        }
      }
      
      // 2. Buscar ou criar conversation
      if (customerId) {
        const { data: existingConv } = await supabase
          .from("conversations")
          .select("id, bot_active")
          .eq("customer_id", customerId)
          .eq("estabelecimento_id", estabelecimentoId)
          .eq("canal", "whatsapp")
          .eq("status", "open")
          .maybeSingle();
        
        conversationId = existingConv?.id || null;
        isBotActive = existingConv?.bot_active !== false;
        
        if (!conversationId) {
          console.log("[ATENDIMENTO] Criando nova conversation");
          const { data: newConv, error: convError } = await supabase
            .from("conversations")
            .insert({
              customer_id: customerId,
              estabelecimento_id: estabelecimentoId,
              canal: "whatsapp",
              status: "open"
            })
            .select("id")
            .single();
          
          if (convError) {
            console.error("[ATENDIMENTO] Erro ao criar conversation:", convError);
          } else {
            conversationId = newConv?.id;
            console.log("[ATENDIMENTO] Conversation criada:", conversationId);
          }
        }
        
        // 3. Salvar mensagem do cliente
        if (conversationId && body) {
          console.log("[ATENDIMENTO] Salvando mensagem do cliente");
          const { error: msgError } = await supabase
            .from("messages")
            .insert({
              conversation_id: conversationId,
              sender: "customer",
              text: body
            });
          
          if (msgError) {
            console.error("[ATENDIMENTO] Erro ao salvar mensagem:", msgError);
          } else {
            console.log("[ATENDIMENTO] ✓ Mensagem do cliente salva");
          }
        }
      }
    }

    const onResponse = async (message: string, mediaUrl?: string, mediaType?: string, interactive?: any) => {
      // Salva mensagem do bot na conversation
      if (conversationId && (message || interactive)) {
        const textForLog = message || (interactive?.title ? `[interactive] ${interactive.title}` : "[interactive]");
        console.log("[ATENDIMENTO] Salvando mensagem do bot");
        const { error: botMsgError } = await supabase
          .from("messages")
          .insert({
            conversation_id: conversationId,
            sender: "agent",
            text: textForLog
          });
        
        if (botMsgError) {
          console.error("[ATENDIMENTO] Erro ao salvar mensagem do bot:", botMsgError);
        } else {
          console.log("[ATENDIMENTO] ✓ Mensagem do bot salva");
        }
      }
      if (interactive) {
        await respond(message, undefined, undefined, interactive);
      } else if (mediaUrl && mediaType) {
        await respond(message, mediaUrl, mediaType);
      } else if (message) {
        await respond(message);
      }
    };

    // ====== Verificar se há pesquisa de satisfação pendente ======
    if (conversationId && customerId) {
      const { data: pesquisaPendente } = await supabase
        .from("pesquisas_respostas")
        .select("id, pesquisa_id, pesquisas_satisfacao(escala_minima, escala_maxima, tipo, permite_comentario)")
        .eq("conversation_id", conversationId)
        .eq("customer_id", customerId)
        .is("respondida_em", null)
        .maybeSingle();
      
      if (pesquisaPendente) {
        console.log("[PESQUISA] Detectada resposta de pesquisa pendente");
        
        // Tentar extrair nota da mensagem
        const notaMatch = body.match(/\d+/);
        if (notaMatch) {
          const nota = parseInt(notaMatch[0], 10);
          const pesquisa = pesquisaPendente.pesquisas_satisfacao as any;
          
          // Validar se a nota está dentro da escala
          if (nota >= pesquisa.escala_minima && nota <= pesquisa.escala_maxima) {
            console.log("[PESQUISA] Processando resposta com nota:", nota);
            
            // Processar a resposta da pesquisa
            const { data: processResult } = await supabase.functions.invoke("processar-resposta-pesquisa", {
              body: {
                resposta_id: pesquisaPendente.id,
                nota: nota,
                comentario: pesquisa.permite_comentario ? body : null
              }
            });
            
            console.log("[PESQUISA] ✓ Resposta processada");
            
            // Enviar mensagem de agradecimento
            if (processResult?.mensagemAgradecimento) {
              await respond(processResult.mensagemAgradecimento);
            }
            
            return new Response(JSON.stringify({ success: true, survey_processed: true }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
        
        // Se não conseguiu extrair nota válida, pedir novamente
        const pesquisa = pesquisaPendente.pesquisas_satisfacao as any;
        await respond(`Por favor, responda com um número de ${pesquisa.escala_minima} a ${pesquisa.escala_maxima}.`);
        return new Response(JSON.stringify({ success: true, awaiting_valid_response: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ====== Verificar se bot está ativo ======
    if (!isBotActive) {
      console.log("[ATENDIMENTO] Bot está pausado para esta conversa. Mensagem salva mas bot não responderá.");
      return new Response(JSON.stringify({ success: true, bot_paused: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
      // ====== Opção universal "Sair" — finaliza o fluxo ======
      else if (
        (() => {
          const raw = String(body || "").trim().toLowerCase();
          if (!raw) return false;
          if (raw === "__exit__" || raw === "sair" || raw === "exit" || raw === "encerrar" || raw === "fim") return true;
          const cfg = pendingNode?.data?.config || {};
          const t = pendingNode?.data?.type;
          const asNum = parseInt(raw);
          if (!isNaN(asNum)) {
            let total = 0;
            if (t === "reply_buttons") total = (cfg.buttons?.length || 0) + 1;
            else if (t === "list_buttons") {
              const secs = cfg.sections || [];
              if (secs.length) for (const s of secs) total += (s.rows || s.items || []).length;
              else total = (cfg.items || []).length;
              total += 1;
            } else if (t === "text_content") {
              const sub = context.vars.__tc_sub;
              if (sub === "choice") total = 2 + 1; // Sim/Não/Sair
              else if (sub === "method") total = 2 + 1; // Digitar/IA/Sair
              else if (sub === "sample_select") {
                const samples = Array.isArray(context.vars.__tc_samples) ? context.vars.__tc_samples : [];
                total = samples.length + 2; // opções + regenerar + Sair (Sair = samples.length+2)
              } else if (sub) {
                total = 0; // input livre (typing/theme): sem opção Sair numérica
              } else {
                const opts = Array.isArray(cfg.options) ? cfg.options : [];
                total = (opts.length || 2) + 1;
              }
            } else if (t === "content_type") total = getContentTypeOptions().length + 1;
            else if (t === "ask_influencer") {
              const sub = context.vars.__infl_sub || "choice";
              if (sub === "choice") total = 2 + 1; // Sim/Não/Sair
              else if (sub === "gallery_select") {
                const list = Array.isArray(context.vars.__infl_gallery) ? context.vars.__infl_gallery : [];
                total = list.length + 1; // Influencers + Sair
              }
            }
            else if (t === "ask_product_image") {
              const sub = context.vars.__pim_sub || "choice";
              if (sub === "choice") total = 2 + 1;           // Sim/Não/Sair
              else if (sub === "method") total = 3 + 1;      // Código/Foto/Texto/Sair
              else total = 0;                                 // input: sem opção Sair
            }
            if (total > 0 && asNum === total) return true;
          }
          return false;
        })()
      ) {
        console.log("[FLOW] Usuário escolheu Sair — finalizando fluxo");
        await respond("Atendimento encerrado. Quando quiser retomar, é só enviar uma nova mensagem. 👋");
        context = { vars: { from, phoneNumber: from, session: wahaSession } };
        const supabaseCli = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const sessionKey = `whatsapp_${wahaSession || "default"}_${from || ""}`;
        await supabaseCli.from("chat_sessions").delete().eq("session_id", sessionKey);
        shouldSaveContext = false;
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
      // Processa resposta para product_search_select
      else if (pendingNode?.data?.type === "product_search_select") {
        const cfg = pendingNode.data.config || {};
        const userResponse = (context.vars.userMessage || "").trim();
        const stateKey = `__product_search_${pendingNode.id}`;
        const state = context.vars[stateKey] || { stage: "awaiting_query" };

        if (state.stage === "awaiting_query") {
          // Usuário acabou de informar o termo de busca
          context.vars[stateKey] = { stage: "search_query_received", query: userResponse };
          // Re-executa o nó para realizar a busca
          await executeNode(pendingNode, flowData.flow_data.nodes, flowData.flow_data.edges, context, onResponse);
        } else if (state.stage === "awaiting_selection") {
          const candidates: any[] = state.candidates || [];
          const idx = parseInt(userResponse) - 1;
          if (idx < 0 || idx >= candidates.length) {
            await respond(`Por favor, responda com um número entre 1 e ${candidates.length}.`);
            shouldReturn = true;
          } else {
            const chosen = candidates[idx];
            const outVar = cfg.outputVariable || "produto_selecionado";
            const imgVar = cfg.imageUrlVariable || "produto_imagem_url";
            context.vars[outVar] = chosen;
            context.vars[imgVar] = chosen.foto_url || "";
            delete context.vars[stateKey];
            delete context.pendingNodeId;
            const nextEdge = flowData.flow_data.edges.find((e: any) => e.source === pendingNode.id);
            if (nextEdge) {
              const nextNode = flowData.flow_data.nodes.find((n: any) => n.id === nextEdge.target);
              if (nextNode) await executeNode(nextNode, flowData.flow_data.nodes, flowData.flow_data.edges, context, onResponse);
            }
          }
        }
      }
      // ===== Bloco ask_influencer (fixo ou seleção pela galeria) =====
      else if (pendingNode?.data?.type === "ask_influencer") {
        const cfg = pendingNode.data.config || {};
        const userResponse = (context.vars.userMessage || "").trim();
        const subState = context.vars.__infl_sub || "choice";
        const outVar = cfg.outputVariable || "influencer_image_url";

        const advance = async () => {
          delete context.pendingNodeId;
          delete context.vars.__infl_sub;
          delete context.vars.__infl_gallery;
          const edge = flowData.flow_data.edges.find((e: any) => e.source === pendingNode.id);
          if (edge) {
            const nextNode = flowData.flow_data.nodes.find((n: any) => n.id === edge.target);
            if (nextNode) await executeNode(nextNode, flowData.flow_data.nodes, flowData.flow_data.edges, context, onResponse);
          }
        };

        console.log("[INFL] processing", { subState, userResponse, mode: cfg.influencerMode, hasAllowed: Array.isArray(cfg.allowedInfluencerIds) ? cfg.allowedInfluencerIds.length : 0 });

        if (subState === "choice") {
          // Aceita texto/numero/id do botão (infl_1=Sim, infl_2=Não). Sair já tratado antes.
          const r = userResponse.toLowerCase();
          const isYes = r === "1" || r === "sim" || r === "s" || r === "yes" || r === "infl_1";
          const isNo = r === "2" || r === "nao" || r === "não" || r === "n" || r === "no" || r === "infl_2";
          if (!isYes && !isNo) {
            await respond("Por favor, responda com 1 (Sim), 2 (Não) ou 3 (Sair).");
            shouldReturn = true;

          } else if (isNo) {
            context.vars.tem_influencer = "nao";
            await advance();
          } else {
            context.vars.tem_influencer = "sim";
            const mode = cfg.influencerMode === "selection" ? "selection" : "fixed";
            const fixedId = cfg.fixedInfluencerId || "";
            const fixedUrl = cfg.fixedInfluencerUrl || "";

            if (mode === "fixed" && fixedId && fixedUrl) {
              context.vars[outVar] = fixedUrl;
              await respond("✅ Influencer fixo registrado automaticamente.", fixedUrl, "image");
              await advance();
            } else {
              // Modo seleção — carrega galeria filtrada por allowedInfluencerIds
              const allowedIds: string[] = Array.isArray(cfg.allowedInfluencerIds) ? cfg.allowedInfluencerIds : [];
              const sbCli = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
              let q = sbCli
                .from("studio_gallery_images")
                .select("id,nome,image_url,pasta")
                .eq("categoria", "influencer")
                .order("created_at", { ascending: false })
                .limit(100);
              const estId = context.vars.estabelecimento_id;
              if (estId) q = q.eq("estabelecimento_id", estId);
              const { data: galData } = await q;
              let list: any[] = galData || [];
              if (mode === "selection" && allowedIds.length > 0) {
                list = list.filter((it: any) => allowedIds.includes(it.id));
              }
              if (list.length === 0) {
                await respond("⚠️ Nenhum influencer disponível. Seguindo sem influencer.");
                await advance();
              } else {
                await respond(`Encontrei ${list.length} influencer(s). Veja as opções abaixo:`);
                for (let i = 0; i < list.length; i++) {
                  const it = list[i];
                  await respond(`${i + 1}. ${it.nome || `Influencer ${i + 1}`}`, it.image_url, "image");
                }
                let menu = "Selecione um influencer respondendo com o número:";
                list.forEach((it: any, i: number) => { menu += `\n${i + 1}. ${it.nome || `Influencer ${i + 1}`}`; });
                menu += `\n${list.length + 1}. Sair`;
                await respond(menu);
                context.vars.__infl_sub = "gallery_select";
                context.vars.__infl_gallery = list.map((it: any) => ({ id: it.id, nome: it.nome, image_url: it.image_url }));
                // mantém pendingNodeId
                shouldReturn = true;
              }
            }
          }
        } else if (subState === "gallery_select") {
          const list: any[] = Array.isArray(context.vars.__infl_gallery) ? context.vars.__infl_gallery : [];
          const idx = parseInt(userResponse) - 1;
          if (isNaN(idx) || idx < 0 || idx >= list.length) {
            await respond(`Por favor, responda com um número entre 1 e ${list.length} ou ${list.length + 1} para sair.`);
            shouldReturn = true;
          } else {
            const item = list[idx];
            context.vars[outVar] = item.image_url;
            await respond(`✅ Influencer "${item.nome || "selecionado"}" registrado.`, item.image_url, "image");
            await advance();
          }
        }
      }
      // ===== Bloco ask_product_image (sim/não + método + input) =====
      else if (pendingNode?.data?.type === "ask_product_image") {
        const cfg = pendingNode.data.config || {};
        const userResponse = (context.vars.userMessage || "").trim();
        const subState = context.vars.__pim_sub || "choice";
        const imgVar = cfg.outputImageVariable || "produto_imagem_url";
        const descVar = cfg.outputDescVariable || "produto_descricao";

        const advancePim = async () => {
          delete context.pendingNodeId;
          delete context.vars.__pim_sub;
          delete context.vars.__pim_method;
          delete context.vars.__pim_prompts;
          delete context.vars.__pim_samples;
          delete context.vars.__pim_description;
          delete context.vars.__pim_sample_count;
          const edge = flowData.flow_data.edges.find((e: any) => e.source === pendingNode.id);
          if (edge) {
            const nextNode = flowData.flow_data.nodes.find((n: any) => n.id === edge.target);
            if (nextNode) await executeNode(nextNode, flowData.flow_data.nodes, flowData.flow_data.edges, context, onResponse);
          }
        };

        const generateAndAskProductSamples = async (description: string) => {
          const count = Math.max(1, Math.min(6, Number(cfg.sampleCount) || 3));
          context.vars.__pim_description = description;
          context.vars.__pim_sample_count = count;
          await respond(`🎨 Gerando ${count} opção${count > 1 ? "s" : ""} de imagem do produto, aguarde...`);

          try {
            const sbCli = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
            const { data, error } = await sbCli.functions.invoke("bot-generate-product-samples", {
              body: {
                description,
                count,
                estabelecimentoId: context.vars.estabelecimento_id || "",
              },
            });
            if (error) throw error;
            const images: string[] = Array.isArray(data?.images) ? data.images.filter(Boolean) : [];
            if (!images.length) throw new Error(data?.error || "Nenhuma imagem retornada");

            context.vars.__pim_samples = images;
            context.vars.__pim_sub = "sample_select";
            for (let i = 0; i < images.length; i++) {
              await respond(`Opção ${i + 1}`, images[i], "image");
            }
            let menu = "Escolha a imagem do produto respondendo com o número:";
            images.forEach((_, i) => { menu += `\n${i + 1}. ✅ Usar opção ${i + 1}`; });
            menu += `\n${images.length + 1}. 🔄 Gerar mais ${count}`;
            menu += `\n${images.length + 2}. Sair`;
            await respond(menu);
            shouldReturn = true;
          } catch (e: any) {
            console.error("[PIM] erro ao gerar amostras:", e);
            await respond("⚠️ Não consegui gerar as opções de imagem agora. Envie uma nova descrição ou digite Sair.");
            context.vars.__pim_sub = "input";
            shouldReturn = true;
          }
        };

        console.log("[PIM] processing", { subState, userResponse });

        if (subState === "choice") {
          const r = userResponse.toLowerCase();
          const isYes = r === "1" || r === "sim" || r === "s" || r === "yes" || r === "pim_1" || r === "pim_yes";
          const isNo = r === "2" || r === "nao" || r === "não" || r === "n" || r === "no" || r === "pim_2" || r === "pim_no";
          if (!isYes && !isNo) {
            await respond("Por favor, responda com 1 (Sim), 2 (Não) ou 3 (Sair).");
            shouldReturn = true;
          } else if (isNo) {
            context.vars.tem_produto_imagem = "nao";
            await advancePim();
          } else {
            context.vars.tem_produto_imagem = "sim";
            const codeP = cfg.codePrompt || "Digite o código (ou nome) do produto:";
            const photoP = cfg.photoPrompt || "📷 Envie agora a foto do produto como anexo no WhatsApp:";
            const textP = cfg.textPrompt || "Descreva o produto em texto:";
            let menu = "Como você quer fornecer a imagem do produto?";
            menu += `\n1. 🔢 Digitar código do produto`;
            menu += `\n2. 📷 Enviar foto (anexo)`;
            menu += `\n3. ✍️ Descrever em texto`;
            menu += `\n4. Sair`;
            await respond(menu);
            context.vars.__pim_sub = "method";
            context.vars.__pim_prompts = { code: codeP, photo: photoP, text: textP };
            shouldReturn = true;
          }
        } else if (subState === "method") {
          const r = userResponse.toLowerCase();
          let method: string | null = null;
          if (r === "1" || r.includes("codigo") || r.includes("código") || r === "code") method = "code";
          else if (r === "2" || r.includes("foto") || r.includes("photo") || r.includes("url")) method = "photo";
          else if (r === "3" || r.includes("texto") || r.includes("descre") || r === "text") method = "text";
          if (!method) {
            await respond("Por favor, responda com 1, 2 ou 3.");
            shouldReturn = true;
          } else {
            const prompts = context.vars.__pim_prompts || {};
            context.vars.__pim_method = method;
            context.vars.__pim_sub = "input";
            await respond(prompts[method] || "Envie a informação:");
            shouldReturn = true;
          }
        } else if (subState === "input") {
          const method = context.vars.__pim_method || "text";
          if (method === "code") {
            const sbCli = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
            const term = userResponse;
            const estId = context.vars.estabelecimento_id;
            let query = sbCli.from("produtos").select("id,nome,codigo,foto_url").limit(1);
            if (estId) query = query.eq("estabelecimento_id", estId);
            const { data: byCode } = await query.eq("codigo", term);
            let prod: any = byCode && byCode[0];
            if (!prod) {
              let q2 = sbCli.from("produtos").select("id,nome,codigo,foto_url").ilike("nome", `%${term}%`).limit(1);
              if (estId) q2 = q2.eq("estabelecimento_id", estId);
              const { data: byName } = await q2;
              prod = byName && byName[0];
            }
            if (prod) {
              if (prod.foto_url) {
                context.vars[imgVar] = prod.foto_url;
                await respond(`✅ Produto "${prod.nome}" encontrado.`, prod.foto_url, "image");
              } else {
                context.vars[descVar] = prod.nome;
                await respond(`✅ Produto "${prod.nome}" registrado (sem foto).`);
              }
            } else {
              context.vars[descVar] = term;
              await respond(`⚠️ Produto não encontrado. Usando "${term}" como descrição.`);
            }
            await advancePim();
          } else if (method === "photo") {
            const incoming = context.vars.__incoming_image;
            if (incoming) {
              await respond("⏳ Recebendo a foto, aguarde...");
              const publicUrl = await downloadIncomingImageAsPublicUrl(incoming, {
                wahaUrl: WAHA_URL,
                wahaApiKey: WAHA_API_KEY,
                sessionName: wahaSession,
                metaToken: cloudAccessToken,
                from,
              });
              delete context.vars.__incoming_image;
              if (publicUrl) {
                context.vars[imgVar] = publicUrl;
                await respond("✅ Foto do produto registrada.", publicUrl, "image");
                await advancePim();
              } else {
                await respond("⚠️ Não consegui baixar a foto. Por favor, envie a imagem novamente como anexo.");
                shouldReturn = true;
              }
            } else {
              await respond("📷 Por favor, anexe a foto do produto (envie a imagem como anexo no WhatsApp).");
              shouldReturn = true;
            }
          } else {
            context.vars[descVar] = userResponse;
            await generateAndAskProductSamples(userResponse);
          }
        } else if (subState === "sample_select") {
          const samples: string[] = Array.isArray(context.vars.__pim_samples) ? context.vars.__pim_samples : [];
          const idx = parseInt(userResponse) - 1;
          const regenIndex = samples.length;
          const exitIndex = samples.length + 1;

          if (userResponse.toLowerCase() === "regen" || idx === regenIndex) {
            const desc = context.vars.__pim_description || context.vars[descVar] || "";
            if (!desc) {
              await respond("⚠️ Sem descrição para gerar novas opções. Descreva o produto novamente.");
              context.vars.__pim_sub = "input";
              shouldReturn = true;
            } else {
              await generateAndAskProductSamples(desc);
            }
          } else if (userResponse.toLowerCase() === "cancelar" || idx === exitIndex) {
            await respond("Atendimento encerrado. Quando quiser retomar, é só enviar uma nova mensagem. 👋");
            context = { vars: { from, phoneNumber: from, session: wahaSession } };
            const sbCli = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
            const sessionKey = `whatsapp_${wahaSession || "default"}_${from || ""}`;
            await sbCli.from("chat_sessions").delete().eq("session_id", sessionKey);
            shouldSaveContext = false;
            shouldReturn = true;
          } else if (isNaN(idx) || idx < 0 || idx >= samples.length) {
            await respond(`Por favor, responda com um número entre 1 e ${samples.length + 2}.`);
            shouldReturn = true;
          } else {
            const selected = samples[idx];
            context.vars[imgVar] = selected;
            if (context.vars.__pim_description) context.vars[descVar] = context.vars.__pim_description;
            await respond(`✅ Opção ${idx + 1} selecionada.`, selected, "image");
            await advancePim();
          }
        }
      }
      // ===== Bloco text_content avançado (sim/não + método digitar/IA + coleta/amostras) =====
      else if (pendingNode?.data?.type === "text_content" && context.vars.__tc_sub) {
        const cfg = pendingNode.data.config || {};
        const userResponse = (context.vars.userMessage || "").trim();
        const subState = context.vars.__tc_sub;

        const advanceTc = async () => {
          delete context.pendingNodeId;
          delete context.vars.__tc_sub;
          delete context.vars.__tc_method;
          delete context.vars.__tc_samples;
          delete context.vars.__tc_theme;
          delete context.vars.__tc_typing_step;
          const edge = flowData.flow_data.edges.find((e: any) => e.source === pendingNode.id);
          if (edge) {
            const nextNode = flowData.flow_data.nodes.find((n: any) => n.id === edge.target);
            if (nextNode) await executeNode(nextNode, flowData.flow_data.nodes, flowData.flow_data.edges, context, onResponse);
          }
        };

        const generateTextSamples = async (theme: string) => {
          const count = Math.max(1, Math.min(6, Number(cfg.sampleCount) || 3));
          context.vars.__tc_theme = theme;
          await respond(`✍️ Gerando ${count} opç${count > 1 ? "ões" : "ão"} de texto, aguarde...`);
          try {
            const sbCli = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
            const { data, error } = await sbCli.functions.invoke("bot-generate-text-samples", {
              body: { theme, count },
            });
            if (error) throw error;
            const options: any[] = Array.isArray(data?.options) ? data.options : [];
            if (!options.length) throw new Error(data?.error || "Nenhuma opção retornada");
            context.vars.__tc_samples = options;
            context.vars.__tc_sub = "sample_select";
            let menu = "Escolha uma das opções de texto respondendo com o número:";
            options.forEach((o: any, i: number) => {
              menu += `\n\n${i + 1}. *${o.title || "(sem título)"}*`;
              if (o.subtitle) menu += `\n   _${o.subtitle}_`;
              if (o.body) menu += `\n   ${o.body}`;
            });
            menu += `\n\n${options.length + 1}. 🔄 Gerar novamente`;
            menu += `\n${options.length + 2}. Sair`;
            await respond(menu);
            shouldReturn = true;
          } catch (e: any) {
            console.error("[TC] erro ao gerar amostras:", e);
            await respond("⚠️ Não consegui gerar as opções agora. Envie um novo tema ou digite Sair.");
            context.vars.__tc_sub = "theme";
            shouldReturn = true;
          }
        };

        if (subState === "choice") {
          const r = userResponse.toLowerCase();
          const isYes = r === "1" || r === "sim" || r === "s";
          const isNo = r === "2" || r === "nao" || r === "não" || r === "n";
          if (!isYes && !isNo) {
            await respond("Por favor, responda com 1 (Sim), 2 (Não) ou 3 (Sair).");
            shouldReturn = true;
          } else if (isNo) {
            context.vars.text_content_choice = "nao";
            await advanceTc();
          } else {
            context.vars.text_content_choice = "sim";
            let menu = "Como você quer fornecer o texto?";
            menu += `\n1. ✍️ Digitar eu mesmo`;
            menu += `\n2. 🤖 Gerar com IA`;
            menu += `\n3. Sair`;
            await respond(menu);
            context.vars.__tc_sub = "method";
            shouldReturn = true;
          }
        } else if (subState === "method") {
          const r = userResponse.toLowerCase();
          let method: string | null = null;
          if (r === "1" || r.includes("digit")) method = "type";
          else if (r === "2" || r.includes("ia") || r.includes("ai")) method = "ai";
          if (!method) {
            await respond("Por favor, responda com 1, 2 ou 3.");
            shouldReturn = true;
          } else if (method === "type") {
            context.vars.__tc_method = "type";
            context.vars.__tc_sub = "typing";
            context.vars.__tc_typing_step = "title";
            await respond("Digite o *título* (chamada principal):");
            shouldReturn = true;
          } else {
            context.vars.__tc_method = "ai";
            context.vars.__tc_sub = "theme";
            await respond("Sobre qual *tema* você quer que eu gere as opções de texto?");
            shouldReturn = true;
          }
        } else if (subState === "typing") {
          const step = context.vars.__tc_typing_step || "title";
          if (step === "title") {
            context.vars.tc_title = userResponse;
            context.vars.__tc_typing_step = "subtitle";
            await respond("Agora o *subtítulo* (ou digite '-' para pular):");
            shouldReturn = true;
          } else if (step === "subtitle") {
            context.vars.tc_subtitle = userResponse === "-" ? "" : userResponse;
            context.vars.__tc_typing_step = "body";
            await respond("Por fim, o *corpo/CTA* (ou digite '-' para pular):");
            shouldReturn = true;
          } else {
            context.vars.tc_body = userResponse === "-" ? "" : userResponse;
            await respond("✅ Texto registrado.");
            await advanceTc();
          }
        } else if (subState === "theme") {
          if (!userResponse) {
            await respond("Por favor, descreva o tema:");
            shouldReturn = true;
          } else {
            await generateTextSamples(userResponse);
          }
        } else if (subState === "sample_select") {
          const samples: any[] = Array.isArray(context.vars.__tc_samples) ? context.vars.__tc_samples : [];
          const idx = parseInt(userResponse) - 1;
          const regenIndex = samples.length;
          const exitIndex = samples.length + 1;
          if (idx === regenIndex) {
            const theme = context.vars.__tc_theme || "";
            if (!theme) { context.vars.__tc_sub = "theme"; await respond("Descreva o tema novamente:"); shouldReturn = true; }
            else await generateTextSamples(theme);
          } else if (idx === exitIndex) {
            await respond("Atendimento encerrado. Quando quiser retomar, é só enviar uma nova mensagem. 👋");
            context = { vars: { from, phoneNumber: from, session: wahaSession } };
            const sbCli = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
            const sessionKey = `whatsapp_${wahaSession || "default"}_${from || ""}`;
            await sbCli.from("chat_sessions").delete().eq("session_id", sessionKey);
            shouldSaveContext = false;
            shouldReturn = true;
          } else if (isNaN(idx) || idx < 0 || idx >= samples.length) {
            await respond(`Por favor, responda com um número entre 1 e ${samples.length + 2}.`);
            shouldReturn = true;
          } else {
            const chosen = samples[idx];
            context.vars.tc_title = chosen.title || "";
            context.vars.tc_subtitle = chosen.subtitle || "";
            context.vars.tc_body = chosen.body || "";
            await respond(`✅ Opção ${idx + 1} selecionada.`);
            await advanceTc();
          }
        }
      }
      // Processa resposta para blocos de escolha (keyword_options, content_type, text_content, list_buttons)
      else if (
        pendingNode?.data?.type === "keyword_options" ||
        pendingNode?.data?.type === "content_type" ||
        pendingNode?.data?.type === "text_content" ||
        pendingNode?.data?.type === "list_buttons"
      ) {

        const cfg = pendingNode.data.config || {};
        const userResponse = (context.vars.userMessage || "").trim();
        const blockType = pendingNode.data.type;

        let options: Array<{ label: string; value: string; handle: string }> = [];
        let variable = cfg.variable || "resposta";

        if (blockType === "keyword_options") {
          options = (cfg.buttons || cfg.keywords || []).map((b: any, i: number) => ({
            label: b.label || b.text || `Opção ${i + 1}`,
            value: b.value || b.label || b.text || `opcao_${i + 1}`,
            handle: `button_${i}`,
          }));
          variable = cfg.variable || "opcao_escolhida";
        } else if (blockType === "content_type") {
          const directives = getContentTypeOptions();
          options = directives.map((o) => ({ label: o.label, value: o.value, handle: `content_${o.value}` }));
          variable = "content_type";
          context.vars.content_type_use_badge = cfg.useBadge !== false;
        } else if (blockType === "ask_influencer" || blockType === "ask_product_image") {
          const prefix = blockType === "ask_influencer" ? "infl" : "pim";
          options = [
            { label: "Sim", value: "sim", handle: `${prefix}_yes` },
            { label: "Não", value: "nao", handle: `${prefix}_no` },
          ];
          variable = blockType === "ask_influencer" ? "tem_influencer" : "tem_produto_imagem";
        } else if (blockType === "text_content") {
          const opts: any[] = Array.isArray(cfg.options) ? cfg.options : [];
          if (opts.length) {
            options = opts.map((o: any, i: number) => ({
              label: o.label || `Opção ${i + 1}`,
              value: `tco_${i}`,
              handle: `tco_${i}`,
            }));
          } else {
            options = [
              { label: "Sim", value: "sim", handle: "tc_yes" },
              { label: "Não", value: "nao", handle: "tc_no" },
            ];
          }
          variable = "text_content_choice";
        } else if (blockType === "list_buttons") {
          const sections: any[] = cfg.sections || [];
          let idx = 0;
          const listSections = sections.length ? sections : [{ rows: cfg.items || [] }];
          for (let sectionIndex = 0; sectionIndex < listSections.length; sectionIndex++) {
            const sec = listSections[sectionIndex];
            const rows = sec.rows || sec.items || [];
            for (let itemIndex = 0; itemIndex < rows.length; itemIndex++) {
              const row = rows[itemIndex];
              const handle = row.rowId || `section_${sectionIndex}_item_${itemIndex}`;
              const rawValue = row.value || row.id || row.rowId || row.title || row.label || handle;
              options.push({
                label: row.title || row.label || `Opção ${idx + 1}`,
                value: String(rawValue),
                handle,
              });
              idx++;
            }
          }
          variable = cfg.variable || "list_response";
        }

        let selectedIndex = -1;
        const asNum = parseInt(userResponse);
        if (!isNaN(asNum) && asNum >= 1 && asNum <= options.length) {
          selectedIndex = asNum - 1;
        } else {
          const lower = userResponse.toLowerCase();
          const normalizedResponse = blockType === "content_type" ? normalizeContentTypeResponse(userResponse) : lower;
          selectedIndex = options.findIndex((o) => {
            const label = blockType === "content_type" ? normalizeContentTypeResponse(o.label) : String(o.label || "").toLowerCase();
            const value = blockType === "content_type" ? normalizeContentTypeResponse(o.value) : String(o.value || "").toLowerCase();
            return label === normalizedResponse || value === normalizedResponse;
          });
          // Reconhece rowId/buttonId enviado por listas/botões interativos do WhatsApp (ex: "ct_1", "section_0_item_0", custom rowIds)
          if (selectedIndex < 0) {
            selectedIndex = options.findIndex((o) => String(o.handle || "").toLowerCase() === lower);
          }
          // Compatibilidade: listas antigas de content_type usavam ct_1..ct_N como rowId
          if (selectedIndex < 0 && blockType === "content_type") {
            const m = lower.match(/^ct_(\d+)$/);
            if (m) {
              const n = parseInt(m[1]);
              if (n >= 1 && n <= options.length) selectedIndex = n - 1;
            }
          }
        }


        if (selectedIndex < 0) {
          if (blockType === "list_buttons") {
            await executeNode(pendingNode, flowData.flow_data.nodes, flowData.flow_data.edges, context, onResponse);
          } else {
            await respond(`Por favor, responda com um número entre 1 e ${options.length} ou o nome da opção.`);
          }
          shouldReturn = true;
        } else {
          const chosen = options[selectedIndex];
          context.vars[variable] = chosen.value;
          if (blockType === "content_type") context.vars.content_type_choice = chosen.value;
          console.log("[FLOW] Choice selected:", {
            blockType,
            selectedIndex,
            chosenValue: chosen.value,
            chosenHandle: chosen.handle,
          });
          delete context.pendingNodeId;
          let edge = flowData.flow_data.edges.find((e: any) => e.source === pendingNode.id && e.sourceHandle === chosen.handle);
          if (!edge && blockType === "list_buttons") {
            const normalized = normalizeListHandle(pendingNode.data.config || {}, selectedIndex);
            edge = flowData.flow_data.edges.find((e: any) => e.source === pendingNode.id && e.sourceHandle === normalized);
          }
          if (!edge) {
            edge = flowData.flow_data.edges.find((e: any) => e.source === pendingNode.id);
          }
          if (edge) {
            const nextNode = flowData.flow_data.nodes.find((n: any) => n.id === edge.target);
            if (nextNode) {
              await executeNode(nextNode, flowData.flow_data.nodes, flowData.flow_data.edges, context, onResponse);
            }
          }
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

/* ======= Meta Cloud API – envio explícito por número (multi-conta) ======= */

async function sendCloudText(phoneNumberId: string, accessToken: string, to: string, text: string) {
  if (!phoneNumberId || !accessToken) {
    console.error("[CLOUD] phoneNumberId/accessToken ausentes");
    return false;
  }
  const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body: text } }),
  });
  const res = await r.json().catch(() => ({}));
  if (!r.ok) console.error("[CLOUD] sendText error:", res);
  return r.ok;
}

async function sendCloudMedia(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  mediaUrl: string,
  mediaType: string,
  caption?: string,
) {
  if (!phoneNumberId || !accessToken) return false;
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
  const res = await r.json().catch(() => ({}));
  if (!r.ok) console.error("[CLOUD] sendMedia error:", res);
  return r.ok;
}

async function sendCloudListMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  interactive: any,
  bodyText?: string,
): Promise<boolean> {
  if (!phoneNumberId || !accessToken) return false;
  try {
    const sections = (interactive.sections || []).map((s: any) => ({
      title: (s.title || "Opções").slice(0, 24),
      rows: (s.rows || []).slice(0, 10).map((r: any) => ({
        id: String(r.id || r.rowId || r.title || "").slice(0, 200),
        title: String(r.title || "Opção").slice(0, 24),
        description: r.description ? String(r.description).slice(0, 72) : undefined,
      })),
    }));
    const payload = {
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: "list",
        header: interactive.title ? { type: "text", text: String(interactive.title).slice(0, 60) } : undefined,
        body: { text: String(interactive.description || bodyText || "Escolha uma opção").slice(0, 1024) },
        footer: interactive.footer ? { text: String(interactive.footer).slice(0, 60) } : undefined,
        action: {
          button: String(interactive.buttonText || "Ver opções").slice(0, 20),
          sections,
        },
      },
    };
    const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(payload),
    });
    const res = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error("[CLOUD] sendList error:", res);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[CLOUD] sendList exception:", e);
    return false;
  }
}

async function sendCloudButtonsMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  interactive: any,
  bodyText?: string,
): Promise<boolean> {
  if (!phoneNumberId || !accessToken) return false;
  try {
    const buttons = (interactive.buttons || []).slice(0, 3).map((b: any) => ({
      type: "reply",
      reply: {
        id: String(b.id || b.title || "").slice(0, 256),
        title: String(b.title || "OK").slice(0, 20),
      },
    }));
    if (!buttons.length) return false;
    const payload = {
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: String(interactive.description || bodyText || "Escolha uma opção").slice(0, 1024) },
        action: { buttons },
      },
    };
    const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(payload),
    });
    const res = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error("[CLOUD] sendButtons error:", res);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[CLOUD] sendButtons exception:", e);
    return false;
  }
}


/* ======= Download de imagens recebidas e upload para bot-media ======= */

async function downloadIncomingImageAsPublicUrl(
  incoming: any,
  ctx: { wahaUrl: string; wahaApiKey: string; sessionName: string; metaToken?: string; from: string },
): Promise<string | null> {
  try {
    let base64 = "";
    let mimetype = incoming?.mimetype || "image/jpeg";

    if (incoming?.source === "evolution") {
      const { base, apiKey } = resolveEvolution(ctx.wahaUrl, ctx.wahaApiKey);
      if (!base || !apiKey) {
        console.error("[INCOMING-IMG] Evolution sem URL/apikey");
        return null;
      }
      const url = `${base}/chat/getBase64FromMediaMessage/${encodeURIComponent(ctx.sessionName)}`;
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: apiKey },
        body: JSON.stringify({
          message: { key: incoming.rawKey || { id: incoming.messageId, remoteJid: incoming.remoteJid, fromMe: false } },
          convertToMp4: false,
        }),
      });
      const j = await r.json().catch(() => ({} as any));
      if (!r.ok) {
        console.error("[INCOMING-IMG] Evolution getBase64 falhou:", j);
        return null;
      }
      base64 = j?.base64 || j?.data || "";
      mimetype = j?.mimetype || mimetype;
    } else if (incoming?.source === "meta") {
      const token = ctx.metaToken;
      if (!token) {
        console.error("[INCOMING-IMG] Meta sem access token");
        return null;
      }
      const metaR = await fetch(`https://graph.facebook.com/v18.0/${incoming.mediaId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const metaJ = await metaR.json().catch(() => ({} as any));
      if (!metaR.ok || !metaJ?.url) {
        console.error("[INCOMING-IMG] Meta meta lookup falhou:", metaJ);
        return null;
      }
      const fileR = await fetch(metaJ.url, { headers: { Authorization: `Bearer ${token}` } });
      if (!fileR.ok) {
        console.error("[INCOMING-IMG] Meta download falhou:", fileR.status);
        return null;
      }
      const buf = new Uint8Array(await fileR.arrayBuffer());
      base64 = btoa(String.fromCharCode(...buf));
      mimetype = metaJ.mime_type || mimetype;
    } else {
      return null;
    }

    if (!base64) return null;

    // base64 -> bytes
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

    const ext = mimetype.includes("png") ? "png" : mimetype.includes("webp") ? "webp" : "jpg";
    const path = `whatsapp-incoming/${ctx.from || "anon"}/${Date.now()}.${ext}`;
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { error: upErr } = await sb.storage.from("bot-media").upload(path, bytes, {
      contentType: mimetype,
      upsert: true,
    });
    if (upErr) {
      console.error("[INCOMING-IMG] upload falhou:", upErr);
      return null;
    }
    const { data: pub } = sb.storage.from("bot-media").getPublicUrl(path);
    return pub?.publicUrl || null;
  } catch (e) {
    console.error("[INCOMING-IMG] exception:", e);
    return null;
  }
}


/* ======= Evolution API – envio de texto e mídia ======= */


function resolveEvolution(wahaUrl: string, wahaApiKey: string) {
  const base = (wahaUrl || env("EVOLUTION_URL") || env("WAHA_URL") || "").replace(/\/+$/, "");
  const apiKey = (wahaApiKey || env("EVOLUTION_API_KEY") || env("WAHA_API_KEY") || "").trim();
  return { base, apiKey };
}

async function sendWahaTextMessage(
  toNumberOnly: string,
  text: string,
  sessionName: string,
  wahaUrl: string,
  wahaApiKey: string,
) {
  const { base, apiKey } = resolveEvolution(wahaUrl, wahaApiKey);
  if (!base || !apiKey) {
    console.error("[EVOLUTION] URL ou apikey ausentes. Configure em Canais de Atendimento.");
    return;
  }
  const instance = sessionName || "default";
  const number = String(toNumberOnly).replace(/\D/g, "");
  const endpoint = `${base}/message/sendText/${encodeURIComponent(instance)}`;

  try {
    console.log(`[EVOLUTION] Enviando TEXT -> ${number}`, { instance });
    const resp = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        apikey: apiKey,
      },
      body: JSON.stringify({ number, text }),
      signal: AbortSignal.timeout(60000),
    });
    const resultText = await resp.text().catch(() => "");
    console.log("[EVOLUTION] sendText result:", resp.status, resultText.slice(0, 500));
    if (resp.ok) return;
    if (resp.status === 401) {
      console.error("[EVOLUTION] 401 não autorizado — verifique a apikey configurada.");
    }
  } catch (err) {
    console.error("[EVOLUTION] Erro no sendText:", err);
  }
}

async function sendWahaListMessage(
  toNumberOnly: string,
  interactive: any,
  sessionName: string,
  wahaUrl: string,
  wahaApiKey: string,
): Promise<boolean> {
  const { base, apiKey } = resolveEvolution(wahaUrl, wahaApiKey);
  if (!base || !apiKey) {
    console.error("[EVOLUTION] URL ou apikey ausentes para sendList.");
    return false;
  }
  const instance = sessionName || "default";
  const number = String(toNumberOnly).replace(/\D/g, "");
  const endpoint = `${base}/message/sendList/${encodeURIComponent(instance)}`;
  // Evolution API exige description não-vazia em cada row e rejeita títulos vazios
  const sanitizedSections = (interactive.sections || []).map((sec: any, si: number) => ({
    title: (sec.title && String(sec.title).trim()) ? String(sec.title).trim().slice(0, 24) : `Opções ${si + 1}`,
    rows: (sec.rows || []).map((r: any, ri: number) => ({
      title: (r.title && String(r.title).trim()) ? String(r.title).trim().slice(0, 24) : `Opção ${ri + 1}`,
      description: (r.description && String(r.description).trim()) ? String(r.description).trim().slice(0, 72) : " ",
      rowId: String(r.rowId ?? `row_${si}_${ri}`),
    })),
  })).filter((s: any) => s.rows.length > 0);

  const title = (interactive.title && String(interactive.title).trim()) ? String(interactive.title).trim().slice(0, 60) : "Escolha uma opção";
  const description = (interactive.description && String(interactive.description).trim()) ? String(interactive.description).trim() : "Selecione abaixo";
  const buttonText = (interactive.buttonText && String(interactive.buttonText).trim()) ? String(interactive.buttonText).trim().slice(0, 20) : "Ver opções";
  const footerText = (interactive.footerText && String(interactive.footerText).trim()) ? String(interactive.footerText).trim() : "Toque para escolher";

  const body: any = {
    number,
    title,
    description,
    buttonText,
    footerText,
    sections: sanitizedSections,
    values: sanitizedSections,
    delay: 1200,
  };
  try {
    console.log(`[EVOLUTION] Enviando LIST -> ${number}`, { instance, sections: body.sections.length });
    const resp = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", apikey: apiKey },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60000),
    });
    const resultText = await resp.text().catch(() => "");
    console.log("[EVOLUTION] sendList result:", resp.status, resultText.slice(0, 500));
    if (!resp.ok) {
      console.error("[EVOLUTION] Não foi possível enviar List Message; fallback por enquete/texto desativado.");
      return false;
    }
    return true;
  } catch (err) {
    console.error("[EVOLUTION] Erro no sendList:", err);
    return false;
  }
}

async function sendWahaPollMessage(
  toNumberOnly: string,
  poll: { name: string; values: string[]; selectableCount?: number },
  sessionName: string,
  wahaUrl: string,
  wahaApiKey: string,
): Promise<boolean> {
  const { base, apiKey } = resolveEvolution(wahaUrl, wahaApiKey);
  if (!base || !apiKey) return false;
  const instance = sessionName || "default";
  const number = String(toNumberOnly).replace(/\D/g, "");
  const endpoint = `${base}/message/sendPoll/${encodeURIComponent(instance)}`;
  const body = {
    number,
    name: poll.name,
    selectableCount: poll.selectableCount ?? 1,
    values: poll.values,
  };
  try {
    console.log(`[EVOLUTION] Enviando POLL -> ${number}`, { instance, options: poll.values.length });
    const resp = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", apikey: apiKey },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60000),
    });
    const resultText = await resp.text().catch(() => "");
    console.log("[EVOLUTION] sendPoll result:", resp.status, resultText.slice(0, 500));
    return resp.ok;
  } catch (err) {
    console.error("[EVOLUTION] Erro no sendPoll:", err);
    return false;
  }
}

async function sendWahaButtonsMessage(
  toNumberOnly: string,
  interactive: any,
  sessionName: string,
  wahaUrl: string,
  wahaApiKey: string,
  allowTextFallback = true,
) {
  const { base, apiKey } = resolveEvolution(wahaUrl, wahaApiKey);
  if (!base || !apiKey) return;
  const instance = sessionName || "default";
  const number = String(toNumberOnly).replace(/\D/g, "");
  const endpoint = `${base}/message/sendButtons/${encodeURIComponent(instance)}`;
  const body = {
    number,
    title: interactive.title || "",
    description: interactive.description || "Escolha uma opção",
    footer: interactive.footerText || "",
    buttons: (interactive.buttons || []).map((b: any, i: number) => ({
      type: "reply",
      displayText: b.text || b.displayText || `Opção ${i + 1}`,
      id: b.id || b.value || `btn_${i}`,
    })),
  };
  try {
    console.log(`[EVOLUTION] Enviando BUTTONS -> ${number}`, { instance, count: body.buttons.length });
    const resp = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", apikey: apiKey },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60000),
    });
    const resultText = await resp.text().catch(() => "");
    console.log("[EVOLUTION] sendButtons result:", resp.status, resultText.slice(0, 500));
    // Considera sucesso apenas quando a resposta contém uma "key" (id da mensagem entregue).
    // Muitas instâncias Evolution/Baileys retornam 200 sem entregar botões interativos.
    const looksDelivered = resp.ok && /"key"\s*:/.test(resultText);
    if (!looksDelivered && allowTextFallback) {
      console.warn("[EVOLUTION] sendButtons sem entrega confirmada — enviando fallback de texto numerado.");
      let fallback = `${body.description}\n`;
      body.buttons.forEach((b: any, i: number) => { fallback += `\n${i + 1}. ${b.displayText}`; });
      await sendWahaTextMessage(toNumberOnly, fallback, sessionName, wahaUrl, wahaApiKey);
    }
  } catch (err) {
    console.error("[EVOLUTION] Erro no sendButtons:", err);
    if (allowTextFallback) {
      let fallback = `${body.description}\n`;
      body.buttons.forEach((b: any, i: number) => { fallback += `\n${i + 1}. ${b.displayText}`; });
      try { await sendWahaTextMessage(toNumberOnly, fallback, sessionName, wahaUrl, wahaApiKey); } catch {}
    }
  }
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
  const { base, apiKey } = resolveEvolution(wahaUrl, wahaApiKey);
  if (!base || !apiKey) {
    console.error("[EVOLUTION] URL ou apikey ausentes para envio de mídia.");
    return;
  }
  const instance = sessionName || "default";
  const number = String(toNumberOnly).replace(/\D/g, "");

  const lower = (mediaType || "").toLowerCase();
  // Evolution aceita: image | video | document | audio
  // "gif" trata como image; "file" e tipos desconhecidos serão promovidos via mime abaixo
  let evoType: "image" | "video" | "document" | "audio" =
    lower === "image" || lower === "gif" ? "image"
    : lower === "video" ? "video"
    : lower === "audio" ? "audio"
    : lower === "document" ? "document"
    : "document";

  const lastPath = (() => {
    try { return new URL(mediaUrl).pathname.split("/").pop() || "arquivo"; }
    catch { return mediaUrl.split("?")[0].split("/").pop() || "arquivo"; }
  })();
  const inferredName = decodeURIComponent(lastPath);
  const lowerName = inferredName.toLowerCase();
  const mime =
    lowerName.endsWith(".pdf") ? "application/pdf" :
    lowerName.endsWith(".xlsx") ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" :
    lowerName.endsWith(".png") ? "image/png" :
    lowerName.endsWith(".webp") ? "image/webp" :
    lowerName.endsWith(".gif") ? "image/gif" :
    (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) ? "image/jpeg" :
    lowerName.endsWith(".mp4") ? "video/mp4" :
    lowerName.endsWith(".webm") ? "video/webm" :
    lowerName.endsWith(".mp3") ? "audio/mpeg" :
    (lowerName.endsWith(".ogg") || lowerName.endsWith(".oga")) ? "audio/ogg" :
    "application/octet-stream";

  // Promove document → image/video/audio automaticamente quando o mime indicar mídia renderizável.
  // Isso garante que, mesmo se o bloco vier configurado como "file" ou tipo desconhecido,
  // imagens/vídeos/áudios apareçam abertos no WhatsApp em vez de como documento.
  if (evoType === "document") {
    if (mime.startsWith("image/")) evoType = "image";
    else if (mime.startsWith("video/")) evoType = "video";
    else if (mime.startsWith("audio/")) evoType = "audio";
  }

  try {
    let endpoint: string;
    let body: Record<string, unknown>;

    if (evoType === "audio") {
      // Evolution tem endpoint dedicado para áudio do whatsapp (ptt)
      endpoint = `${base}/message/sendWhatsAppAudio/${encodeURIComponent(instance)}`;
      body = { number, audio: mediaUrl };
    } else {
      endpoint = `${base}/message/sendMedia/${encodeURIComponent(instance)}`;
      // IMPORTANTE: para image/video NÃO enviar fileName, senão Evolution envia como documento (não abre inline no WhatsApp)
      const isInlineMedia = evoType === "image" || evoType === "video";
      body = {
        number,
        mediatype: evoType,
        mimetype: mime,
        media: mediaUrl,
        ...(isInlineMedia ? {} : { fileName: inferredName }),
        ...(caption ? { caption } : {}),
      };
    }

    console.log(`[EVOLUTION] Enviando MEDIA (${evoType}) -> ${number}`, { instance, endpoint });
    const resp = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        apikey: apiKey,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(90000),
    });
    const resultText = await resp.text().catch(() => "");
    console.log("[EVOLUTION] sendMedia result:", resp.status, resultText.slice(0, 500));
    if (resp.ok) return;
  } catch (err) {
    console.error("[EVOLUTION] Erro no sendMedia:", err);
  }

  // Fallback: envia link como texto
  const fallbackLabel =
    evoType === "image" ? "imagem" :
    evoType === "video" ? "vídeo" :
    evoType === "audio" ? "áudio" : "arquivo";
  console.error("[EVOLUTION] ❌ Falha ao enviar mídia. Enviando link como fallback.");
  await sendWahaTextMessage(
    toNumberOnly,
    `${caption ? `${caption}\n` : ""}Link do ${fallbackLabel}: ${mediaUrl}`,
    sessionName,
    wahaUrl,
    wahaApiKey,
  );
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
  onResponse: (message: string, mediaUrl?: string, mediaType?: string, interactive?: any) => Promise<void>,
) {
  const { nodes } = flowData;
  if (!startNode) {
    startNode = nodes.find((n: any) => n.data.type === "start");
    if (!startNode) throw new Error("No start node found");
  }
  console.log(`[FLOW] Starting from node: ${startNode.id} (${startNode.data.type})`);
  await executeNode(startNode, flowData.nodes, flowData.edges, context, onResponse);
}

function normalizeListHandle(config: any, flatIndex: number): string {
  let cursor = 0;
  const sections = Array.isArray(config?.sections) ? config.sections : [];
  for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
    const items = sections[sectionIndex]?.items || sections[sectionIndex]?.rows || [];
    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
      if (cursor === flatIndex) return `section_${sectionIndex}_item_${itemIndex}`;
      cursor++;
    }
  }
  return `row_${flatIndex}`;
}

function getContentTypeOptions(): Array<{ value: string; label: string }> {
  return [
    { value: "divulgacao", label: "Divulgação" },
    { value: "promocao", label: "Promoção" },
    { value: "institucional", label: "Institucional" },
    { value: "evento", label: "Evento" },
    { value: "lancamento", label: "Lançamento" },
    { value: "educacional", label: "Educacional" },
  ];
}

function normalizeContentTypeResponse(value: string): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_]/g, "");
}

async function executeNode(
  node: any,
  nodes: any[],
  edges: any[],
  context: any,
  onResponse: (message: string, mediaUrl?: string, mediaType?: string, interactive?: any) => Promise<void>,
) {
  const data = node.data;
  const cfg = data.config || {};

  console.log(`[FLOW] Executing node: ${node.id} (${data.type})`);

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

  try {
    switch (data.type) {
      case "start": {
        console.log(`[FLOW] Start node - moving to next nodes`);
        const nextNodes = nexts(node.id);
        console.log(`[FLOW] Found ${nextNodes.length} next nodes from start`);
        for (const nx of nextNodes) await executeNode(nx, nodes, edges, context, onResponse);
        break;
      }
      case "send_message": {
        console.log(`[FLOW] send_message node - config:`, JSON.stringify(cfg));
        console.log(`[FLOW] cfg.messages:`, cfg.messages);
        console.log(`[FLOW] cfg.text:`, cfg.text);
        if (Array.isArray(cfg.messages) && cfg.messages.length) {
          console.log(`[FLOW] Sending ${cfg.messages.length} messages`);
          for (const m of cfg.messages) {
            const t = itp(m.text || "");
            console.log(`[FLOW] Sending message: "${t}"`);
            if (t) await onResponse(t);
            await new Promise((r) => setTimeout(r, 500));
          }
        } else if (cfg.text) {
          const t = itp(cfg.text);
          console.log(`[FLOW] Sending single message: "${t}"`);
          if (t) await onResponse(t);
        } else {
          console.log(`[FLOW] No message to send - cfg is empty or misconfigured`);
        }
        const nextNodes = nexts(node.id);
        console.log(`[FLOW] Moving to ${nextNodes.length} next nodes`);
        for (const nx of nextNodes) await executeNode(nx, nodes, edges, context, onResponse);
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
      const rawButtons = (cfg.buttons || []).map((b: any, i: number) => ({
        text: itp(b.text || `Opção ${i + 1}`),
        id: b.value || b.id || `btn_${i}`,
      }));
      // WhatsApp suporta no máximo 3 reply buttons. Adiciona "Sair" se houver espaço.
      const canFitExit = rawButtons.length <= 2;
      const buttons = canFitExit
        ? [...rawButtons, { text: "Sair", id: "__exit__" }]
        : rawButtons.slice(0, 3);
      const useButtons = buttons.length <= 3;
      const headerText = itp(cfg.headerText || cfg.title || "");
      const bodyText = itp(cfg.text || cfg.bodyText || "Escolha uma opção:");
      const footerText = itp(cfg.footerText || "");
      let interactive: any;
      if (useButtons) {
        interactive = {
          type: "buttons",
          title: headerText,
          description: bodyText,
          footerText,
          buttons,
        };
      } else {
        // Fallback: muitos botões → list
        const rows = [
          ...rawButtons.map((b: any, i: number) => ({
            title: b.text, description: "", rowId: b.id || `row_${i}`,
          })),
          { title: "Sair", description: "Encerrar atendimento", rowId: "__exit__" },
        ];
        interactive = {
          type: "list",
          title: headerText,
          description: bodyText,
          buttonText: itp(cfg.buttonText || "Ver opções"),
          footerText,
          sections: [{ title: itp(cfg.sectionTitle || "Opções"), rows }],
        };
      }
      let fallbackTxt = bodyText + "";
      buttons.forEach((b: any, i: number) => { fallbackTxt += `\n${i + 1}. ${b.text || b.title}`; });
      await onResponse(fallbackTxt, undefined, undefined, interactive);
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
        const headerTxt = itp(cfg.text || cfg.headerText || "");
        // Suporta dois formatos: { items: [...] } simples ou { sections: [{ title, rows }] }
        let sections: any[] = [];
        if (Array.isArray(cfg.sections) && cfg.sections.length) {
          sections = cfg.sections.map((sec: any, si: number) => ({
            title: itp(sec.title || ""),
            rows: (sec.rows || sec.items || []).map((r: any, i: number) => ({
              title: itp(r.title || r.label || `Opção ${i + 1}`),
              description: itp(r.description || ""),
              rowId: `section_${si}_item_${i}`,
            })),
          }));
        } else {
          const rows = (cfg.items || []).map((item: any, i: number) => ({
            title: itp(item.title || `Opção ${i + 1}`),
            description: itp(item.description || ""),
            rowId: `section_0_item_${i}`,
          }));
          sections = [{ title: itp(cfg.sectionTitle || "Opções"), rows }];
        }
        // Adiciona seção universal de Sair
        sections.push({
          title: "",
          rows: [{ title: "Sair", description: "Encerrar atendimento", rowId: "__exit__" }],
        });
        const interactive = {
          type: "list",
          title: itp(cfg.title || ""),
          description: headerTxt || "Escolha uma opção",
          buttonText: itp(cfg.buttonText || "Ver opções"),
          footerText: itp(cfg.footerText || ""),
          sections,
        };
        // Texto fallback
        let fallback = (headerTxt || "Escolha uma opção:") + "";
        let n = 1;
        for (const sec of sections) {
          if (sec.title) fallback += `\n\n*${sec.title}*`;
          for (const r of sec.rows) {
            fallback += `\n${n}. ${r.title}${r.description ? " - " + r.description : ""}`;
            n++;
          }
        }
        await onResponse(fallback, undefined, undefined, interactive);
        context.pendingNodeId = node.id;
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const sessionKey = `whatsapp_${context?.vars?.session || "default"}_${context?.vars?.from || ""}`;
        await supabase.from("chat_sessions").upsert(
          { session_id: sessionKey, context, updated_at: new Date().toISOString() },
          { onConflict: "session_id" },
        );
        return;
      }
      case "crm_gerar_relatorio": {
        console.log(`[FLOW] crm_gerar_relatorio - config:`, JSON.stringify(cfg));
        
        try {
          // Preparar variáveis interpoladas
          const apiVariables: Record<string, any> = {};
          if (cfg.apiVariables && typeof cfg.apiVariables === 'object') {
            for (const [key, varData] of Object.entries(cfg.apiVariables)) {
              const isVarObject = typeof varData === 'object' && varData !== null && 'value' in varData;
              const rawValue = isVarObject ? (varData as any).value : String(varData);
              const interpolatedValue = itp(rawValue);
              const type = isVarObject ? (varData as any).type : 'string';
              apiVariables[key] = { value: interpolatedValue, type };
            }
          }
          
          const reportVariables: Record<string, string> = {};
          if (cfg.reportVariables && typeof cfg.reportVariables === 'object') {
            for (const [key, value] of Object.entries(cfg.reportVariables)) {
              reportVariables[key] = itp(String(value || ""));
            }
          }
          
          const outputType = cfg.outputType || 'pdf';
          
          console.log(`[FLOW] Gerando relatório ${cfg.relatorioId}, formato: ${outputType}`);
          console.log(`[FLOW] API Variables:`, apiVariables);
          console.log(`[FLOW] Report Variables:`, reportVariables);
          
          // Chamar edge function gerar-relatorio-pdf
          const supabase = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
          const { data: result, error: reportError } = await supabase.functions.invoke('gerar-relatorio-pdf', {
            body: {
              relatorioId: cfg.relatorioId,
              apiVariables,
              reportVariables,
              outputType,
            }
          });
          
          // Verificar se houve erro
          if (reportError) {
            console.error(`[FLOW] Erro ao gerar relatório:`, reportError);
            
            // Verificar se é erro de limite de memória
            const errorMessage = reportError.message || JSON.stringify(reportError);
            if (errorMessage.includes('MEMORY_LIMIT_EXCEEDED') || errorMessage.includes('memory') || errorMessage.includes('413')) {
              await onResponse("❌ Muitos dados para gerar o relatório em XLSX. Por favor, use filtros ou gere um PDF.");
            } else {
              await onResponse("❌ Erro ao gerar relatório. Tente novamente mais tarde.");
            }
          } 
          // Verificar se resultado tem erro interno
          else if (result?.error) {
            console.error(`[FLOW] Erro retornado pela função:`, result.error);
            
            if (result.code === 'MEMORY_LIMIT_EXCEEDED') {
              await onResponse("❌ Muitos dados para gerar o relatório em XLSX. Por favor, use filtros ou gere um PDF.");
            } else {
              await onResponse(`❌ Erro ao gerar relatório: ${result.error}`);
            }
          }
          // Sucesso - arquivo gerado
          else if (result?.fileUrl) {
            console.log(`[FLOW] Relatório gerado:`, result.fileUrl);
            
            // Armazenar URL do relatório em variável se configurado
            if (cfg.outputVariable) {
              context.vars[cfg.outputVariable] = result.fileUrl;
            }
            
            // Enviar arquivo via WhatsApp (apenas o arquivo com caption)
            const caption = itp(cfg.successMessage || "📄 Seu relatório está pronto!");
            const mediaType = 'document';
            
            console.log(`[FLOW] Enviando relatório: ${result.fileUrl}`);
            console.log(`[FLOW] Caption: ${caption}`);
            console.log(`[FLOW] Media type: ${mediaType}`);
            
            await onResponse(caption, result.fileUrl, mediaType);
            console.log(`[FLOW] ✅ Relatório enviado via WhatsApp`);
          } 
          // Resposta inválida
          else {
            console.error(`[FLOW] Resposta inválida do gerador:`, result);
            await onResponse("❌ Erro ao gerar relatório. Resposta inválida.");
          }
        } catch (err) {
          console.error(`[FLOW] Exception ao gerar relatório:`, err);
          await onResponse("❌ Erro ao processar geração de relatório.");
        }
        
        // Continuar para próximos nós apenas após terminar
        console.log(`[FLOW] Relatório concluído, seguindo para próximos nós`);
        for (const nx of nexts(node.id)) await executeNode(nx, nodes, edges, context, onResponse);
        break;
      }
      case "publish_social_post": {
        console.log(`[FLOW] publish_social_post - config:`, JSON.stringify(cfg));
        try {
          const platforms: string[] = Array.isArray(cfg.platforms) && cfg.platforms.length
            ? cfg.platforms
            : ["instagram"];
          const postType = cfg.postType || "image";
          const mediaUrlRaw = itp(cfg.mediaUrl || "");
          const captionTxt = itp(cfg.caption || "");
          const hashtagsTxt = itp(cfg.hashtags || "");
          const scheduledAt = itp(cfg.scheduledAt || "");
          const fullCaption = [captionTxt, hashtagsTxt].filter(Boolean).join("\n\n");

          // Suporta múltiplas mídias separadas por vírgula (carrossel)
          const medias = mediaUrlRaw
            .split(",")
            .map((u: string) => u.trim())
            .filter(Boolean);

          const estabId = context.vars.estabelecimento_id;
          if (!estabId) {
            await onResponse("❌ Não foi possível publicar: estabelecimento não identificado.");
          } else if (!medias.length && postType !== "text") {
            await onResponse("❌ Não foi possível publicar: nenhuma mídia informada.");
          } else {
            const supabase = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
            const results: any[] = [];
            for (const platform of platforms) {
              const { data: pubResult, error: pubError } = await supabase.functions.invoke(
                "publish-social-media",
                {
                  body: {
                    estabelecimento_id: estabId,
                    platform,
                    postType,
                    medias,
                    caption: fullCaption,
                    scheduledAt: scheduledAt || undefined,
                  },
                },
              );
              if (pubError || pubResult?.error) {
                const errMsg = pubError?.message || pubResult?.error || "Erro desconhecido";
                console.error(`[FLOW] Erro ao publicar em ${platform}:`, errMsg);
                await onResponse(`❌ Falha ao publicar em ${platform}: ${errMsg}`);
                results.push({ platform, success: false, error: errMsg });
              } else {
                console.log(`[FLOW] ✅ Publicado em ${platform}:`, pubResult);
                results.push({ platform, success: true, ...pubResult });
                if (pubResult?.permalink) {
                  await onResponse(`✅ Publicado em ${platform}!\n🔗 ${pubResult.permalink}`);
                } else {
                  await onResponse(`✅ Publicado em ${platform}!`);
                }
              }
            }
            const outVar = cfg.outputVariable || "post_publicado";
            const firstOk = results.find((r) => r.success);
            context.vars[outVar] = firstOk || results[0] || {};
            context.vars[`${outVar}_resultados`] = results;
            if (firstOk?.permalink) context.vars[`${outVar}_permalink`] = firstOk.permalink;
            if (firstOk?.post_id) context.vars[`${outVar}_id`] = firstOk.post_id;
          }
        } catch (err) {
          console.error(`[FLOW] Exception ao publicar nas redes sociais:`, err);
          await onResponse("❌ Erro ao publicar nas redes sociais.");
        }
        for (const nx of nexts(node.id)) await executeNode(nx, nodes, edges, context, onResponse);
        break;
      }
      case "product_search_select": {
        console.log(`[FLOW] product_search_select - config:`, JSON.stringify(cfg));
        const stateKey = `__product_search_${node.id}`;
        const state = context.vars[stateKey];
        const sourceVar = (cfg.sourceVariable || "").trim();
        const askText = itp(cfg.askText || "Qual produto você está procurando?");
        const limit = Math.max(1, Math.min(10, parseInt(cfg.limit) || 5));
        const estId = context.vars.estabelecimento_id;

        // Determina o termo de busca
        let query: string | null = null;
        if (sourceVar && context.vars[sourceVar]) {
          query = String(context.vars[sourceVar]).trim();
        } else if (state?.stage === "search_query_received") {
          query = String(state.query || "").trim();
        }

        if (!query) {
          // Pergunta o nome do produto e aguarda resposta
          await onResponse(askText);
          context.vars[stateKey] = { stage: "awaiting_query" };
          context.pendingNodeId = node.id;
          const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
          const sessionKey = `whatsapp_${context?.vars?.session || "default"}_${context?.vars?.from || ""}`;
          await supabase.from("chat_sessions").upsert(
            { session_id: sessionKey, context, updated_at: new Date().toISOString() },
            { onConflict: "session_id" },
          );
          return;
        }

        // Realiza a busca no catálogo
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        let q = supabase
          .from("produtos")
          .select("id,nome,codigo,foto_url")
          .eq("ativo", true)
          .ilike("nome", `%${query}%`)
          .limit(limit);
        if (estId) q = q.eq("estabelecimento_id", estId);
        const { data: produtos, error: prodErr } = await q;

        if (prodErr) {
          console.error("[FLOW] Erro buscando produtos:", prodErr);
          await onResponse("❌ Erro ao buscar produtos no catálogo.");
          delete context.vars[stateKey];
          for (const nx of nexts(node.id)) await executeNode(nx, nodes, edges, context, onResponse);
          break;
        }

        if (!produtos || produtos.length === 0) {
          await onResponse(itp(cfg.notFoundMessage || "Nenhum produto encontrado com esse nome."));
          delete context.vars[stateKey];
          // Permite re-perguntar se o termo veio da pergunta interativa (não da variável)
          if (!sourceVar) {
            await onResponse(askText);
            context.vars[stateKey] = { stage: "awaiting_query" };
            context.pendingNodeId = node.id;
            const sessionKey = `whatsapp_${context?.vars?.session || "default"}_${context?.vars?.from || ""}`;
            await supabase.from("chat_sessions").upsert(
              { session_id: sessionKey, context, updated_at: new Date().toISOString() },
              { onConflict: "session_id" },
            );
            return;
          }
          for (const nx of nexts(node.id)) await executeNode(nx, nodes, edges, context, onResponse);
          break;
        }

        // Envia cada produto (imagem + nome numerado)
        for (let i = 0; i < produtos.length; i++) {
          const p = produtos[i];
          const caption = `${i + 1}. ${p.nome}${p.codigo ? ` (${p.codigo})` : ""}`;
          if (p.foto_url) {
            await onResponse(caption, p.foto_url, "image");
          } else {
            await onResponse(`${caption}\n(sem imagem)`);
          }
        }
        await onResponse(itp(cfg.selectionPrompt || "Responda com o número do produto desejado:"));

        context.vars[stateKey] = { stage: "awaiting_selection", candidates: produtos };
        context.pendingNodeId = node.id;
        const sessionKey = `whatsapp_${context?.vars?.session || "default"}_${context?.vars?.from || ""}`;
        await supabase.from("chat_sessions").upsert(
          { session_id: sessionKey, context, updated_at: new Date().toISOString() },
          { onConflict: "session_id" },
        );
        return;
      }
      /* ============ LÓGICA ============ */
      case "condition": {
        const conditions: any[] = cfg.conditions || [];
        let matchedIndex = -1;
        for (let i = 0; i < conditions.length; i++) {
          try {
            const expr = itp(String(conditions[i].expression || ""));
            // eslint-disable-next-line no-eval
            if (eval(expr)) { matchedIndex = i; break; }
          } catch (e) {
            console.error(`[FLOW] condition eval error:`, e);
          }
        }
        const outgoing = edges.filter((e: any) => e.source === node.id);
        let target: any = null;
        if (matchedIndex >= 0 && outgoing[matchedIndex]) {
          target = nodes.find((n: any) => n.id === outgoing[matchedIndex].target);
        } else if (outgoing[0]) {
          target = nodes.find((n: any) => n.id === outgoing[0].target);
        }
        if (target) await executeNode(target, nodes, edges, context, onResponse);
        break;
      }
      case "formulas": {
        const outVar = cfg.outputVariable || "resultado";
        try {
          const expr = itp(String(cfg.formula || ""));
          // eslint-disable-next-line no-eval
          context.vars[outVar] = eval(expr);
        } catch (e) {
          console.error(`[FLOW] formulas error:`, e);
        }
        for (const nx of nexts(node.id)) await executeNode(nx, nodes, edges, context, onResponse);
        break;
      }
      case "jump_to": {
        const tgt = cfg.targetNodeId || "";
        const target = nodes.find((n: any) => n.id === tgt);
        if (target) await executeNode(target, nodes, edges, context, onResponse);
        else for (const nx of nexts(node.id)) await executeNode(nx, nodes, edges, context, onResponse);
        break;
      }
      case "lead_scoring": {
        const field = cfg.scoreField || "pontuacao_lead";
        const pts = Number(cfg.points) || 0;
        const act = cfg.action || "add";
        const cur = Number(context.vars[field]) || 0;
        context.vars[field] = act === "add" ? cur + pts : cur - pts;
        for (const nx of nexts(node.id)) await executeNode(nx, nodes, edges, context, onResponse);
        break;
      }
      case "goal": {
        const name = cfg.goalName || "conversao";
        const val = cfg.value || 0;
        context.vars[`goal_${name}`] = val;
        console.log(`[FLOW] 🎯 Goal: ${name} = ${val}`);
        for (const nx of nexts(node.id)) await executeNode(nx, nodes, edges, context, onResponse);
        break;
      }
      case "global_keywords":
      case "keyword_jump": {
        // No WhatsApp tratamos como pass-through (regras são avaliadas no roteador de entrada)
        for (const nx of nexts(node.id)) await executeNode(nx, nodes, edges, context, onResponse);
        break;
      }

      /* ============ WHATSAPP ESSENCIAL extras ============ */
      case "keyword_options": {
        const question = itp(cfg.question || "Escolha uma opção:");
        const buttons: any[] = cfg.buttons || cfg.keywords || [];
        let txt = question;
        buttons.forEach((b: any, i: number) => {
          const label = b.label || b.text || `Opção ${i + 1}`;
          txt += `\n${i + 1}. ${label}`;
        });
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
      case "message_template": {
        const name = cfg.templateName || "";
        const lang = cfg.language || "pt_BR";
        const bodyTxt = itp(cfg.body || cfg.text || "");
        if (bodyTxt) {
          await onResponse(bodyTxt);
        } else {
          await onResponse(`📧 [Template: ${name} / ${lang}]`);
        }
        for (const nx of nexts(node.id)) await executeNode(nx, nodes, edges, context, onResponse);
        break;
      }
      case "opt_in_out": {
        const action = cfg.action || "opt-in";
        const category = cfg.category || "marketing";
        try {
          const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
          const phone = context.vars.from || "";
          await supabase.from("customer_canal_preferences").upsert(
            {
              telefone: phone,
              canal: "whatsapp",
              categoria: category,
              opt_in: action === "opt-in",
              updated_at: new Date().toISOString(),
            },
            { onConflict: "telefone,canal,categoria" },
          );
        } catch (e) {
          console.error(`[FLOW] opt_in_out error:`, e);
        }
        context.vars[`opt_${category}`] = action === "opt-in";
        for (const nx of nexts(node.id)) await executeNode(nx, nodes, edges, context, onResponse);
        break;
      }
      case "opt_in_check": {
        const category = cfg.category || "marketing";
        let hasOptIn = false;
        try {
          const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
          const phone = context.vars.from || "";
          const { data } = await supabase
            .from("customer_canal_preferences")
            .select("opt_in")
            .eq("telefone", phone)
            .eq("canal", "whatsapp")
            .eq("categoria", category)
            .maybeSingle();
          hasOptIn = !!data?.opt_in;
        } catch (e) {
          console.error(`[FLOW] opt_in_check error:`, e);
        }
        const outgoing = edges.filter((e: any) => e.source === node.id);
        const target = nodes.find((n: any) => n.id === outgoing[hasOptIn ? 0 : 1]?.target);
        if (target) await executeNode(target, nodes, edges, context, onResponse);
        break;
      }
      case "audience": {
        const segments: string[] = cfg.segments || [];
        const action = cfg.action || "add";
        context.vars.audience_action = action;
        context.vars.audience_segments = segments;
        for (const nx of nexts(node.id)) await executeNode(nx, nodes, edges, context, onResponse);
        break;
      }

      /* ============ CÓDIGO / INTEGRAÇÕES ============ */
      case "webhook": {
        const url = itp(cfg.url || "");
        const method = (cfg.method || "POST").toUpperCase();
        const outVar = cfg.outputVariable || "webhook_response";
        if (!url) {
          for (const nx of nexts(node.id)) await executeNode(nx, nodes, edges, context, onResponse);
          break;
        }
        try {
          const headers: Record<string, string> = { "Content-Type": "application/json" };
          if (cfg.headers && typeof cfg.headers === "object") {
            for (const [k, v] of Object.entries(cfg.headers)) headers[k] = itp(String(v));
          }
          const bodyStr = cfg.body ? itp(typeof cfg.body === "string" ? cfg.body : JSON.stringify(cfg.body)) : undefined;
          const r = await fetch(url, {
            method,
            headers,
            body: method === "GET" ? undefined : bodyStr,
          });
          const txt = await r.text();
          try { context.vars[outVar] = JSON.parse(txt); } catch { context.vars[outVar] = txt; }
          context.vars[`${outVar}_status`] = r.status;
        } catch (e) {
          console.error(`[FLOW] webhook error:`, e);
          context.vars[`${outVar}_error`] = String(e);
        }
        for (const nx of nexts(node.id)) await executeNode(nx, nodes, edges, context, onResponse);
        break;
      }
      case "dynamic_data": {
        const outVar = cfg.outputVariable || "dados_dinamicos";
        try {
          const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
          const { data, error } = await supabase.functions.invoke("execute-dynamic-query", {
            body: {
              source: cfg.source,
              query: itp(cfg.query || ""),
              params: cfg.params || {},
            },
          });
          if (error) throw error;
          context.vars[outVar] = data;
        } catch (e) {
          console.error(`[FLOW] dynamic_data error:`, e);
          context.vars[`${outVar}_error`] = String(e);
        }
        for (const nx of nexts(node.id)) await executeNode(nx, nodes, edges, context, onResponse);
        break;
      }
      case "trigger_automation": {
        const automationId = cfg.automationId || "";
        const outVar = cfg.outputVariable || "automacao_disparada";
        try {
          const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
          const params: Record<string, any> = {};
          if (cfg.parameters && typeof cfg.parameters === "object") {
            for (const [k, v] of Object.entries(cfg.parameters)) params[k] = itp(String(v));
          }
          const { data, error } = await supabase.functions.invoke("marketing-automation-scheduler", {
            body: { automationId, params, triggeredBy: "whatsapp_bot", phone: context.vars.from },
          });
          if (error) throw error;
          context.vars[outVar] = data || { triggered: true };
        } catch (e) {
          console.error(`[FLOW] trigger_automation error:`, e);
          context.vars[`${outVar}_error`] = String(e);
        }
        for (const nx of nexts(node.id)) await executeNode(nx, nodes, edges, context, onResponse);
        break;
      }

      /* ============ DISPARAR WORKFLOW (multimódulo) ============ */
      case "trigger_workflow": {
        const moduleKey = cfg.module || "bot";
        const workflowId = cfg.workflowId || "";
        const outVar = cfg.outputVariable || "workflow_disparado";
        const wfName = cfg.workflowName || workflowId || "(sem nome)";

        // Monta payload de variáveis para enviar ao workflow
        let extraPayload: Record<string, any> = {};
        if (cfg.payloadJson) {
          try { extraPayload = JSON.parse(itp(String(cfg.payloadJson))); } catch {}
        }
        const passedVars = cfg.passVariables !== false ? { ...context.vars } : {};
        const variablesForWf = { ...passedVars, ...extraPayload };

        if (!workflowId) {
          context.vars[outVar] = { ok: false, error: "workflow_nao_selecionado" };
          for (const nx of nexts(node.id)) await executeNode(nx, nodes, edges, context, onResponse);
          break;
        }

        // 🎯 Caso especial: AI Studio — gera imagem/vídeo e envia ao usuário
        if (moduleKey === "ai_studio") {
          try {
            // 1) Preview — descobre tipo e tempo estimado
            const previewResp = await fetch(`${SUPABASE_URL}/functions/v1/bot-run-ai-studio-workflow`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              },
              body: JSON.stringify({ workflowId, variables: variablesForWf, preview: true }),
            });
            const previewData = await previewResp.json().catch(() => ({}));
            if (!previewResp.ok) {
              await onResponse(`⚠️ Não foi possível preparar a geração: ${previewData?.error || "erro desconhecido"}`);
              context.vars[outVar] = { ok: false, error: previewData?.error || "preview_failed" };
              for (const nx of nexts(node.id)) await executeNode(nx, nodes, edges, context, onResponse);
              break;
            }
            const mediaType: "image" | "video" = previewData?.mediaType || "image";
            const estSecs: number = Number(previewData?.estimatedSeconds) || (mediaType === "video" ? 120 : 25);
            const tipoLabel = mediaType === "video" ? "vídeo" : "imagem";
            const tempoLabel = estSecs >= 60
              ? `cerca de ${Math.ceil(estSecs / 60)} minuto(s)`
              : `cerca de ${estSecs} segundos`;
            await onResponse(`⏳ Estou gerando sua ${tipoLabel} agora. Isso pode levar ${tempoLabel}. Já te envio assim que ficar pronta!`);

            // 2) Geração real (pode demorar — fetch sem timeout)
            const genResp = await fetch(`${SUPABASE_URL}/functions/v1/bot-run-ai-studio-workflow`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              },
              body: JSON.stringify({ workflowId, variables: variablesForWf }),
            });
            const genData = await genResp.json().catch(() => ({}));
            if (!genResp.ok || !genData?.mediaUrl) {
              await onResponse(`❌ Não consegui gerar a ${tipoLabel}: ${genData?.error || "erro desconhecido"}.`);
              context.vars[outVar] = { ok: false, error: genData?.error || "generation_failed" };
            } else {
              await onResponse("", genData.mediaUrl, mediaType);
              context.vars[outVar] = {
                ok: true,
                module: moduleKey,
                workflowId,
                workflowName: genData?.workflowName || wfName,
                mediaUrl: genData.mediaUrl,
                mediaType,
                model: genData?.model,
              };
              // Salva também em variável padronizada para facilitar uso depois
              context.vars["midia_gerada"] = genData.mediaUrl;
              context.vars["midia_gerada_tipo"] = mediaType;
            }
          } catch (e: any) {
            console.error("[FLOW] trigger_workflow(ai_studio) erro:", e);
            await onResponse(`❌ Falha ao gerar mídia: ${e?.message || e}`);
            context.vars[outVar] = { ok: false, error: String(e?.message || e) };
          }
          for (const nx of nexts(node.id)) await executeNode(nx, nodes, edges, context, onResponse);
          break;
        }

        // Outros módulos — apenas registra o disparo (compatível com simulador)
        context.vars[outVar] = {
          ok: true,
          module: moduleKey,
          workflowId,
          workflowName: wfName,
          triggeredAt: new Date().toISOString(),
        };
        for (const nx of nexts(node.id)) await executeNode(nx, nodes, edges, context, onResponse);
        break;
      }

      /* ============ DISPARO & LOOPS ============ */
      case "send_whatsapp_to_number": {
        const phone = itp(cfg.phoneNumber || "").replace(/\D/g, "");
        const msg = itp(cfg.message || "");
        const mediaUrl = itp(cfg.mediaUrl || "");
        const outVar = cfg.outputVariable || "envio_whatsapp_status";
        if (!phone) {
          context.vars[outVar] = "erro_sem_numero";
        } else {
          try {
            const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
            const { data: wahaCfg } = await supabase
              .from("whatsapp_config")
              .select("waha_url, waha_api_key, session_name")
              .limit(1)
              .maybeSingle();
            const sessionName = wahaCfg?.session_name || context.vars.session || "default";
            const wahaUrl = wahaCfg?.waha_url || env("EVOLUTION_URL") || env("WAHA_URL");
            const wahaKey = wahaCfg?.waha_api_key || env("EVOLUTION_API_KEY") || env("WAHA_API_KEY");
            if (mediaUrl) {
              await sendWahaMediaMessage(phone, msg, "image", mediaUrl, sessionName, wahaUrl, wahaKey);
            } else if (msg) {
              await sendWahaTextMessage(phone, msg, sessionName, wahaUrl, wahaKey);
            }
            context.vars[outVar] = "enviado";
          } catch (e) {
            console.error(`[FLOW] send_whatsapp_to_number error:`, e);
            context.vars[outVar] = "erro";
          }
        }
        for (const nx of nexts(node.id)) await executeNode(nx, nodes, edges, context, onResponse);
        break;
      }
      case "api_loop": {
        const outVar = cfg.outputVariable || "loop_resultado";
        const url = itp(cfg.url || "");
        const method = (cfg.method || "GET").toUpperCase();
        const maxRows = Math.min(Number(cfg.maxRows) || 50, 200);
        const delayMs = Math.max(0, (Number(cfg.delaySeconds) || 0) * 1000);
        const itemVar = cfg.itemVariable || "item";
        if (!url) { for (const nx of nexts(node.id)) await executeNode(nx, nodes, edges, context, onResponse); break; }
        try {
          const headers: Record<string, string> = { "Content-Type": "application/json" };
          if (Array.isArray(cfg.headers)) {
            for (const h of cfg.headers) if (h?.key) headers[h.key] = itp(String(h.value || ""));
          }
          const r = await fetch(url, { method, headers, body: method === "GET" ? undefined : itp(cfg.body || "") });
          const json = await r.json();
          let items: any[] = Array.isArray(json) ? json : (cfg.arrayPath ? cfg.arrayPath.split(".").reduce((o: any, k: string) => o?.[k], json) : []);
          items = (items || []).slice(0, maxRows);
          context.vars[outVar] = { total: items.length, status: "ok" };
          const nextEdges = edges.filter((e: any) => e.source === node.id);
          for (const it of items) {
            context.vars[itemVar] = it;
            for (const ne of nextEdges) {
              const nx = nodes.find((n: any) => n.id === ne.target);
              if (nx) await executeNode(nx, nodes, edges, context, onResponse);
            }
            if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
          }
        } catch (e) {
          console.error(`[FLOW] api_loop error:`, e);
          context.vars[outVar] = { status: "erro", error: String(e) };
          for (const nx of nexts(node.id)) await executeNode(nx, nodes, edges, context, onResponse);
        }
        break;
      }

      /* ============ ROTEAMENTO ============ */
      case "transferir_omnichannel":
      case "enviar_fila":
      case "atribuir_atendente":
      case "definir_prioridade": {
        try {
          const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
          const phone = context.vars.from || "";
          const updates: Record<string, any> = { bot_paused: true, updated_at: new Date().toISOString() };
          if (data.type === "enviar_fila") {
            updates.fila_id = cfg.filaId || null;
            updates.fila_nome = cfg.filaNome || null;
            updates.prioridade = cfg.prioridade ?? 0;
          } else if (data.type === "atribuir_atendente") {
            updates.atendente_id = cfg.atendenteId || null;
            updates.atendente_nome = cfg.atendenteNome || null;
          } else if (data.type === "definir_prioridade") {
            updates.prioridade_nivel = cfg.prioridade || "normal";
            updates.prioridade_motivo = cfg.motivo || null;
          } else if (data.type === "transferir_omnichannel") {
            updates.workflow_id = cfg.workflowId || null;
            updates.workflow_nome = cfg.workflowNome || null;
          }
          await supabase
            .from("conversations")
            .update(updates)
            .eq("phone_number", phone);
          await onResponse("Você foi transferido para um atendente. Aguarde, por favor.");
        } catch (e) {
          console.error(`[FLOW] roteamento error:`, e);
        }
        // Pausa o fluxo: handoff para humano
        return;
      }

      /* ============ CRM ============ */
      case "crm_cadastro_empresa": {
        try {
          const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
          const fieldMappings = cfg.fieldMappings || {};
          const cnpjVar = cfg.cnpjVariable || "cnpj";
          const cnpj = String(context.vars[cnpjVar] || "").replace(/\D/g, "");
          const payload: Record<string, any> = { cnpj };
          for (const [field, varName] of Object.entries(fieldMappings)) {
            const v = context.vars[String(varName)];
            if (v !== undefined && v !== "") payload[field] = v;
          }
          payload.estabelecimento_id = context.vars.estabelecimento_id;
          const { data: existing } = await supabase
            .from("empresas")
            .select("id")
            .eq("cnpj", cnpj)
            .maybeSingle();
          let empresaId = existing?.id;
          if (empresaId && cfg.updateExisting !== false) {
            await supabase.from("empresas").update(payload).eq("id", empresaId);
          } else if (!empresaId) {
            const { data: created } = await supabase.from("empresas").insert(payload).select("id").single();
            empresaId = created?.id;
          }
          const outVar = cfg.outputVariable || "cliente_novo";
          context.vars[outVar] = { id: empresaId, cnpj, criado: !existing };
        } catch (e) {
          console.error(`[FLOW] crm_cadastro_empresa error:`, e);
        }
        for (const nx of nexts(node.id)) await executeNode(nx, nodes, edges, context, onResponse);
        break;
      }
      case "crm_agenda_rapida": {
        try {
          const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
          const phone = (context.vars.from || "").replace(/\D/g, "");
          const { data: customer } = await supabase
            .from("customers")
            .select("id, nome")
            .ilike("telefone", `%${phone.slice(-9)}%`)
            .maybeSingle();
          const titulo = itp(cfg.tituloTarefa || "Retorno Bot");
          const valor = itp(cfg.valorAgenda || "");
          const dueDate = valor ? new Date(valor) : new Date(Date.now() + 24 * 60 * 60 * 1000);
          const { data: created } = await supabase
            .from("calendario_tarefas")
            .insert({
              title: titulo,
              date: dueDate.toISOString(),
              contact_id: customer?.id || null,
              contact_name: customer?.nome || `WhatsApp ${phone}`,
              estabelecimento_id: context.vars.estabelecimento_id,
            })
            .select("id")
            .single();
          const outVar = cfg.outputVariable || "tarefa_criada";
          context.vars[outVar] = { id: created?.id, titulo };
        } catch (e) {
          console.error(`[FLOW] crm_agenda_rapida error:`, e);
        }
        for (const nx of nexts(node.id)) await executeNode(nx, nodes, edges, context, onResponse);
        break;
      }

      /* ============ IA / MÍDIA ============ */
      case "ai_agent": {
        try {
          const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
          const userMsg = context.vars.userMessage || "";
          const sys = itp(cfg.systemPrompt || "Você é um assistente útil.");
          const { data, error } = await supabase.functions.invoke("chat-agent-execute", {
            body: {
              agentId: cfg.agentId,
              systemPrompt: sys,
              model: cfg.model || "google/gemini-2.5-flash",
              messages: [{ role: "user", content: userMsg }],
              context: context.vars,
            },
          });
          if (error) throw error;
          const reply = data?.reply || data?.content || data?.text;
          if (reply) await onResponse(String(reply));
          if (cfg.outputVariable) context.vars[cfg.outputVariable] = reply;
        } catch (e) {
          console.error(`[FLOW] ai_agent error:`, e);
          await onResponse("⚠️ Erro ao consultar agente IA.");
        }
        for (const nx of nexts(node.id)) await executeNode(nx, nodes, edges, context, onResponse);
        break;
      }
      case "generate_ai_media": {
        try {
          const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
          const userPrompt = itp(cfg.textPrompt || cfg.prompt || "");
          const basePrompt = itp(cfg.basePrompt || "");
          const variations = cfg.variations || 1;
          const estimatedSeconds = Math.max(10, variations * 20);
          const estimatedText = estimatedSeconds < 60
            ? `${estimatedSeconds} segundos`
            : `${Math.ceil(estimatedSeconds / 60)} minuto(s)`;
          await onResponse(`🎨 Gerando mídia, tempo estimado ${estimatedText}...`);

          // Coleta referências (produto, influencer, extras) das variáveis do contexto
          const refUrls: string[] = [];
          const refLabels: string[] = [];
          const pushRef = (u: any, label: string) => {
            if (typeof u === "string" && u && !refUrls.includes(u)) {
              refUrls.push(u);
              refLabels.push(label);
            } else if (Array.isArray(u)) {
              u.forEach((x) => pushRef(x, label));
            }
          };
          pushRef(
            context.vars.product_image_url ||
              context.vars.product_image ||
              context.vars.produto_imagem_url ||
              context.vars.produto_foto_url ||
              context.vars.imagem_produto,
            "product",
          );
          pushRef(
            context.vars.influencer_image_url ||
              context.vars.influencer_image ||
              context.vars.influencer_imagem_url ||
              context.vars.influencer_foto_url,
            "influencer",
          );
          if (cfg.refImageUrl) pushRef(itp(cfg.refImageUrl), "ref");

          const titulo = context.vars.tc_title || "";
          const subtitulo = context.vars.tc_subtitle || "";
          const corpo = context.vars.tc_body || "";
          const textHints = [
            titulo ? `Título: "${titulo}"` : "",
            subtitulo ? `Subtítulo: "${subtitulo}"` : "",
            corpo ? `Texto auxiliar: "${corpo}"` : "",
          ].filter(Boolean).join("\n");
          const promptFinal = [userPrompt, textHints].filter(Boolean).join("\n\n");

          const { data, error } = await supabase.functions.invoke("bot-generate-ai-media", {
            body: {
              prompt: promptFinal,
              basePrompt,
              variations: cfg.variations || 1,
              estabelecimentoId: context.vars.estabelecimento_id,
              referenceImageUrls: refUrls,
              referenceLabels: refLabels,
              aspectRatio: cfg.aspectRatio || "1:1",
              contentTypeBadge: context.vars.content_type_use_badge
                ? (getContentTypeOptions().find((o) => o.value === context.vars.content_type)?.label || context.vars.content_type || "")
                : "",
            },
          });
          if (error) throw error;
          const urls: string[] = Array.isArray(data?.images)
            ? data.images
            : (data?.items || data?.results || []).map((it: any) => it?.url).filter(Boolean);
          if (!urls.length) {
            console.error(`[FLOW] generate_ai_media: nenhuma imagem retornada`, data?.errors);
            await onResponse("⚠️ Não foi possível gerar a mídia.");
          } else {
            for (const url of urls.slice(0, 4)) {
              await onResponse("", url, "image");
              // pequeno respiro entre mídias para não saturar o Evolution/WhatsApp
              await new Promise((r) => setTimeout(r, 600));
            }
            if (cfg.outputVariable) context.vars[cfg.outputVariable] = urls[0];
            context.vars.last_generated_media_url = urls[0];
            context.vars.last_generated_media_urls = urls;
          }
        } catch (e) {
          console.error(`[FLOW] generate_ai_media error:`, e);
          await onResponse("⚠️ Não foi possível gerar a mídia.");
        }
        // pausa antes do próximo bloco (ex.: botões de resposta) para evitar
        // que o WhatsApp/Evolution descarte a próxima mensagem logo após mídias.
        await new Promise((r) => setTimeout(r, 800));
        const nextNodes = nexts(node.id);
        console.log(`[FLOW] generate_ai_media → ${nextNodes.length} próximo(s) bloco(s):`,
          nextNodes.map((n: any) => `${n.id}(${n?.data?.type})`).join(", "));
        for (const nx of nextNodes) {
          try {
            await executeNode(nx, nodes, edges, context, onResponse);
          } catch (err) {
            console.error(`[FLOW] generate_ai_media → erro ao executar próximo bloco ${nx?.id}:`, err);
          }
        }
        break;
      }
      case "text_content": {
        const blockMode = cfg.blockMode === "fixed" || cfg.blockMode === "options" ? cfg.blockMode : "advanced";
        if (blockMode === "fixed") {
          if (cfg.title) context.vars.tc_title = itp(cfg.title);
          if (cfg.subtitle) context.vars.tc_subtitle = itp(cfg.subtitle);
          if (cfg.body && cfg.bodyEnabled !== false) context.vars.tc_body = itp(cfg.body);
          for (const nx of nexts(node.id)) await executeNode(nx, nodes, edges, context, onResponse);
          break;
        }
        // Modo options → lista suspensa (pode ter várias opções)
        // Modo advanced (sim/não) → botões de resposta
        const opts: any[] = Array.isArray(cfg.options) ? cfg.options : [];
        const prompt = itp(cfg.optionsPrompt || (opts.length ? "Escolha um dos textos:" : "Você quer usar título e subtítulo na imagem?"));
        let interactive: any;
        let fallback = prompt;
        if (opts.length) {
          const rows = [
            ...opts.map((o: any, i: number) => ({
              title: (itp(o.label || `Opção ${i + 1}`) + "").slice(0, 24),
              description: "",
              rowId: `tc_${i + 1}`,
            })),
            { title: "Sair", description: "Encerrar atendimento", rowId: "__exit__" },
          ];
          interactive = {
            type: "list",
            title: "",
            description: prompt,
            buttonText: "Ver opções",
            footerText: "",
            sections: [{ title: "Opções", rows }],
          };
          rows.forEach((r: any, i: number) => { fallback += `\n${i + 1}. ${r.title}`; });
        } else {
          // Modo advanced: Sim/Não → se Sim, pergunta método (Digitar / IA) → coleta
          const q = itp(cfg.askPrompt || "Deseja incluir conteúdo de texto (título/subtítulo/corpo) na peça?");
          fallback = `${q}\n1. Sim\n2. Não\n3. Sair`;
          await onResponse(fallback);
          context.vars.__tc_sub = "choice";
          context.pendingNodeId = node.id;
          const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
          const sessionKey = `whatsapp_${context?.vars?.session || "default"}_${context?.vars?.from || ""}`;
          await supabase.from("chat_sessions").upsert(
            { session_id: sessionKey, context, updated_at: new Date().toISOString() },
            { onConflict: "session_id" },
          );
          return;
        }
        await onResponse(fallback, undefined, undefined, interactive);
        context.pendingNodeId = node.id;
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const sessionKey = `whatsapp_${context?.vars?.session || "default"}_${context?.vars?.from || ""}`;
        await supabase.from("chat_sessions").upsert(
          { session_id: sessionKey, context, updated_at: new Date().toISOString() },
          { onConflict: "session_id" },
        );
        return;
      }
      case "content_type": {
        const mode = cfg.mode === "ask" ? "ask" : "fixed";
        if (mode === "fixed") {
          context.vars.content_type = cfg.contentType || "divulgacao";
          context.vars.content_type_use_badge = cfg.useBadge !== false;
          for (const nx of nexts(node.id)) await executeNode(nx, nodes, edges, context, onResponse);
          break;
        }
        const directives = getContentTypeOptions();
        const prompt = itp(cfg.askPrompt || "Qual o objetivo da peça?");
        const rows = [
          ...directives.map((d) => ({
            title: d.label.slice(0, 24),
            description: "",
            rowId: `content_${d.value}`,
          })),
          { title: "Sair", description: "Encerrar atendimento", rowId: "__exit__" },
        ];
        const interactive = {
          type: "list",
          title: "",
          description: prompt,
          buttonText: "Ver opções",
          footerText: "",
          sections: [{ title: "Objetivos", rows }],
        };
        let fallback = prompt;
        rows.forEach((r: any, i: number) => { fallback += `\n${i + 1}. ${r.title}`; });
        await onResponse(fallback, undefined, undefined, interactive);
        context.pendingNodeId = node.id;
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const sessionKey = `whatsapp_${context?.vars?.session || "default"}_${context?.vars?.from || ""}`;
        await supabase.from("chat_sessions").upsert(
          { session_id: sessionKey, context, updated_at: new Date().toISOString() },
          { onConflict: "session_id" },
        );
        return;
      }
      case "ask_influencer":
      case "ask_product_image": {
        const q = itp(
          cfg.askQuestion ||
            (data.type === "ask_influencer"
              ? "A peça terá um influencer?"
              : "A peça terá imagem do produto?"),
        );
        const prefix = data.type === "ask_influencer" ? "infl" : "pim";
        const buttons = [
          { text: "Sim", id: `${prefix}_1` },
          { text: "Não", id: `${prefix}_2` },
          { text: "Sair", id: "__exit__" },
        ];
        const interactive = {
          type: "buttons",
          title: "",
          description: q,
          footerText: "",
          buttons,
        };
        let fallback = q;
        buttons.forEach((b: any, i: number) => { fallback += `\n${i + 1}. ${b.text}`; });
        // No Evolution, botões podem retornar 201 mas não aparecer no celular.
        // Envia texto numerado para manter o mesmo comportamento confiável do tipo de conteúdo.
        const usePlainText = context?.vars?.session;
        await onResponse(fallback, undefined, undefined, usePlainText ? undefined : interactive);
        context.pendingNodeId = node.id;
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const sessionKey = `whatsapp_${context?.vars?.session || "default"}_${context?.vars?.from || ""}`;
        await supabase.from("chat_sessions").upsert(
          { session_id: sessionKey, context, updated_at: new Date().toISOString() },
          { onConflict: "session_id" },
        );
        return;
      }


      default: {
        console.log(`[FLOW] Unknown node type: ${data.type} - moving to next nodes`);
        for (const nx of nexts(node.id)) await executeNode(nx, nodes, edges, context, onResponse);
        break;
      }
    }
  } catch (err) {
    console.error(`[FLOW] Error executing node ${node.id} (${data.type}):`, err);
    throw err;
  }
}


