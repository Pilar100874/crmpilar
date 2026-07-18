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

/**
 * Otimiza URL de mídia para WhatsApp, redimensionando imagens hospedadas no
 * Supabase Storage para um tamanho universalmente bem renderizado em qualquer
 * celular (iOS, Android e Desktop). Pode receber um "device hint" opcional
 * detectado a partir do messageId recebido para ajustar dimensões por SO.
 *
 * - iOS: 1170x1462 (ratio próximo a 4:5, ideal para Retina)
 * - Android: 1080x1350 (4:5, padrão WhatsApp)
 * - Desconhecido/Desktop: 1080x1080 (quadrado seguro)
 *
 * Vídeos e arquivos não-Supabase passam sem alteração.
 */
function optimizeMediaUrlForWhatsApp(
  url: string,
  mediaType?: string,
  deviceHint?: "ios" | "android" | "unknown",
): string {
  try {
    if (!url) return url;
    const t = (mediaType || "").toLowerCase();
    if (t && t !== "image") return url; // só otimiza imagens
    const u = new URL(url);
    // Só sabemos transformar URLs públicas do Supabase Storage
    if (!u.pathname.includes("/storage/v1/object/public/")) return url;
    // Evita re-otimizar
    if (u.pathname.includes("/render/image/")) return url;

    const dims = deviceHint === "ios"
      ? { w: 1170, h: 1462 }
      : deviceHint === "android"
      ? { w: 1080, h: 1350 }
      : { w: 1080, h: 1080 };

    u.pathname = u.pathname.replace(
      "/storage/v1/object/public/",
      "/storage/v1/render/image/public/",
    );
    u.searchParams.set("width", String(dims.w));
    u.searchParams.set("height", String(dims.h));
    u.searchParams.set("resize", "contain");
    u.searchParams.set("quality", "85");
    return u.toString();
  } catch {
    return url;
  }
}

/**
 * Heurística leve para inferir o SO do destinatário a partir do messageId
 * recebido pelo WhatsApp. Não é 100% confiável, mas WhatsApp normalmente usa:
 *  - "3A..."   -> iOS
 *  - "BAE5..." -> Android
 *  - "3EB0..." -> WhatsApp Web/Desktop
 */
