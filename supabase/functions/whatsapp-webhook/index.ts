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
          WAHA_URL = wahaConfig.waha_url || "";
          WAHA_API_KEY = wahaConfig.waha_api_key || "";
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
      // Busca o estabelecimento_id da sessão
      const { data: sessionData } = await supabase
        .from("whatsapp_sessions")
        .select("estabelecimento_id")
        .eq("session_name", wahaSession)
        .maybeSingle();
      
      if (sessionData?.estabelecimento_id) {
        // Busca o bot ativo desse estabelecimento configurado para WhatsApp WAHA
        const { data } = await supabase
          .from("bot_flows")
          .select("*")
          .eq("active", true)
          .eq("estabelecimento_id", sessionData.estabelecimento_id)
          .contains("canais", ["whatsapp"])
          .eq("whatsapp_type", "waha")
          .maybeSingle();
        
        console.log("[WAHA] Bot search result:", { found: !!data, botName: data?.name, whatsappType: data?.whatsapp_type });
        flowData = data;
      }
    } else {
      // Para Meta, busca qualquer bot ativo configurado para WhatsApp Business
      const { data } = await supabase
        .from("bot_flows")
        .select("*")
        .eq("active", true)
        .contains("canais", ["whatsapp"])
        .eq("whatsapp_type", "business")
        .maybeSingle();
      
      console.log("[META] Bot search result:", { found: !!data, botName: data?.name, whatsappType: data?.whatsapp_type });
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
    if (estabelecimentoId) context.vars.estabelecimento_id = estabelecimentoId;

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

    const onResponse = async (message: string, mediaUrl?: string, mediaType?: string) => {
      // Salva mensagem do bot na conversation
      if (conversationId && message) {
        console.log("[ATENDIMENTO] Salvando mensagem do bot");
        const { error: botMsgError } = await supabase
          .from("messages")
          .insert({
            conversation_id: conversationId,
            sender: "agent",
            text: message
          });
        
        if (botMsgError) {
          console.error("[ATENDIMENTO] Erro ao salvar mensagem do bot:", botMsgError);
        } else {
          console.log("[ATENDIMENTO] ✓ Mensagem do bot salva");
        }
      }
      // Se tem mídia, envia tudo junto em uma única chamada
      if (mediaUrl && mediaType) {
        await respond(message, mediaUrl, mediaType);
      } 
      // Se só tem mensagem, envia apenas texto
      else if (message) {
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

  const endpoints = [
    `${baseUrl}/api/sendText`, // WAHA Plus (global)
    `${baseUrl}/api/sessions/${sessionName}/sendText`,
    `${baseUrl}/api/sessions/${sessionName}/messages/send`,
    `${baseUrl}/api/sessions/${sessionName}/messages`,
    `${baseUrl}/api/sessions/${sessionName}/sendMessage`,
    `${baseUrl}/api/sessions/${sessionName}/chats/send-text`,
    `${baseUrl}/api/sessions/${sessionName}/chats/${encodeURIComponent(chatId)}/send-text`,
    `${baseUrl}/api/chats/${encodeURIComponent(chatId)}/send-text`,
    `${baseUrl}/api/messages/send-text`,
  ];

  const variants: any[] = [
    { session: sessionName, chatId, text }, // sendText style
    { chatId, text },
    { to: chatId, text },
    { jid: chatId, text },
    { number: toNumberOnly, text },
    { phone: toNumberOnly, text },
    { chatId, type: "text", text: { body: text } }, // some builds expect nested text
    { to: chatId, type: "text", text: { body: text } },
    { jid: chatId, message: text },
  ];

  for (const base of endpoints) {
    const urlVariants = [
      base,
      `${base}?session=${encodeURIComponent(sessionName)}`,
      `${base}?token=${encodeURIComponent(wahaApiKey)}`,
      `${base}?session=${encodeURIComponent(sessionName)}&token=${encodeURIComponent(wahaApiKey)}`,
      `${base}?apikey=${encodeURIComponent(wahaApiKey)}`,
      `${base}?api_key=${encodeURIComponent(wahaApiKey)}`,
    ];

    const headerSets: Array<Record<string, string>> = [
      {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${wahaApiKey}`,
        "X-API-KEY": wahaApiKey,
        "X-Api-Key": wahaApiKey,
        "x-api-key": wahaApiKey,
        apikey: wahaApiKey,
        "X-Session-Name": sessionName,
      },
      {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Apikey ${wahaApiKey}`,
        "x-api-key": wahaApiKey,
        apikey: wahaApiKey,
        "X-Session-Name": sessionName,
      },
      {
        "Content-Type": "application/json",
        Accept: "application/json",
        "x-api-key": wahaApiKey,
        "X-Session-Name": sessionName,
      },
    ];

    for (const url of urlVariants) {
      for (const body of variants) {
        for (const headers of headerSets) {
          try {
            console.log(`[WAHA] Trying TEXT -> ${chatId} via ${url} with body keys: ${Object.keys(body).join(',')}`);
            const resp = await fetch(url, {
              method: "POST",
              headers,
              body: JSON.stringify(body),
            });
            const resultText = await resp.text();
            console.log("[WAHA] TEXT result:", resp.status, resultText);
            if (resp.ok) return;
            if (resp.status === 404) break;
            if (resp.status === 401) continue; // try next variant/headers
          } catch (err) {
            console.error("[WAHA] error sending text via", url, err);
          }
        }
      }

      // GET fallback (alguns WAHA Plus aceitam sendText via GET)
      if (base.includes('/sendText')) {
        const getParamSets = [
          `session=${encodeURIComponent(sessionName)}&to=${encodeURIComponent(toNumberOnly)}&message=${encodeURIComponent(text)}`,
          `session=${encodeURIComponent(sessionName)}&to=${encodeURIComponent(chatId)}&text=${encodeURIComponent(text)}`,
          `session=${encodeURIComponent(sessionName)}&jid=${encodeURIComponent(chatId)}&message=${encodeURIComponent(text)}`,
          `session=${encodeURIComponent(sessionName)}&number=${encodeURIComponent(toNumberOnly)}&text=${encodeURIComponent(text)}`,
        ];
        const tokenParams = [
          `token=${encodeURIComponent(wahaApiKey)}`,
          `apikey=${encodeURIComponent(wahaApiKey)}`,
          `api_key=${encodeURIComponent(wahaApiKey)}`,
        ];
        for (const params of getParamSets) {
          for (const tok of tokenParams) {
            const urlWithParams = `${base}?${params}&${tok}`;
            try {
              console.log(`[WAHA] Trying GET TEXT -> ${chatId} via ${urlWithParams}`);
              const resp = await fetch(urlWithParams, {
                method: "GET",
                headers: {
                  Accept: "application/json",
                  "x-api-key": wahaApiKey,
                  "X-Session-Name": sessionName,
                },
              });
              const resultText = await resp.text();
              console.log("[WAHA] GET TEXT result:", resp.status, resultText);
              if (resp.ok) return;
            } catch (err) {
              console.error("[WAHA] error sending GET text via", urlWithParams, err);
            }
          }
        }
      }
    }
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

  // Inferir nome do arquivo e mimetype a partir da URL
  const _lastPath = (() => { try { return new URL(mediaUrl).pathname.split('/').pop() || 'arquivo'; } catch { return mediaUrl.split('?')[0].split('/').pop() || 'arquivo'; } })();
  const inferredName = decodeURIComponent(_lastPath);
  const lowerName = inferredName.toLowerCase();
  const isPdf = lowerName.endsWith('.pdf');
  const isXlsx = lowerName.endsWith('.xlsx');
  const mime = isPdf
    ? 'application/pdf'
    : isXlsx
    ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    : 'application/octet-stream';

  const baseUrl = wahaUrl.replace(/\/$/, '');
  const endpoints = [
    `${baseUrl}/api/sendFile`,
    `${baseUrl}/api/sessions/${sessionName}/sendFile`,
    `${baseUrl}/api/sessions/${sessionName}/messages`,
    `${baseUrl}/api/sessions/${sessionName}/sendMessage`,
    `${baseUrl}/api/sessions/${sessionName}/messages/send`,
    `${baseUrl}/api/sessions/${sessionName}/messages/${t}`,
  ];

  const variantBase: any[] = [
    // Formato 1: url direto (com nome)
    { session: sessionName, chatId, type: t, url: mediaUrl, caption, fileName: inferredName, filename: inferredName, name: inferredName },
    { session: sessionName, to: toNumberOnly, type: t, url: mediaUrl, caption, fileName: inferredName },
    { session: sessionName, to: chatId, type: t, url: mediaUrl, caption, fileName: inferredName },
    
    // Formato 2: nested object (WAHA Plus padrão)
    { session: sessionName, to: chatId, [t]: { url: mediaUrl, filename: inferredName }, caption },
    { session: sessionName, chatId, [t]: { url: mediaUrl, filename: inferredName }, caption },
    
    // Formato 3: campo file com mimetype e nome
    { session: sessionName, chatId, file: { url: mediaUrl, mimetype: mime, filename: inferredName }, caption },
    { session: sessionName, to: chatId, file: { url: mediaUrl, mimetype: mime, filename: inferredName }, caption },
    
    // Formato 4: sem session na raiz
    { chatId, type: t, url: mediaUrl, caption, fileName: inferredName },
    { to: chatId, type: t, url: mediaUrl, caption, fileName: inferredName },
    { chatId, [t]: { url: mediaUrl, filename: inferredName }, caption },
    
    // Formato 5: variações adicionais
    { to: toNumberOnly, type: t, url: mediaUrl, caption, filename: inferredName },
    { number: toNumberOnly, type: t, url: mediaUrl, caption, filename: inferredName },
  ];

  const headerSets: Array<Record<string, string>> = [
    {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${wahaApiKey}`,
      "X-API-KEY": wahaApiKey,
      "X-Api-Key": wahaApiKey,
      "x-api-key": wahaApiKey,
      "X-Session-Name": sessionName,
    },
    {
      "Content-Type": "application/json",
      Accept: "application/json",
      "x-api-key": wahaApiKey,
      "X-Session-Name": sessionName,
    },
  ];

  for (const base of endpoints) {
    const urlVariants = [
      base,
      `${base}?session=${encodeURIComponent(sessionName)}`,
      `${base}?token=${encodeURIComponent(wahaApiKey)}`,
      `${base}?session=${encodeURIComponent(sessionName)}&token=${encodeURIComponent(wahaApiKey)}`,
    ];
    
    for (const url of urlVariants) {
      for (const body of variantBase) {
        for (const headers of headerSets) {
          try {
            console.log(`[WAHA] 📤 Tentando enviar mídia (${t})`);
            console.log(`[WAHA]    URL: ${url}`);
            console.log(`[WAHA]    Body keys: ${Object.keys(body).join(',')}`);
            console.log(`[WAHA]    Body completo:`, JSON.stringify(body, null, 2));
            console.log(`[WAHA]    Headers: ${Object.keys(headers).filter(k => k !== 'Authorization' && !k.toLowerCase().includes('key')).join(',')}`);
            
            const resp = await fetch(url, {
              method: "POST",
              headers,
              body: JSON.stringify(body),
            });
            const result = await resp.json().catch(() => ({}));
            console.log("[WAHA] 📥 Resposta MEDIA:", resp.status, JSON.stringify(result));
            
            if (resp.ok) {
              console.log("[WAHA] ✅ Mídia enviada com sucesso!");
              return;
            }
            if (resp.status === 404) {
              console.log("[WAHA] ⚠️ Endpoint 404, tentando próximo...");
              break;
            }
            if (resp.status === 401) {
              console.log("[WAHA] ⚠️ Não autorizado (401), tentando próxima variante...");
              continue;
            }
          } catch (err) {
            console.error("[WAHA] ❌ Erro ao enviar mídia via", url, err);
          }
        }
      }
    }
  }

  // ===== Fallback: upload multipart/form-data com arquivo real =====
  try {
    console.log("[WAHA] 🔁 Tentando fallback multipart (upload de arquivo)");

    // Baixa o arquivo público para bytes com timeout aumentado
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutos de timeout
    
    console.log("[WAHA] 📥 Baixando arquivo de:", mediaUrl);
    const fileResp = await fetch(mediaUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!fileResp.ok) {
      console.error("[WAHA] ❌ Falha ao baixar mídia para upload:", fileResp.status, fileResp.statusText);
      throw new Error(`download_failed_${fileResp.status}`);
    }
    
    const buf = new Uint8Array(await fileResp.arrayBuffer());
    const sizeMB = buf.length / (1024 * 1024);
    console.log(`[WAHA] ✅ Arquivo baixado: ${sizeMB.toFixed(2)} MB`);
    
    if (sizeMB > 25) {
      console.warn(`[WAHA] ⚠️ Arquivo grande (${sizeMB.toFixed(2)} MB). Pode falhar no envio via WhatsApp em alguns dispositivos.`);
    }

    // Deduz nome e content-type
    const urlObj = new URL(mediaUrl);
    const baseName = urlObj.pathname.split('/').pop() || 'arquivo';
    const lower = baseName.toLowerCase();
    const isPdf = lower.endsWith('.pdf');
    const isXlsx = lower.endsWith('.xlsx');
    const contentType = isPdf
      ? 'application/pdf'
      : isXlsx
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'application/octet-stream';

    const fileFieldNames = ['file', 'document', 'media', 'attachment'];
    const recipientParamSets = [
      { chatId },
      { to: chatId },
      { to: toNumberOnly },
      { jid: chatId },
      { number: toNumberOnly },
    ];
    
    let uploadAttempts = 0;
    const maxUploadAttempts = 3; // Tentar até 3 vezes

    for (const base of endpoints) {
      const urlVariants = [
        base,
        `${base}?session=${encodeURIComponent(sessionName)}`,
        `${base}?token=${encodeURIComponent(wahaApiKey)}`,
        `${base}?session=${encodeURIComponent(sessionName)}&token=${encodeURIComponent(wahaApiKey)}`,
      ];

      for (const url of urlVariants) {
        for (const headers of headerSets) {
          for (const recipient of recipientParamSets) {
            for (const fileField of fileFieldNames) {
              uploadAttempts++;
              if (uploadAttempts > maxUploadAttempts * endpoints.length) {
                console.error(`[WAHA] ❌ Número máximo de tentativas de upload atingido`);
                break;
              }
              
              try {
                const fd = new FormData();
                // sessão também no corpo, alguns WAHA exigem
                fd.append('session', sessionName);
                fd.append('type', t);
                if (caption) fd.append('caption', caption);
                Object.entries(recipient).forEach(([k, v]) => fd.append(k, String(v)));
                fd.append(fileField, new Blob([buf], { type: contentType }), baseName);

                // Não definir Content-Type manualmente (boundary automático)
                const hdrs = { ...headers } as Record<string, string>;
                delete hdrs['Content-Type'];

                console.log(`[WAHA] 📤 Multipart tentativa ${uploadAttempts} -> ${url} (fileField=${fileField}, recipient=${Object.keys(recipient).join(',')}, size=${sizeMB.toFixed(2)}MB)`);
                
                // Timeout aumentado para arquivos grandes
                const uploadController = new AbortController();
                const uploadTimeoutId = setTimeout(() => uploadController.abort(), 180000); // 3 minutos
                
                const resp = await fetch(url, {
                  method: 'POST',
                  headers: hdrs,
                  body: fd as any,
                  signal: uploadController.signal,
                });
                clearTimeout(uploadTimeoutId);
                
                const txt = await resp.text();
                console.log('[WAHA] 📥 Resposta MULTIPART:', resp.status, txt);
                if (resp.ok) {
                  console.log('[WAHA] ✅ Upload multipart enviado com sucesso!');
                  return;
                }
                if (resp.status === 404) break; // tentar próximo endpoint
                if (resp.status === 401) continue; // tentar próxima combinação
                
                // Retry delay para erros temporários
                if (resp.status >= 500) {
                  console.log('[WAHA] ⏳ Erro temporário, aguardando 2s antes de retry...');
                  await new Promise(r => setTimeout(r, 2000));
                }
              } catch (e: any) {
                if (e.name === 'AbortError') {
                  console.error('[WAHA] ❌ Timeout no upload multipart (arquivo muito grande ou conexão lenta)');
                } else {
                  console.error('[WAHA] ❌ Erro no upload multipart:', e);
                }
              }
            }
          }
        }
      }
    }
  } catch (e) {
    console.error('[WAHA] ❌ Fallback multipart falhou:', e);
  }

  console.error("[WAHA] ❌ Todas as tentativas de envio de mídia falharam para sessão:", sessionName);
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
      default: {
        console.log(`[FLOW] Unknown node type: ${data.type} - moving to next nodes`);
        for (const nx of nexts(node.id)) await executeNode(nx, nodes, edges, context, onResponse);
      }
    }
  } catch (err) {
    console.error(`[FLOW] Error executing node ${node.id} (${data.type}):`, err);
    throw err;
  }
}