function detectDeviceFromMessageId(messageId?: string): "ios" | "android" | "unknown" {
  const id = String(messageId || "").toUpperCase();
  if (!id) return "unknown";
  if (id.startsWith("3A")) return "ios";
  if (id.startsWith("BAE5")) return "android";
  return "unknown";
}

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
  // IMPORTANTE: respostas clicáveis (lista/botão) vêm com o ID estável em
  // selectedRowId / selectedButtonId / selectedId E ao mesmo tempo com o
  // título visível em msg.conversation. Precisamos priorizar o ID para que
  // handlers como "pim_pick_1", "infl_pick_2", "pim_m_text" funcionem.
  return (
    msg.listResponseMessage?.singleSelectReply?.selectedRowId ||
    msg.buttonsResponseMessage?.selectedButtonId ||
    msg.templateButtonReplyMessage?.selectedId ||
    msg.interactiveResponseMessage?.body?.text ||
    msg.conversation ||
    msg.extendedTextMessage?.text ||
    msg.imageMessage?.caption ||
    msg.videoMessage?.caption ||
    msg.documentMessage?.caption ||
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

    // ====== Ponto: confirmação de notificações (fire-and-forget) ======
    if (from && body && /^(ok|ciente|aprovar|aprovado|confirmar|confirmado|👍|✅)\b/i.test(String(body).trim())) {
      supabase.functions.invoke("ponto-confirmar-recebimento", {
        body: { telefone: from, texto: body },
      }).catch((e) => console.log("[PONTO-CONFIRM] falhou:", e?.message));
    }


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

    if (!estabelecimentoId && flowData?.estabelecimento_id) {
      estabelecimentoId = flowData.estabelecimento_id;
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
      // Otimiza imagens hospedadas no Supabase Storage para o dispositivo do destinatário
      let optimizedMediaUrl = mediaUrl;
      if (mediaUrl && (mediaType || "").toLowerCase() === "image") {
        const device = detectDeviceFromMessageId(inboundMsgId);
        optimizedMediaUrl = optimizeMediaUrlForWhatsApp(mediaUrl, mediaType, device);
        if (optimizedMediaUrl !== mediaUrl) {
          console.log(`[MEDIA] Otimizada para ${device}: ${optimizedMediaUrl}`);
        }
      }
      mediaUrl = optimizedMediaUrl;
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
        if (interactive?.type === "carousel") {
          await sendWahaCarouselMessage(from, interactive, wahaSession, WAHA_URL, WAHA_API_KEY);
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
        if (interactive?.type === "carousel") {
          // Cloud API não suporta carousel custom — fallback texto.
          let fallback = (interactive.title || "Opções:") + "";
          (interactive.cards || []).forEach((c: any, i: number) => {
            fallback += `\n${i + 1}. ${c.body || ""}${c.footer ? " — " + c.footer : ""}`;
          });
          await sendCloudText(pnId, token, from, fallback);
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

    // ====== Palavra-chave universal: Recomeçar ======
    // Permite ao usuário reiniciar o fluxo a qualquer momento.
    try {
      const raw = String(body || "").trim().toLowerCase();
      if (raw === "recomeçar" || raw === "recomecar" || raw === "reiniciar" || raw === "restart") {
        console.log("[RESTART] Palavra-chave de reinício detectada");
        context = { vars: { userMessage: body, from, phoneNumber: from, session: wahaSession, estabelecimento_id: estabelecimentoId } };
        const startNode = flowData.flow_data.nodes.find((n: any) => n.data.type === "start");
        if (startNode) {
          await executeFlow({ nodes: flowData.flow_data.nodes, edges: flowData.flow_data.edges }, context, startNode, onResponse);
        }
        await supabase.from("chat_sessions").upsert(
          { session_id: sessionKey, context, updated_at: new Date().toISOString() },
          { onConflict: "session_id" },
        );
        return new Response(JSON.stringify({ success: true, restarted: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } catch (e) {
      console.error("[RESTART] erro:", e);
    }

    // ====== Reinício automático após Despedida ======
    // Se a última interação parou em um bloco "goodbye" (com botão Recomeçar),
    // qualquer nova mensagem do contato reinicia o fluxo do início.
    try {
      if (context?.pendingNodeId) {
        const pendingGoodbye = (flowData.flow_data.nodes || []).find(
          (n: any) => n.id === context.pendingNodeId && n?.data?.type === "goodbye"
        );
        const raw = String(body || "").trim();
        if (pendingGoodbye && raw.length > 0) {
          console.log("[RESTART] Mensagem recebida após despedida — reiniciando fluxo");
          context = { vars: { userMessage: body, from, phoneNumber: from, session: wahaSession, estabelecimento_id: estabelecimentoId } };
          const startNode = flowData.flow_data.nodes.find((n: any) => n.data.type === "start");
          if (startNode) {
            await executeFlow({ nodes: flowData.flow_data.nodes, edges: flowData.flow_data.edges }, context, startNode, onResponse);
          }
          await supabase.from("chat_sessions").upsert(
            { session_id: sessionKey, context, updated_at: new Date().toISOString() },
            { onConflict: "session_id" },
          );
          return new Response(JSON.stringify({ success: true, restarted: true, reason: "after_goodbye" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    } catch (e) {
      console.error("[RESTART after goodbye] erro:", e);
    }


    // ====== Roteador: Redirecionamento Global ======
    // Em qualquer momento, se o cliente digitar a palavra-chave configurada num
    // bloco "global_redirect", interrompe o fluxo e encaminha ao destino.
    try {
      const incomingText = String(body || "").trim();
      const activeIds: string[] = Array.isArray(context.vars?.__active_global_redirects)
        ? context.vars.__active_global_redirects
        : [];
      const globalRedirects = (flowData.flow_data.nodes || []).filter(
        (n: any) => n?.data?.type === "global_redirect" && activeIds.includes(n.id)
      );
      let matchedRedirect: any = null;
      for (const node of globalRedirects) {
        const c = node.data?.config || {};
        const trigger = String(c.triggerText || "").trim();
        if (!trigger) continue;
        const mode = c.matchMode || "exact";
        const cs = c.caseSensitive === true;
        const a = cs ? incomingText : incomingText.toLowerCase();
        const b = cs ? trigger : trigger.toLowerCase();
        const hit =
          mode === "contains" ? a.includes(b)
          : mode === "startsWith" ? a.startsWith(b)
          : a === b;
        if (hit) { matchedRedirect = node; break; }
      }

      if (matchedRedirect) {
        const c = matchedRedirect.data?.config || {};
        const dest = c.destinationType || "omnichannel";
        const handoff = String(c.handoffMessage || "Encaminhando seu atendimento...").trim();
        console.log("[GLOBAL_REDIRECT] Match:", { trigger: c.triggerText, dest });

        if (handoff) await onResponse(handoff);

        const updates: Record<string, any> = {
          bot_paused: true,
          updated_at: new Date().toISOString(),
        };
        if (dest === "omnichannel") {
          updates.workflow_id = c.omnichannelFlowId || null;
        } else if (dest === "atendente") {
          updates.atendente_id = c.atendenteId || null;
          updates.atendente_nome = c.atendenteNome || null;
        } else if (dest === "bot") {
          updates.bot_flow_id = c.botFlowId || null;
          updates.bot_paused = false; // outro bot continua respondendo
        } else if (dest === "whatsapp_number") {
          const num = String(c.whatsappNumber || "").replace(/\D/g, "");
          if (num) {
            await onResponse(`Fale com nosso atendimento neste número: https://wa.me/${num}`);
          }
        }

        if (conversationId) {
          try {
            await supabase.from("conversations").update(updates).eq("id", conversationId);
          } catch (e) {
            console.error("[GLOBAL_REDIRECT] update conversation error:", e);
          }
        }

        // limpa contexto do fluxo atual
        context = { vars: { ...(context.vars || {}), __redirected_at: new Date().toISOString() } };
        await supabase.from("chat_sessions").upsert(
          { session_id: sessionKey, context, updated_at: new Date().toISOString() },
          { onConflict: "session_id" },
        );

        return new Response(JSON.stringify({ success: true, global_redirect: dest }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } catch (e) {
      console.error("[GLOBAL_REDIRECT] erro no roteador:", e);
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
      // Processa resposta para reply_buttons / buttons_mixed / buttons_media
      else if (
        pendingNode?.data?.type === "reply_buttons" ||
        pendingNode?.data?.type === "buttons_mixed" ||
        pendingNode?.data?.type === "buttons_media"
      ) {
        const cfg = pendingNode.data.config || {};
        const variable = cfg.variable || "button_response";
        const userResponse = (context.vars.userMessage || "").trim().toLowerCase();
        const allButtons: any[] = cfg.buttons || [];
        // Para buttons_mixed só clica em botões "reply" — os de URL/Copy/Call/Pix não retornam evento
        const replyButtons = allButtons
          .map((b: any, i: number) => ({ b, i }))
          .filter(({ b }) => (b.type || "reply") === "reply");

        let selectedIndex = -1;
        const asNum = parseInt(userResponse);
        // Aceita escolha numérica considerando TODOS os botões (reply + url/copy/call/pix)
        if (!isNaN(asNum) && asNum >= 1 && asNum <= allButtons.length) {
          selectedIndex = asNum - 1;
        } else {
          const found = allButtons.findIndex((b: any) => {
            const candidates = [b.id, b.value, b.displayText, b.text, b.label]
              .filter(Boolean)
              .map((s: any) => String(s).toLowerCase().trim());
            return candidates.includes(userResponse);
          });
          selectedIndex = found;
        }

        const chosen = selectedIndex >= 0 ? allButtons[selectedIndex] : null;
        const chosenType = chosen?.type || "reply";

        if (!chosen) {
          const replyNums = replyButtons.map(({ i }) => i + 1).join(", ");
          await respond(
            replyButtons.length
              ? `Por favor, responda com o número de um botão de resposta (${replyNums || "1"}) ou o texto do botão.`
              : "Esta mensagem não aceita resposta. Aguarde a próxima instrução.",
          );
          shouldReturn = true;
        } else if (chosenType !== "reply") {
          // Botão de ação escolhido via texto/número → reenvia a informação e continua aguardando
          let info = "";
          if (chosenType === "url") info = `🔗 Acesse: ${chosen.url || ""}`;
          else if (chosenType === "copy") info = `📋 Código para copiar: ${chosen.copyCode || chosen.code || ""}`;
          else if (chosenType === "call") info = `📞 Ligue: ${chosen.phoneNumber || chosen.phone || ""}`;
          else if (chosenType === "pix") info = `💠 Chave Pix (${chosen.keyType || ""}): ${chosen.key || chosen.pixKey || ""}`;
          if (info) await respond(info);
          if (replyButtons.length) {
            const replyNums = replyButtons.map(({ i }) => i + 1).join(", ");
            await respond(`Para continuar, escolha um botão de resposta (${replyNums}).`);
            shouldReturn = true;
          } else {
            delete context.pendingNodeId;
            const edge = flowData.flow_data.edges.find((e: any) => e.source === pendingNode.id);
            const nextNode = edge && flowData.flow_data.nodes.find((n: any) => n.id === edge.target);
            if (nextNode) await executeNode(nextNode, flowData.flow_data.nodes, flowData.flow_data.edges, context, onResponse);
          }
        } else {
          context.vars[variable] = chosen.value || chosen.id || chosen.displayText || chosen.text || chosen.label;
          delete context.pendingNodeId;
          const handle = `button_${selectedIndex}`;
          let edge = flowData.flow_data.edges.find((e: any) => e.source === pendingNode.id && e.sourceHandle === handle);
          if (!edge) edge = flowData.flow_data.edges.find((e: any) => e.source === pendingNode.id);
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
                await respond(`Encontrei ${list.length} influencer(s). Veja as fotos abaixo e toque em *Ver opções* para escolher:`);
                for (let i = 0; i < list.length; i++) {
                  const it = list[i];
                  await respond(`${i + 1}. ${it.nome || `Influencer ${i + 1}`}`, it.image_url, "image");
                }
                // Lista interativa clicável
                const rows = list.slice(0, 9).map((it: any, i: number) => ({
                  rowId: `infl_pick_${i}`,
                  title: (it.nome || `Influencer ${i + 1}`).slice(0, 24),
                  description: `Opção ${i + 1}`,
                }));
                rows.push({ rowId: "infl_pick_exit", title: "Sair", description: "Cancelar seleção" });
                const interactive = {
                  type: "list",
                  title: "Influencers",
                  description: "Selecione o influencer da peça:",
                  buttonText: "Ver opções",
                  footerText: "Toque para escolher",
                  sections: [{ title: "Disponíveis", rows }],
                };
                let fallback = "Selecione um influencer respondendo com o número:";
                list.forEach((it: any, i: number) => { fallback += `\n${i + 1}. ${it.nome || `Influencer ${i + 1}`}`; });
                fallback += `\n${list.length + 1}. Sair`;
                await respond(fallback, undefined, undefined, interactive);
                context.vars.__infl_sub = "gallery_select";
                context.vars.__infl_gallery = list.map((it: any) => ({ id: it.id, nome: it.nome, image_url: it.image_url }));
                // mantém pendingNodeId
                shouldReturn = true;
              }
            }
          }
        } else if (subState === "gallery_select") {
          const list: any[] = Array.isArray(context.vars.__infl_gallery) ? context.vars.__infl_gallery : [];
          // Aceita rowId clicável (infl_pick_N / infl_pick_exit) ou número digitado
          const r = userResponse.toLowerCase();
          if (r === "infl_pick_exit" || r === `${list.length + 1}` || r === "sair") {
            context.vars.tem_influencer = "nao";
            await advance();
          } else {
            let idx = -1;
            const m = r.match(/^infl_pick_(\d+)$/);
            if (m) idx = parseInt(m[1]);
            else idx = parseInt(userResponse) - 1;
            if (isNaN(idx) || idx < 0 || idx >= list.length) {
              await respond(`Por favor, toque em uma das opções da lista ou responda com um número entre 1 e ${list.length} (ou ${list.length + 1} para sair).`);
              shouldReturn = true;
            } else {
              const item = list[idx];
              context.vars[outVar] = item.image_url;
              await respond(`✅ Influencer "${item.nome || "selecionado"}" registrado.`, item.image_url, "image");
              await advance();
            }
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
          if (cfg.waitingMessageEnabled !== false) {
            const customWait = typeof cfg.waitingMessage === "string" ? cfg.waitingMessage.trim() : "";
            await respond(customWait || `🎨 Gerando ${count} opção${count > 1 ? "s" : ""} de imagem do produto, aguarde...`);
          }

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
            const rows = images.map((_, i) => ({
              rowId: `pim_pick_${i}`,
              title: `Usar opção ${i + 1}`.slice(0, 24),
              description: `✅ Selecionar imagem ${i + 1}`,
            }));
            rows.push({ rowId: "pim_regen", title: `Gerar mais ${count}`, description: "🔄 Novas variações" });
            rows.push({ rowId: "pim_exit", title: "Sair", description: "Cancelar" });
            const interactive = {
              type: "list",
              title: "Imagem do produto",
              description: "Escolha a melhor imagem:",
              buttonText: "Ver opções",
              footerText: "Toque para escolher",
              sections: [{ title: "Opções", rows }],
            };
            let fallback = "Escolha a imagem do produto respondendo com o número:";
            images.forEach((_, i) => { fallback += `\n${i + 1}. ✅ Usar opção ${i + 1}`; });
            fallback += `\n${images.length + 1}. 🔄 Gerar mais ${count}`;
            fallback += `\n${images.length + 2}. Sair`;
            await respond(fallback, undefined, undefined, interactive);
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
            // 3 botões clicáveis (limite do WhatsApp). "Sair" via texto/typing.
            const interactive = {
              type: "buttons",
              title: cfg.headerTitle || "Imagem do produto",
              description: "Como você quer fornecer a imagem do produto?",
              footerText: "Digite 'sair' para cancelar",
              buttons: [
                { type: "reply", id: "pim_m_code",  text: "🔢 Digitar código",  displayText: "🔢 Digitar código" },
                { type: "reply", id: "pim_m_photo", text: "📷 Enviar foto",     displayText: "📷 Enviar foto" },
                { type: "reply", id: "pim_m_text",  text: "✍️ Descrever",       displayText: "✍️ Descrever" },
              ],
            };
            let fallback = "Como você quer fornecer a imagem do produto?";
            fallback += `\n1. 🔢 Digitar código do produto`;
            fallback += `\n2. 📷 Enviar foto (anexo)`;
            fallback += `\n3. ✍️ Descrever em texto`;
            fallback += `\n4. Sair`;
            await respond(fallback, undefined, undefined, interactive);
            context.vars.__pim_sub = "method";
            context.vars.__pim_prompts = { code: codeP, photo: photoP, text: textP };
            shouldReturn = true;
          }
        } else if (subState === "method") {
          const r = userResponse.toLowerCase();
          let method: string | null = null;
          if (r === "1" || r === "pim_m_code" || r.includes("codigo") || r.includes("código") || r === "code") method = "code";
          else if (r === "2" || r === "pim_m_photo" || r.includes("foto") || r.includes("photo") || r.includes("url")) method = "photo";
          else if (r === "3" || r === "pim_m_text" || r.includes("texto") || r.includes("descre") || r === "text") method = "text";
          if (!method) {
            await respond("Por favor, toque em uma das opções ou responda com 1, 2 ou 3.");
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
              if (cfg.waitingMessageEnabled !== false) {
                const customWait = typeof cfg.waitingMessage === "string" ? cfg.waitingMessage.trim() : "";
                await respond(customWait || "⏳ Recebendo a foto, aguarde...");
              }
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
          const rRaw = userResponse.toLowerCase();
          let idx = NaN;
          const m = rRaw.match(/^pim_pick_(\d+)$/);
          if (m) idx = parseInt(m[1]);
          else idx = parseInt(userResponse) - 1;
          const regenIndex = samples.length;
          const exitIndex = samples.length + 1;

          if (rRaw === "regen" || rRaw === "pim_regen" || idx === regenIndex) {
            const desc = context.vars.__pim_description || context.vars[descVar] || "";
            if (!desc) {
              await respond("⚠️ Sem descrição para gerar novas opções. Descreva o produto novamente.");
              context.vars.__pim_sub = "input";
              shouldReturn = true;
            } else {
              await generateAndAskProductSamples(desc);
            }
          } else if (rRaw === "cancelar" || rRaw === "sair" || rRaw === "pim_exit" || idx === exitIndex) {
            await respond("Atendimento encerrado. Quando quiser retomar, é só enviar uma nova mensagem. 👋");
            context = { vars: { from, phoneNumber: from, session: wahaSession } };
            const sbCli = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
            const sessionKey = `whatsapp_${wahaSession || "default"}_${from || ""}`;
            await sbCli.from("chat_sessions").delete().eq("session_id", sessionKey);
            shouldSaveContext = false;
            shouldReturn = true;
          } else if (isNaN(idx) || idx < 0 || idx >= samples.length) {
            await respond(`Por favor, toque em uma das opções da lista ou responda com um número entre 1 e ${samples.length + 2}.`);
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
          if (cfg.waitingMessageEnabled !== false) {
            const customWait = typeof cfg.waitingMessage === "string" ? cfg.waitingMessage.trim() : "";
            await respond(customWait || `✍️ Gerando ${count} opç${count > 1 ? "ões" : "ão"} de texto, aguarde...`);
          }
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
          const isYes = r === "1" || r === "sim" || r === "s" || r === "tc_sim";
          const isNo = r === "2" || r === "nao" || r === "não" || r === "n" || r === "tc_nao";
          if (!isYes && !isNo) {
            await respond("Por favor, toque em *Sim*, *Não* ou *Sair*.");
            shouldReturn = true;
          } else if (isNo) {
            context.vars.text_content_choice = "nao";
            await advanceTc();
          } else {
            context.vars.text_content_choice = "sim";
            const methodInteractive = {
              type: "buttons",
              title: cfg.headerTitle || "Conteúdo de texto",
              description: "Como você quer fornecer o texto?",
              footerText: "",
              buttons: [
                { type: "reply", id: "tc_m_type", text: "✍️ Digitar eu mesmo", displayText: "✍️ Digitar eu mesmo" },
                { type: "reply", id: "tc_m_ai",   text: "🤖 Gerar com IA",    displayText: "🤖 Gerar com IA" },
                { type: "reply", id: "__exit__",  text: "Sair",                displayText: "Sair" },
              ],
            };
            const fallback = "Como você quer fornecer o texto?\n1. ✍️ Digitar eu mesmo\n2. 🤖 Gerar com IA\n3. Sair";
            await respond(fallback, undefined, undefined, methodInteractive);
            context.vars.__tc_sub = "method";
            shouldReturn = true;
          }
        } else if (subState === "method") {
          const r = userResponse.toLowerCase();
          let method: string | null = null;
          if (r === "1" || r === "tc_m_type" || r.includes("digit")) method = "type";
          else if (r === "2" || r === "tc_m_ai" || r.includes("ia") || r.includes("ai")) method = "ai";
          if (!method) {
            await respond("Por favor, toque em *Digitar eu mesmo*, *Gerar com IA* ou *Sair*.");
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
          const keywordItems = Array.isArray(cfg.buttons)
            ? cfg.buttons
            : (Array.isArray(cfg.keywords) ? cfg.keywords : []);
          options = keywordItems.map((b: any, i: number) => ({
            label: b.label || b.text || `Opção ${i + 1}`,
            value: b.value || b.label || b.text || `opcao_${i + 1}`,
            handle: `button_${i}`,
            keywords: Array.isArray(b.keywords) ? b.keywords : (b.keyword ? [b.keyword] : []),
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
          selectedIndex = options.findIndex((o: any) => {
            const label = blockType === "content_type" ? normalizeContentTypeResponse(o.label) : String(o.label || "").toLowerCase();
            const value = blockType === "content_type" ? normalizeContentTypeResponse(o.value) : String(o.value || "").toLowerCase();
            const keywords = Array.isArray(o.keywords) ? o.keywords.map((k: any) => String(k || "").trim().toLowerCase()).filter(Boolean) : [];
            return label === normalizedResponse || value === normalizedResponse || keywords.includes(lower);
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
            if (cfg.waitingMessageEnabled !== false) {
              const customWait = typeof cfg.waitingMessage === "string" ? cfg.waitingMessage.trim() : "";
              await respond(customWait || "Aguarde, consultando CNPJ...");
            }
            
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
            if (cfg.waitingMessageEnabled !== false) {
              const customWait = typeof cfg.waitingMessage === "string" ? cfg.waitingMessage.trim() : "";
              await respond(customWait || "Aguarde, consultando CEP...");
            }
            
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
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body: toWhatsappMarkdown(text) } }),
  });
  const res = await r.json().catch(() => ({}));
  if (!r.ok) console.error("[CLOUD] sendText error:", res);
  return r.ok;
}

async function sendCloudTemplate(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  templateName: string,
  language: string,
  bodyParams: string[] = [],
  headerParam?: { type: "text" | "image" | "video" | "document"; value: string },
) {
  if (!phoneNumberId || !accessToken || !templateName) {
    console.error("[CLOUD] template: phoneNumberId/accessToken/templateName ausentes");
    return false;
  }
  const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
  const components: any[] = [];
  if (headerParam) {
    if (headerParam.type === "text") {
      components.push({ type: "header", parameters: [{ type: "text", text: headerParam.value }] });
    } else {
      components.push({
        type: "header",
        parameters: [{ type: headerParam.type, [headerParam.type]: { link: headerParam.value } }],
      });
    }
  }
  if (bodyParams.length > 0) {
    components.push({
      type: "body",
      parameters: bodyParams.map((p) => ({ type: "text", text: String(p ?? "") })),
    });
  }
  const payload: any = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: language || "pt_BR" },
      ...(components.length > 0 ? { components } : {}),
    },
  };
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
  const res = await r.json().catch(() => ({}));
  if (!r.ok) console.error("[CLOUD] sendTemplate error:", res);
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
  if (caption && (t === "image" || t === "video" || t === "document")) body[t].caption = toWhatsappMarkdown(caption);
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
      title: toWhatsappMarkdown((s.title || "Opções")).slice(0, 24),
      rows: (s.rows || []).slice(0, 10).map((r: any) => ({
        id: String(r.id || r.rowId || r.title || "").slice(0, 200),
        title: toWhatsappMarkdown(String(r.title || "Opção")).slice(0, 24),
        description: r.description ? toWhatsappMarkdown(String(r.description)).slice(0, 72) : undefined,
      })),
    }));
    const payload = {
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: "list",
        header: interactive.title ? { type: "text", text: toWhatsappMarkdown(String(interactive.title)).slice(0, 60) } : undefined,
        body: { text: toWhatsappMarkdown(String(interactive.description || bodyText || "Escolha uma opção")).slice(0, 1024) },
        footer: interactive.footer ? { text: toWhatsappMarkdown(String(interactive.footer)).slice(0, 60) } : undefined,
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
        id: String(b.id || b.value || b.displayText || b.title || b.text || "").slice(0, 256),
        title: toWhatsappMarkdown(String(b.displayText || b.title || b.text || "OK")).slice(0, 20),
      },
    }));
    if (!buttons.length) return false;
    const payload = {
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: toWhatsappMarkdown(String(interactive.description || bodyText || "Escolha uma opção")).slice(0, 1024) },
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

/**
 * Converte markdown comum (gerado por LLMs) para a sintaxe que o WhatsApp
 * realmente renderiza. Sem isso, o usuário vê literalmente `**texto**`,
 * `__texto__`, `### título`, etc.
 *
 * Regras (WhatsApp):
 *   *negrito*     — entre asteriscos simples
 *   _itálico_     — entre underscores simples
 *   ~tachado~     — entre tils
 *   ```mono```    — bloco de código
 */
function toWhatsappMarkdown(input: string): string {
  if (!input || typeof input !== "string") return input as any;
  let out = input;
  // Negrito: **texto** ou __texto__  →  *texto*
  // Substitui qualquer ocorrência de ** por * (cobre **bold**, ***bold***, **multi linha**, etc.)
  out = out.replace(/\*\*+/g, "*");
  out = out.replace(/(^|[^_])__([^_\n]+?)__(?!_)/g, "$1*$2*");
  // Cabeçalhos markdown (### Título) → *Título*
  out = out.replace(/^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/gm, "*$1*");
  // Links markdown [texto](url) → texto (url)
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, "$1 ($2)");
  return out;
}

type SocialKind =
  | "whatsapp" | "instagram" | "facebook" | "website"
  | "tiktok" | "youtube" | "linkedin" | "telegram"
  | "twitter" | "threads" | "pinterest";

function normalizeUrl(raw: string, kind: SocialKind): string {
  const value = String(raw || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (kind === "whatsapp") {
    const digits = value.replace(/\D/g, "");
    return digits ? `https://wa.me/${digits}` : value;
  }
  const handle = value.replace(/^@/, "");
  switch (kind) {
    case "instagram": return `https://instagram.com/${handle}`;
    case "facebook":  return value.includes("facebook.com") ? `https://${value}` : `https://facebook.com/${handle}`;
    case "tiktok":    return `https://tiktok.com/@${handle}`;
    case "youtube":   return `https://youtube.com/@${handle}`;
    case "linkedin":  return `https://linkedin.com/in/${handle}`;
    case "telegram":  return `https://t.me/${handle}`;
    case "twitter":   return `https://x.com/${handle}`;
    case "threads":   return `https://threads.net/@${handle}`;
    case "pinterest": return `https://pinterest.com/${handle}`;
    default:          return `https://${value}`;
  }
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
      body: JSON.stringify({ number, text: toWhatsappMarkdown(text) }),
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

  const title = (interactive.title && String(interactive.title).trim()) ? toWhatsappMarkdown(String(interactive.title).trim()).slice(0, 60) : "Escolha uma opção";
  const description = (interactive.description && String(interactive.description).trim()) ? toWhatsappMarkdown(String(interactive.description).trim()) : "Selecione abaixo";
  const buttonText = (interactive.buttonText && String(interactive.buttonText).trim()) ? String(interactive.buttonText).trim().slice(0, 20) : "Ver opções";
  const footerText = (interactive.footerText && String(interactive.footerText).trim()) ? toWhatsappMarkdown(String(interactive.footerText).trim()) : "Toque para escolher";

  // Aplica markdown WhatsApp nos títulos/descrições das rows
  const sectionsForBody = sanitizedSections.map((sec: any) => ({
    ...sec,
    title: toWhatsappMarkdown(sec.title),
    rows: sec.rows.map((r: any) => ({
      ...r,
      title: toWhatsappMarkdown(r.title),
      description: toWhatsappMarkdown(r.description),
    })),
  }));

  const body: any = {
    number,
    title,
    description,
    buttonText,
    footerText,
    sections: sectionsForBody,
    values: sectionsForBody,
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

  // Suporta múltiplos tipos por botão: reply, url, copy, call, pix.
  // Mantém compatibilidade com formato antigo (text/value/id).
  const buttons = (interactive.buttons || []).map((b: any, i: number) => {
    const btnType = b.type || "reply";
    const displayText = toWhatsappMarkdown(String(b.displayText || b.text || b.label || `Opção ${i + 1}`));
    const base: any = { type: btnType, displayText };
    if (btnType === "reply") base.id = b.id || b.value || `btn_${i}`;
    if (btnType === "url") base.url = b.url || "";
    if (btnType === "copy") base.copyCode = b.copyCode || b.code || "";
    if (btnType === "call") base.phoneNumber = b.phoneNumber || b.phone || "";
    if (btnType === "pix") {
      base.currency = b.currency || "BRL";
      base.name = b.name || "";
      base.keyType = b.keyType || "email";
      base.key = b.key || b.pixKey || "";
    }
    return base;
  });

  const rawTitle = String(interactive.title || "").trim();
  const descStr = String(interactive.description || "Escolha uma opção").trim();
  // Evolution renderiza "*${title}*\n\n${description}" SEMPRE — se title vier null/undefined
  // aparece literalmente "*undefined*". Quando o usuário não preencheu um título usamos um
  // rótulo curto e neutro para não duplicar a pergunta no cabeçalho.
  const titleStr = toWhatsappMarkdown(rawTitle || "💬 Atendimento");
  const footerStr = toWhatsappMarkdown(String(interactive.footerText || interactive.footer || "").trim());
  const body: any = {
    number,
    title: titleStr,
    description: toWhatsappMarkdown(descStr),
    buttons,
  };
  if (footerStr) body.footer = footerStr;
  if (interactive.thumbnailUrl) body.thumbnailUrl = interactive.thumbnailUrl;
  if (interactive.mediaType) body.mediaType = interactive.mediaType;

  try {
    console.log(`[EVOLUTION] Enviando BUTTONS -> ${number}`, { instance, count: body.buttons.length, types: buttons.map((b: any) => b.type) });
    const resp = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", apikey: apiKey },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60000),
    });
    const resultText = await resp.text().catch(() => "");
    console.log("[EVOLUTION] sendButtons result:", resp.status, resultText.slice(0, 500));
    const looksDelivered = resp.ok && /"key"\s*:/.test(resultText);
    if (!looksDelivered && allowTextFallback) {
      console.warn("[EVOLUTION] sendButtons sem entrega confirmada — enviando fallback texto.");
      let fallback = `${body.description}\n`;
      buttons.forEach((b: any, i: number) => {
        let extra = "";
        if (b.type === "url") extra = ` → ${b.url}`;
        else if (b.type === "copy") extra = ` (código: ${b.copyCode})`;
        else if (b.type === "call") extra = ` (${b.phoneNumber})`;
        else if (b.type === "pix") extra = ` (Pix ${b.keyType}: ${b.key})`;
        fallback += `\n${i + 1}. ${b.displayText}${extra}`;
      });
      await sendWahaTextMessage(toNumberOnly, fallback, sessionName, wahaUrl, wahaApiKey);
    }
  } catch (err) {
    console.error("[EVOLUTION] Erro no sendButtons:", err);
    if (allowTextFallback) {
      let fallback = `${body.description}\n`;
      buttons.forEach((b: any, i: number) => { fallback += `\n${i + 1}. ${b.displayText}`; });
      try { await sendWahaTextMessage(toNumberOnly, fallback, sessionName, wahaUrl, wahaApiKey); } catch {}
    }
  }
}

async function sendWahaCarouselMessage(
  toNumberOnly: string,
  interactive: any,
  sessionName: string,
  wahaUrl: string,
  wahaApiKey: string,
) {
  const { base, apiKey } = resolveEvolution(wahaUrl, wahaApiKey);
  if (!base || !apiKey) return;
  const instance = sessionName || "default";
  const number = String(toNumberOnly).replace(/\D/g, "");
  const endpoint = `${base}/message/sendCarousel/${encodeURIComponent(instance)}`;

  const cards = (interactive.cards || []).slice(0, 10).map((c: any, i: number) => {
    const cardBody = toWhatsappMarkdown(String(c.body || c.title || "").trim());
    const cardFooter = toWhatsappMarkdown(String(c.footer || "").trim());
    const card: any = {
      header: c.header || c.imageUrl || "",
      buttons: (c.buttons || [{ type: "reply", displayText: c.buttonText || "Selecionar", id: c.buttonId || `card_${i}` }]).map((b: any, bi: number) => ({
        type: b.type || "reply",
        displayText: toWhatsappMarkdown(b.displayText || b.text || "Selecionar"),
        ...(b.type === "url" ? { url: b.url || "" } : {}),
        ...(b.type === "copy" ? { copyCode: b.copyCode || b.code || "" } : {}),
        ...(b.type === "call" ? { phoneNumber: b.phoneNumber || b.phone || "" } : {}),
        ...((!b.type || b.type === "reply") ? { id: b.id || `card_${i}_btn_${bi}` } : {}),
      })),
    };
    if (cardBody) card.body = cardBody;
    if (cardFooter) card.footer = cardFooter;
    return card;
  });

  const rawCarouselTitle = String(interactive.title || "").trim();
  const titleStr = toWhatsappMarkdown(rawCarouselTitle || "Confira as opções");
  const body: any = {
    number,
    title: titleStr,
    cards,
    delay: 1200,
  };

  try {
    console.log(`[EVOLUTION] Enviando CAROUSEL -> ${number}`, { instance, cardsCount: cards.length });
    const resp = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", apikey: apiKey },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60000),
    });
    const resultText = await resp.text().catch(() => "");
    console.log("[EVOLUTION] sendCarousel result:", resp.status, resultText.slice(0, 500));
    const looksDelivered = resp.ok && /"key"\s*:/.test(resultText);
    if (!looksDelivered) {
      let fallback = (interactive.title || "Confira") + "\n";
      cards.forEach((c: any, i: number) => {
        fallback += `\n${i + 1}. ${c.body}${c.footer ? " — " + c.footer : ""}`;
      });
      await sendWahaTextMessage(toNumberOnly, fallback, sessionName, wahaUrl, wahaApiKey);
    }
  } catch (err) {
    console.error("[EVOLUTION] Erro no sendCarousel:", err);
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
  if (caption) caption = toWhatsappMarkdown(caption);

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

  // Monta a legenda da mídia a partir dos campos Título / Descrição / Rodapé
  // (com fallback para o campo legado `caption`). Título em negrito *...*,
  // rodapé em itálico _..._ — formato WhatsApp.
  const buildMediaCaption = (src: any, fallback = "") => {
    const t = itp(String(src?.mediaTitle || "")).trim();
    const d = itp(String(src?.mediaDescription || "")).trim();
    const f = itp(String(src?.mediaFooter || "")).trim();
    const legacy = itp(String(src?.caption || "")).trim();
    if (!t && !d && !f) return legacy || fallback;
    const parts: string[] = [];
    if (t) parts.push(`*${t}*`);
    if (d) parts.push(d);
    else if (legacy) parts.push(legacy);
    if (f) parts.push(`_${f}_`);
    return parts.join("\n\n");
  };

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
      const mediaSrc = cfg.media || cfg;
      const url = itp(mediaSrc.url || cfg.url || "");
      const t = (mediaSrc.type || cfg.mediaType || "image");
      const cap = buildMediaCaption(mediaSrc);
      if (url) {
        await onResponse(cap, url, t);
        await new Promise((r) => setTimeout(r, 800));
      }
      for (const nx of nexts(node.id)) await executeNode(nx, nodes, edges, context, onResponse);
      break;
    }
    case "goodbye": {
      let text = itp(cfg.message || cfg.text || "Até logo!");
      const socialLines: string[] = [];

      const SOCIAL_ICONS: Record<string, string> = {
        whatsapp: "🟢",
        instagram: "📸",
        facebook: "📘",
        website: "🌐",
        tiktok: "🎵",
        youtube: "▶️",
        linkedin: "💼",
        telegram: "✈️",
        twitter: "🐦",
        threads: "🧵",
        pinterest: "📌",
      };

      if (cfg.showSocialButtons) {
        try {
          const supa = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
          const estId = context.vars.estabelecimento_id;
          if (estId) {
            const { data: rs } = await supa
              .from("redes_sociais")
              .select("whatsapp,instagram,facebook,website,tiktok,youtube,linkedin,telegram,twitter,threads,pinterest")
              .eq("estabelecimento_id", estId)
              .maybeSingle();
            if (rs) {
              const socials: { enabled: boolean; label: string; kind: SocialKind; url: string }[] = [
                { enabled: cfg.socialWhatsApp,  label: "WhatsApp",    kind: "whatsapp",  url: (rs as any).whatsapp },
                { enabled: cfg.socialInstagram, label: "Instagram",   kind: "instagram", url: (rs as any).instagram },
                { enabled: cfg.socialFacebook,  label: "Facebook",    kind: "facebook",  url: (rs as any).facebook },
                { enabled: cfg.socialWebsite,   label: "Website",     kind: "website",   url: (rs as any).website },
                { enabled: cfg.socialTiktok,    label: "TikTok",      kind: "tiktok",    url: (rs as any).tiktok },
                { enabled: cfg.socialYoutube,   label: "YouTube",     kind: "youtube",   url: (rs as any).youtube },
                { enabled: cfg.socialLinkedin,  label: "LinkedIn",    kind: "linkedin",  url: (rs as any).linkedin },
                { enabled: cfg.socialTelegram,  label: "Telegram",    kind: "telegram",  url: (rs as any).telegram },
                { enabled: cfg.socialTwitter,   label: "X (Twitter)", kind: "twitter",   url: (rs as any).twitter },
                { enabled: cfg.socialThreads,   label: "Threads",     kind: "threads",   url: (rs as any).threads },
                { enabled: cfg.socialPinterest, label: "Pinterest",   kind: "pinterest", url: (rs as any).pinterest },
              ];
              for (const item of socials) {
                const url = item.enabled ? normalizeUrl(item.url, item.kind) : "";
                if (url) {
                  const icon = SOCIAL_ICONS[item.kind] || "🔗";
                  socialLines.push(`${icon} *${item.label}*: ${url}`);
                }
              }
            }
          }
        } catch (e) {
          console.error("[goodbye] erro buscando redes_sociais:", e);
        }
      }

      // Monta uma única mensagem: despedida + lista de redes sociais
      let fullText = text;
      if (socialLines.length > 0) {
        fullText += `\n\n*Nos acompanhe nas nossas redes:*\n${socialLines.join("\n")}`;
      }

      const showRestart = cfg.showStartAgainButton !== false;
      if (showRestart) {
        await onResponse(fullText, undefined, undefined, {
          type: "buttons",
          title: "",
          description: fullText,
          buttons: [{ type: "reply", displayText: "🔄 Recomeçar", id: "recomeçar" }],
        });
        context.pendingNodeId = node.id;
      } else {
        await onResponse(fullText);
        context.pendingNodeId = null;
      }
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
      // Envia como reply buttons (quick reply) — sendWahaButtonsMessage já faz fallback de texto se a entrega falhar.
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
    // ============ Evolution-only blocks ============
    case "button_url":
    case "button_copy":
    case "button_call":
    case "button_pix": {
      const btnType = data.type.replace("button_", "") === "pix" ? "pix" : data.type.replace("button_", "");
      const btn: any = { type: btnType, displayText: itp(cfg.displayText || "Abrir") };
      if (btnType === "url") btn.url = itp(cfg.url || "");
      if (btnType === "copy") btn.copyCode = itp(cfg.copyCode || "");
      if (btnType === "call") btn.phoneNumber = itp(cfg.phoneNumber || "");
      if (btnType === "pix") {
        btn.currency = cfg.currency || "BRL";
        btn.name = itp(cfg.name || "");
        btn.keyType = cfg.keyType || "email";
        btn.key = itp(cfg.pixKey || cfg.key || "");
      }
      const interactive = {
        type: "buttons",
        title: itp(cfg.title || ""),
        description: itp(cfg.description || ""),
        footerText: itp(cfg.footer || ""),
        buttons: [btn],
      };
      await onResponse(itp(cfg.description || cfg.title || ""), undefined, undefined, interactive);
      for (const nx of nexts(node.id)) await executeNode(nx, nodes, edges, context, onResponse);
      break;
    }
    case "buttons_mixed": {
      const rawButtons = (cfg.buttons || []).slice(0, 3).map((b: any, i: number) => {
        const t = b.type || "reply";
        const out: any = { type: t, displayText: itp(b.displayText || `Opção ${i + 1}`) };
        if (t === "reply") out.id = b.id || `btn_${i}`;
        if (t === "url") out.url = itp(b.url || "");
        if (t === "copy") out.copyCode = itp(b.copyCode || "");
        if (t === "call") out.phoneNumber = itp(b.phoneNumber || "");
        if (t === "pix") {
          out.currency = b.currency || "BRL";
          out.name = itp(b.name || "");
          out.keyType = b.keyType || "email";
          out.key = itp(b.key || b.pixKey || "");
        }
        return out;
      });

      // Evolution NÃO aceita reply + url/copy/call/pix no mesmo sendButtons.
      // Solução: separa em grupos homogêneos e envia uma mensagem por grupo.
      const replyGroup = rawButtons.filter((b: any) => b.type === "reply");
      const actionGroups: any[][] = rawButtons
        .filter((b: any) => b.type !== "reply")
        .map((b: any) => [b]); // 1 botão de ação por mensagem (Evolution limita 1 por tipo)

      const titleStr = itp(cfg.title || "");
      const descStr = itp(cfg.description || "");
      const footerStr = itp(cfg.footer || "");

      const groups = [
        ...(replyGroup.length ? [replyGroup] : []),
        ...actionGroups,
      ];

      for (let gi = 0; gi < groups.length; gi++) {
        const isFirst = gi === 0;
        const interactive = {
          type: "buttons",
          title: isFirst ? titleStr : "",
          description: isFirst ? descStr : "",
          footerText: gi === groups.length - 1 ? footerStr : "",
          buttons: groups[gi],
        };
        await onResponse(isFirst ? descStr : "", undefined, undefined, interactive);
      }

      // Se houver botões reply, fica pendente aguardando resposta
      if (replyGroup.length) {
        context.pendingNodeId = node.id;
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
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
    case "buttons_media": {
      const buttons = (cfg.buttons || []).slice(0, 3).map((b: any, i: number) => ({
        type: "reply",
        displayText: itp(b.displayText || b.text || `Botão ${i + 1}`),
        id: b.id || `btn_${i}`,
      }));
      const interactive = {
        type: "buttons",
        title: itp(cfg.title || ""),
        description: itp(cfg.description || ""),
        footerText: itp(cfg.footer || ""),
        thumbnailUrl: itp(cfg.thumbnailUrl || ""),
        mediaType: cfg.mediaType || "image",
        buttons,
      };
      await onResponse(itp(cfg.description || ""), undefined, undefined, interactive);
      context.pendingNodeId = node.id;
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const sessionKey = `whatsapp_${context?.vars?.session || "default"}_${context?.vars?.from || ""}`;
      await supabase.from("chat_sessions").upsert(
        { session_id: sessionKey, context, updated_at: new Date().toISOString() },
        { onConflict: "session_id" },
      );
      return;
    }
    case "carousel": {
      let cards: any[] = [];
      if (cfg.mode === "dynamic") {
        try {
          const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
          let q = supabase.from("produtos").select("id, nome, preco, imagem_url").limit(Math.min(cfg.dynamicLimit || 10, 10));
          if (cfg.dynamicGrupoId) q = q.eq("grupo_id", cfg.dynamicGrupoId);
          if (cfg.dynamicCategoriaId) q = q.eq("categoria_id", cfg.dynamicCategoriaId);
          const { data: prods } = await q;
          cards = (prods || []).map((p: any, i: number) => ({
            header: p.imagem_url || "",
            body: `${p.nome}${p.preco ? ` — R$ ${Number(p.preco).toFixed(2)}` : ""}`,
            footer: "",
            buttonText: cfg.dynamicButtonText || "Selecionar",
            buttonId: `prod_${p.id}`,
          }));
        } catch (e) {
          console.error("[CAROUSEL] erro produtos dinâmicos:", e);
        }
      } else {
        cards = (cfg.cards || []).slice(0, 10).map((c: any, i: number) => ({
          header: itp(c.header || ""),
          body: itp(c.body || ""),
          footer: itp(c.footer || ""),
          buttonText: itp(c.buttonText || "Selecionar"),
          buttonId: c.buttonId || `card_${i}`,
        }));
      }
      const interactive = {
        type: "carousel",
        title: itp(cfg.title || ""),
        description: itp(cfg.description || ""),
        footer: itp(cfg.footer || ""),
        cards,
      };
      await onResponse(itp(cfg.description || cfg.title || ""), undefined, undefined, interactive);
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

          // Aviso ao cliente antes de gerar o relatório (opcional, configurável)
          if (cfg.waitingMessageEnabled !== false) {
            const waitMsg = (typeof cfg.waitingMessage === "string" && cfg.waitingMessage.trim())
              ? itp(cfg.waitingMessage)
              : "⏳ Aguarde... gerando relatório em tempo real.";
            await onResponse(waitMsg);
            await new Promise((r) => setTimeout(r, 600));
          }
          
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
            const caption = buildMediaCaption(cfg, itp(cfg.successMessage || "📄 Seu relatório está pronto!"));
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
      case "attach_catalog": {
        console.log(`[FLOW] attach_catalog - config:`, JSON.stringify(cfg));
        try {
          const mode: "latest" | "specific" = cfg.mode === "specific" ? "specific" : "latest";
          const caption = buildMediaCaption(cfg);
          const estabId = context.vars.estabelecimento_id;
          if (!estabId) {
            console.error("[FLOW][attach_catalog] estabelecimento_id ausente no contexto");
            await onResponse("❌ Não foi possível identificar o estabelecimento para enviar o catálogo.");
            break;
          }

          const supabase = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
          let query = supabase
            .from("catalogos_salvos")
            .select("id, nome, pdf_url, pdf_generated_at, data_indeterminada, data_validade, updated_at")
            .eq("estabelecimento_id", estabId)
            .eq("ativo", true)
            .order("updated_at", { ascending: false });

          const { data: rows, error: qErr } = await query;
          if (qErr) {
            console.error("[FLOW][attach_catalog] erro ao carregar catálogos:", qErr);
            await onResponse("❌ Erro ao carregar catálogos.");
            break;
          }

          const now = new Date();
          const validCatalogs = (rows || []).filter((c: any) => {
            if (!c.data_indeterminada && c.data_validade) {
              return new Date(c.data_validade) > now;
            }
            return true;
          });

          if (validCatalogs.length === 0) {
            await onResponse("❌ Nenhum catálogo ativo disponível no momento.");
            break;
          }

          let targets: any[] = [];
          if (mode === "latest") {
            targets = [validCatalogs[0]];
          } else {
            const ids: string[] = Array.isArray(cfg.catalogIds) ? cfg.catalogIds : [];
            targets = validCatalogs.filter((c: any) => ids.includes(c.id));
            if (targets.length === 0) {
              await onResponse("❌ Nenhum catálogo selecionado foi encontrado entre os ativos.");
              break;
            }
          }

          // Aviso ao cliente antes de enviar o(s) PDF(s) (opcional, configurável)
          if (cfg.waitingMessageEnabled !== false) {
            const waitMsg = (typeof cfg.waitingMessage === "string" && cfg.waitingMessage.trim())
              ? itp(cfg.waitingMessage)
              : "⏳ Aguarde... gerando catálogo em tempo real.";
            await onResponse(waitMsg);
            await new Promise((r) => setTimeout(r, 600));
          }


          let sucesso = 0;
          for (const cat of targets) {
            let pdfUrl: string | null = cat.pdf_url || null;

            // Se não há PDF cacheado, aguarda alguns segundos e tenta refazer o fetch
            // (a geração roda em background no app sempre que a lista de catálogos é carregada).
            if (!pdfUrl) {
              console.log(`[FLOW][attach_catalog] PDF ausente para "${cat.nome}", aguardando geração em background...`);
              for (let attempt = 0; attempt < 6 && !pdfUrl; attempt++) {
                await new Promise((r) => setTimeout(r, 2500));
                const { data: refreshed } = await supabase
                  .from("catalogos_salvos")
                  .select("pdf_url")
                  .eq("id", cat.id)
                  .maybeSingle();
                if (refreshed?.pdf_url) {
                  pdfUrl = refreshed.pdf_url;
                  break;
                }
              }
            }

            if (!pdfUrl) {
              console.warn(`[FLOW][attach_catalog] catálogo ${cat.id} (${cat.nome}) sem PDF após espera`);
              await onResponse(
                `📄 Estamos preparando o catálogo "${cat.nome}". Por favor, solicite novamente em alguns instantes.`,
              );
              continue;
            }
            try {
              const cap = caption || cat.nome;
              await onResponse(cap, pdfUrl, "document");
              sucesso++;
              await new Promise((r) => setTimeout(r, 800));
            } catch (sendErr: any) {
              console.error(`[FLOW][attach_catalog] erro ao enviar "${cat.nome}":`, sendErr);
            }
          }

          if (cfg.outputVariable) {
            context.vars[cfg.outputVariable] = sucesso > 0 ? "Sucesso" : "Falha";
          }
        } catch (err) {
          console.error(`[FLOW] Exception em attach_catalog:`, err);
          await onResponse("❌ Erro ao anexar catálogo.");
        }
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
        // Pass-through (gatilho avaliado no roteador de entrada).
        for (const nx of nexts(node.id)) await executeNode(nx, nodes, edges, context, onResponse);
        break;
      }
      case "global_redirect": {
        // Ativa este bloco para o restante da sessão — só a partir daqui o gatilho passa a valer.
        const list: string[] = Array.isArray(context.vars.__active_global_redirects)
          ? context.vars.__active_global_redirects
          : [];
        if (!list.includes(node.id)) list.push(node.id);
        context.vars.__active_global_redirects = list;
        console.log(`[GLOBAL_REDIRECT] Ativado para sessão: ${node.id}`);
        for (const nx of nexts(node.id)) await executeNode(nx, nodes, edges, context, onResponse);
        break;
      }

      /* ============ WHATSAPP ESSENCIAL extras ============ */
      case "keyword_options": {
        const question = itp(cfg.question || "Escolha uma opção:");
        const options: any[] = Array.isArray(cfg.buttons)
          ? cfg.buttons
          : (Array.isArray(cfg.keywords) ? cfg.keywords : []);
        const replyButtons = options.slice(0, 3).map((b: any, i: number) => {
          const label = itp(String(b.label || b.text || b.keyword || `Opção ${i + 1}`)).trim() || `Opção ${i + 1}`;
          return {
            type: "reply",
            id: `button_${i}`,
            text: `${i + 1}. ${label}`,
            title: `${i + 1}. ${label}`,
            displayText: `${i + 1}. ${label}`,
          };
        });
        let fallback = question;
        options.forEach((b: any, i: number) => {
          const label = itp(String(b.label || b.text || b.keyword || `Opção ${i + 1}`)).trim() || `Opção ${i + 1}`;
          fallback += `\n${i + 1}. ${label}`;
        });
        if (replyButtons.length) {
          await onResponse(fallback, undefined, undefined, {
            type: "buttons",
            title: cfg.title || "",
            description: question,
            footerText: cfg.footer || cfg.footerText || "",
            buttons: replyButtons,
          });
        } else {
          await onResponse(fallback);
        }
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
        const name = cfg.templateName || cfg.template || "";
        const lang = cfg.language || "pt_BR";
        const fallbackTxt = itp(cfg.fallbackText || cfg.body || cfg.text || "");
        const bodyVars: string[] = Array.isArray(cfg.bodyVariables)
          ? cfg.bodyVariables.map((v: any) => itp(String(v ?? "")))
          : [];
        const headerParam = cfg.headerParam
          ? { type: cfg.headerParam.type || "text", value: itp(String(cfg.headerParam.value ?? "")) }
          : undefined;

        let sent = false;
        if (name && activeProvider === "cloud_api" && cloudPhoneNumberId && cloudAccessToken) {
          sent = await sendCloudTemplate(
            cloudPhoneNumberId,
            cloudAccessToken,
            context.vars.from || "",
            name,
            lang,
            bodyVars,
            headerParam,
          );
        }
        if (!sent) {
          if (fallbackTxt) {
            await onResponse(fallbackTxt);
          } else if (!name) {
            await onResponse(`📧 [Template não configurado]`);
          } else {
            await onResponse(`📧 [Template: ${name} / ${lang} — não enviado, configure Cloud API ou fallback]`);
          }
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
            if (cfg.waitingMessageEnabled !== false) {
              const customWait = typeof cfg.waitingMessage === "string" ? cfg.waitingMessage.trim() : "";
              await onResponse(customWait || `⏳ Estou gerando sua ${tipoLabel} agora. Isso pode levar ${tempoLabel}. Já te envio assim que ficar pronta!`);
            }

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

        // 🎯 Módulo Marketing Automation — dispara via scheduler (mesma lógica do bloco legado trigger_automation)
        if (moduleKey === "marketing_automation") {
          try {
            const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
            const { data, error } = await supabase.functions.invoke("marketing-automation-scheduler", {
              body: {
                automationId: workflowId,
                params: variablesForWf,
                triggeredBy: "whatsapp_bot",
                phone: context.vars.from,
              },
            });
            if (error) throw error;
            context.vars[outVar] = { ok: true, module: moduleKey, workflowId, workflowName: wfName, result: data };
          } catch (e: any) {
            console.error("[FLOW] trigger_workflow(marketing_automation) erro:", e);
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
          if (cfg.sendHandoffMessage !== false) {
            const handoff = (typeof cfg.handoffMessage === "string" && cfg.handoffMessage.trim().length > 0)
              ? itp(cfg.handoffMessage)
              : "Você foi transferido para um atendente. Aguarde, por favor.";
            await onResponse(handoff);
          }
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
      case "mensagem_pre_definida": {
        let semFrase = false;
        try {
          const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
          const cursorKey = `bot:${context.vars.bot_id || context.vars.botId || "flow"}:${node.id}`;
          const { data: pickData, error: pickErr } = await supabase.functions.invoke(
            "pick-mensagem-pre-definida",
            {
              body: {
                estabelecimentoId: context.vars.estabelecimento_id,
                escopo: cfg.escopo || "qualquer",
                grupoId: cfg.grupoId || undefined,
                tema: cfg.tema || undefined,
                modoSelecao: cfg.modoSelecao || "rotacao",
                fraseId: cfg.fraseId || undefined,
                cursorKey,
              },
            },
          );
          if (pickErr) throw pickErr;
          const frase = pickData?.frase?.frase;
          if (!frase) {
            semFrase = true;
          } else {
            if (cfg.outputVariable) context.vars[cfg.outputVariable] = frase;
            context.vars.last_mensagem_pre_definida = frase;

            if ((cfg.apresentacao || "texto") === "texto") {
              await onResponse(frase);
            } else {
              // Gerar mídia com a frase como conteúdo principal
              const basePrompt = [
                cfg.basePrompt || "",
                cfg.preset ? `Preset visual: ${cfg.preset}.` : "",
              ].filter(Boolean).join("\n");
              const promptFinal = `Crie uma peça de ${cfg.mediaType === "video" ? "vídeo curto" : "imagem"} destacando o texto: "${frase}"`;
              const { data, error } = await supabase.functions.invoke("bot-generate-ai-media", {
                body: {
                  prompt: promptFinal,
                  basePrompt,
                  variations: cfg.variations || 1,
                  estabelecimentoId: context.vars.estabelecimento_id,
                  aspectRatio: cfg.aspectRatio || "1:1",
                  mediaType: cfg.mediaType || "image",
                  styleSource: cfg.styleSource || "visual_identity",
                },
              });
              if (error) throw error;
              const urls: string[] = Array.isArray(data?.images)
                ? data.images
                : (data?.items || data?.results || []).map((it: any) => it?.url).filter(Boolean);
              if (!urls.length) {
                await onResponse(frase);
              } else {
                let first = true;
                for (const url of urls.slice(0, cfg.variations || 1)) {
                  await onResponse(first ? frase : "", url, cfg.mediaType === "video" ? "video" : "image");
                  first = false;
                  await new Promise((r) => setTimeout(r, 600));
                }
                context.vars.last_generated_media_url = urls[0];
                context.vars.last_generated_media_urls = urls;
              }
            }
          }
        } catch (e) {
          console.error(`[FLOW] mensagem_pre_definida error:`, e);
          semFrase = true;
        }
        // Roteia via sourceHandle: "sem_frase" se não obteve frase, senão "default"
        const desiredHandle = semFrase ? "sem_frase" : "default";
        const outs = edges.filter((e: any) => e.source === node.id);
        let edge = outs.find((e: any) => e.sourceHandle === desiredHandle);
        if (!edge && !semFrase) {
          edge = outs.find((e: any) => !e.sourceHandle || e.sourceHandle === "default");
        }
        const nx = edge ? nodes.find((n: any) => n.id === edge.target) : null;
        if (nx) await executeNode(nx, nodes, edges, context, onResponse);
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
          if (cfg.waitingMessageEnabled !== false) {
            const waitMsg = (typeof cfg.waitingMessage === "string" && cfg.waitingMessage.trim())
              ? itp(cfg.waitingMessage)
              : `🎨 Gerando mídia, tempo estimado ${estimatedText}...`;
            await onResponse(waitMsg);
          }

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
            const mediaCap = buildMediaCaption(cfg);
            let first = true;
            for (const url of urls.slice(0, 4)) {
              await onResponse(first ? mediaCap : "", url, "image");
              first = false;
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
          const tcButtons = [
            { text: "Sim", id: "tc_sim" },
            { text: "Não", id: "tc_nao" },
            { text: "Sair", id: "__exit__" },
          ];
          const tcInteractive = {
            type: "buttons",
            title: itp(cfg.headerTitle || ""),
            description: q,
            footerText: itp(cfg.footerText || ""),
            buttons: tcButtons,
          };
          fallback = `${q}\n1. Sim\n2. Não\n3. Sair`;
          await onResponse(fallback, undefined, undefined, tcInteractive);
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
          title: itp(cfg.headerTitle || ""),
          description: q,
          footerText: itp(cfg.footerText || ""),
          buttons,
        };
        let fallback = q;
        buttons.forEach((b: any, i: number) => { fallback += `\n${i + 1}. ${b.text}`; });
        // Envia como reply buttons (quick reply) — fallback de texto é automático em caso de falha.
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


