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
    const {
      conversationId,
      telefone,
      estabelecimento_id,
      text,
      fileUrl,
      fileName,
      contentType,
      whatsappNumeroId,
      whatsappSessionId,
      whatsappSessionName,
      botFlowId,
      contact, // { nome, whatsapp } — envia vCard/contato
    } = await req.json();

    if ((!conversationId && (!telefone || !estabelecimento_id)) || (!text && !fileUrl && !contact)) {
      return new Response(
        JSON.stringify({ error: "conversationId or (telefone + estabelecimento_id) and text/fileUrl/contact are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));

    let conversation: any = null;
    let customerPhone = "";

    if (conversationId) {
      const { data: conv, error: convError } = await supabase
        .from("conversations")
        .select(`
          id, bot_id, estabelecimento_id,
          customer:customers!conversations_customer_id_fkey ( telefone )
        `)
        .eq("id", conversationId)
        .single();

      if (convError || !conv) {
        return new Response(
          JSON.stringify({ error: "Conversation not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      conversation = conv;
      customerPhone = (conversation as any).customer?.telefone;
    } else {
      // Resolve ou cria customer/conversation a partir do telefone + estabelecimento
      const phoneOnly = String(telefone).replace(/\D/g, "");
      if (!phoneOnly) {
        return new Response(
          JSON.stringify({ error: "Telefone inválido" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: existingCustomer } = await supabase
        .from("customers")
        .select("id, telefone")
        .eq("estabelecimento_id", estabelecimento_id)
        .eq("telefone", phoneOnly)
        .maybeSingle();

      let customerId = existingCustomer?.id;
      if (!customerId) {
        const { data: newCustomer, error: custErr } = await supabase
          .from("customers")
          .insert({
            estabelecimento_id,
            nome: `Contato ${phoneOnly}`,
            telefone: phoneOnly,
            email: `whatsapp-${phoneOnly}@placeholder.local`,
            ativo: true,
          })
          .select("id")
          .single();
        if (custErr) {
          return new Response(
            JSON.stringify({ error: `Erro ao criar customer: ${custErr.message}` }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        customerId = newCustomer?.id;
      }

      const { data: existingConv } = await supabase
        .from("conversations")
        .select("id, bot_id, estabelecimento_id")
        .eq("customer_id", customerId)
        .eq("canal", "whatsapp")
        .eq("estabelecimento_id", estabelecimento_id)
        .in("status", ["open", "pending"])
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingConv) {
        conversation = existingConv;
      } else {
        const { data: newConv, error: newConvErr } = await supabase
          .from("conversations")
          .insert({
            customer_id: customerId,
            estabelecimento_id,
            canal: "whatsapp",
            status: "open",
            bot_active: false,
            metadata: { origem: "workflow" },
          })
          .select("id, bot_id, estabelecimento_id")
          .single();
        if (newConvErr) {
          return new Response(
            JSON.stringify({ error: `Erro ao criar conversation: ${newConvErr.message}` }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        conversation = newConv;
      }
      customerPhone = phoneOnly;
    }

    if (!customerPhone) {
      return new Response(
        JSON.stringify({ error: "Customer phone not found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const toNumberOnly = String(customerPhone).replace(/\D/g, "");

    // ===== Resolve número (prioridade: override do atendente > bot > padrão) =====
    let numero: any = null;
    const resolveEvolutionSession = async (session: any) => {
      const scopedEstabelecimentoId = conversation?.estabelecimento_id || estabelecimento_id || session?.estabelecimento_id;
      const { data: cfg } = scopedEstabelecimentoId
        ? await supabase
          .from("whatsapp_config")
          .select("provider, waha_url, waha_api_key")
          .eq("estabelecimento_id", scopedEstabelecimentoId)
          .maybeSingle()
        : { data: null };

      if (!session?.session_name || !cfg?.waha_url || !cfg?.waha_api_key) return null;
      return {
        provider: cfg.provider || "evolution",
        waha_url: cfg.waha_url,
        waha_api_key: cfg.waha_api_key,
        session_name: session.session_name,
        nome: session.session_name,
      };
    };

    // Prioridade máxima: sessão Evolution escolhida no bloco/workflow.
    if (whatsappSessionId) {
      const { data: session } = await supabase
        .from("whatsapp_sessions")
        .select("id, session_name, estabelecimento_id, status")
        .eq("id", whatsappSessionId)
        .maybeSingle();
      numero = await resolveEvolutionSession(session);
    }
    if (!numero && whatsappSessionName) {
      let q = supabase
        .from("whatsapp_sessions")
        .select("id, session_name, estabelecimento_id, status")
        .eq("session_name", whatsappSessionName)
        .order("updated_at", { ascending: false })
        .limit(1);
      const scopedEstabelecimentoId = conversation?.estabelecimento_id || estabelecimento_id;
      if (scopedEstabelecimentoId) q = q.eq("estabelecimento_id", scopedEstabelecimentoId);
      const { data: sessions } = await q;
      numero = await resolveEvolutionSession(sessions?.[0]);
    }
    if (!numero && botFlowId) {
      const { data: session } = await supabase
        .from("whatsapp_sessions")
        .select("id, session_name, estabelecimento_id, status")
        .eq("bot_flow_id", botFlowId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      numero = await resolveEvolutionSession(session);
    }

    if (!numero && whatsappNumeroId) {
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

    // Fallback antigo (compatibilidade): whatsapp_config por estabelecimento
    if (!numero && conversation.estabelecimento_id) {
      const { data: wahaConfig } = await supabase
        .from("whatsapp_config")
        .select("*")
        .eq("estabelecimento_id", conversation.estabelecimento_id)
        .maybeSingle();
      if (wahaConfig?.waha_url && wahaConfig?.waha_api_key) {
        numero = {
          provider: wahaConfig.provider || "evolution",
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

    let sendResult: { ok: boolean; invalid?: boolean; reason?: string } = { ok: true };
    if (numero.provider === "cloud_api") {
      if (contact && contact.whatsapp) {
        sendResult = await sendCloudContact(numero.cloud_phone_number_id, numero.cloud_access_token, toNumberOnly, contact);
      } else if (fileUrl) {
        sendResult = await sendCloudMedia(numero.cloud_phone_number_id, numero.cloud_access_token, toNumberOnly, fileUrl, contentType || "document", text);
      } else {
        sendResult = await sendCloudText(numero.cloud_phone_number_id, numero.cloud_access_token, toNumberOnly, text);
      }
    } else {
      const base = (numero.waha_url || "").replace(/\/+$/, "");
      const session = numero.session_name || "default";
      const apiKey = numero.waha_api_key;
      if (contact && contact.whatsapp) {
        sendResult = await sendEvolutionContact(toNumberOnly, contact, session, base, apiKey);
      } else if (fileUrl) {
        sendResult = await sendEvolutionMedia(toNumberOnly, text || undefined, contentType || "document", fileUrl, session, base, apiKey);
      } else {
        sendResult = await sendEvolutionText(toNumberOnly, text, session, base, apiKey);
      }
    }

    // Marca whatsapp_status nas tabelas quando o provedor confirma número inválido
    if (sendResult.invalid) {
      await markWhatsappStatus(supabase, toNumberOnly, "invalid", sendResult.reason || "provider_reported_invalid");
    } else if (sendResult.ok) {
      await markWhatsappStatus(supabase, toNumberOnly, "valid", null);
    }

    return new Response(JSON.stringify({
      success: sendResult.ok,
      invalid_number: !!sendResult.invalid,
      reason: sendResult.reason || null,
    }), {
      status: sendResult.ok ? 200 : (sendResult.invalid ? 422 : 502),
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

/* ===== Marcação passiva de status do WhatsApp ===== */
async function markWhatsappStatus(supabase: any, phone: string, status: "valid" | "invalid", reason: string | null) {
  try {
    const digits = String(phone).replace(/\D/g, "");
    if (!digits || digits.length < 10) return;
    // Gera variações comuns (com/sem 55, com/sem 9º dígito)
    const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
    const withoutCountry = digits.startsWith("55") ? digits.slice(2) : digits;
    const variants = Array.from(new Set([digits, withCountry, withoutCountry]));
    const patch = { whatsapp_status: status, whatsapp_status_at: new Date().toISOString(), whatsapp_status_reason: reason };

    // customers.telefone (apenas dígitos)
    await supabase.from("customers").update(patch).in("telefone", variants).then(() => {}, () => {});
    // usuarios.whatsapp (mascarado ou não — comparamos por dígitos via regexp_replace no SQL não é possível pelo client)
    // Fazemos update por variantes; se estiver mascarado, o update não atinge — o webhook do provedor cobre a longo prazo.
    await supabase.from("usuarios").update(patch).in("whatsapp", variants).then(() => {}, () => {});
    // empresas.whatsapp e empresas.telefone
    await supabase.from("empresas").update(patch).in("whatsapp", variants).then(() => {}, () => {});
    await supabase.from("empresas").update(patch).in("telefone", variants).then(() => {}, () => {});
  } catch (e) {
    console.error("[AGENT] markWhatsappStatus error:", e);
  }
}

/* ===== Evolution senders ===== */
type SendOut = { ok: boolean; invalid?: boolean; reason?: string };

function detectInvalidFromText(bodyTxt: string): { invalid: boolean; reason?: string } {
  const lower = (bodyTxt || "").toLowerCase();
  if (/exists["'\s:]+false/.test(lower)) return { invalid: true, reason: "number_not_on_whatsapp" };
  if (/not.*(exist|registered).*(whatsapp|number)/.test(lower)) return { invalid: true, reason: "number_not_on_whatsapp" };
  if (/invalid.*(number|phone|jid)/.test(lower)) return { invalid: true, reason: "invalid_number" };
  if (/"code"\s*:\s*(131026|131047|131051)/.test(lower)) return { invalid: true, reason: `meta_${lower.match(/(131026|131047|131051)/)?.[1]}` };
  return { invalid: false };
}

async function sendEvolutionText(toNumberOnly: string, text: string, sessionName: string, base: string, apiKey: string): Promise<SendOut> {
  if (!base || !apiKey) { console.error("[AGENT][EVO] Faltam URL/apikey"); return { ok: false, reason: "config_missing" }; }
  const number = String(toNumberOnly).replace(/\D/g, "");
  const res = await fetch(`${base}/message/sendText/${encodeURIComponent(sessionName)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: apiKey },
    body: JSON.stringify({ number, text }),
  });
  const bodyTxt = await res.text().catch(() => "");
  console.log("[AGENT][EVO] sendText:", res.status, bodyTxt.slice(0, 200));
  const inv = detectInvalidFromText(bodyTxt);
  if (inv.invalid) return { ok: false, invalid: true, reason: inv.reason };
  if (res.status === 400 || res.status === 404) return { ok: false, invalid: true, reason: `http_${res.status}` };
  return { ok: res.ok, reason: res.ok ? undefined : `http_${res.status}` };
}

async function sendEvolutionMedia(toNumberOnly: string, caption: string | undefined, mediaType: string, mediaUrl: string, sessionName: string, base: string, apiKey: string): Promise<SendOut> {
  if (!base || !apiKey) { console.error("[AGENT][EVO] Faltam URL/apikey"); return { ok: false, reason: "config_missing" }; }
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
  const bodyTxt = await res.text().catch(() => "");
  console.log("[AGENT][EVO] sendMedia:", res.status, bodyTxt.slice(0, 200));
  const inv = detectInvalidFromText(bodyTxt);
  if (inv.invalid) return { ok: false, invalid: true, reason: inv.reason };
  if (res.status === 400 || res.status === 404) return { ok: false, invalid: true, reason: `http_${res.status}` };
  return { ok: res.ok, reason: res.ok ? undefined : `http_${res.status}` };
}

/* ===== Cloud API senders ===== */
async function sendCloudText(phoneNumberId: string, accessToken: string, to: string, text: string): Promise<SendOut> {
  if (!phoneNumberId || !accessToken) { console.error("[AGENT][CLOUD] Faltam credenciais"); return { ok: false, reason: "config_missing" }; }
  const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body: text } }),
  });
  const bodyTxt = await r.text().catch(() => "");
  if (!r.ok) console.error("[AGENT][CLOUD] sendText error:", bodyTxt);
  const inv = detectInvalidFromText(bodyTxt);
  if (inv.invalid) return { ok: false, invalid: true, reason: inv.reason };
  return { ok: r.ok, reason: r.ok ? undefined : `http_${r.status}` };
}

async function sendCloudMedia(phoneNumberId: string, accessToken: string, to: string, mediaUrl: string, mediaType: string, caption?: string): Promise<SendOut> {
  if (!phoneNumberId || !accessToken) { console.error("[AGENT][CLOUD] Faltam credenciais"); return { ok: false, reason: "config_missing" }; }
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
  const bodyTxt = await r.text().catch(() => "");
  if (!r.ok) console.error("[AGENT][CLOUD] sendMedia error:", bodyTxt);
  const inv = detectInvalidFromText(bodyTxt);
  if (inv.invalid) return { ok: false, invalid: true, reason: inv.reason };
  return { ok: r.ok, reason: r.ok ? undefined : `http_${r.status}` };
}

/* ===== Contact (vCard) senders ===== */
function buildVCard(nome: string, whatsapp: string): string {
  const digits = String(whatsapp || "").replace(/\D/g, "");
  const displayName = (nome || digits || "Contato").trim();
  return [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${displayName};;;;`,
    `FN:${displayName}`,
    `TEL;type=CELL;type=VOICE;waid=${digits}:+${digits}`,
    "END:VCARD",
  ].join("\n");
}

async function sendEvolutionContact(toNumberOnly: string, contact: { nome?: string; whatsapp: string }, sessionName: string, base: string, apiKey: string): Promise<SendOut> {
  if (!base || !apiKey) { console.error("[AGENT][EVO] Faltam URL/apikey"); return { ok: false, reason: "config_missing" }; }
  const number = String(toNumberOnly).replace(/\D/g, "");
  const contactDigits = String(contact.whatsapp).replace(/\D/g, "");
  if (!contactDigits) return { ok: false, reason: "contact_missing_phone" };
  const displayName = (contact.nome || contactDigits).trim();
  const body = {
    number,
    contact: [{
      fullName: displayName,
      wuid: contactDigits,
      phoneNumber: `+${contactDigits}`,
    }],
  };
  const res = await fetch(`${base}/message/sendContact/${encodeURIComponent(sessionName)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: apiKey },
    body: JSON.stringify(body),
  });
  const bodyTxt = await res.text().catch(() => "");
  console.log("[AGENT][EVO] sendContact:", res.status, bodyTxt.slice(0, 200));
  const inv = detectInvalidFromText(bodyTxt);
  if (inv.invalid) return { ok: false, invalid: true, reason: inv.reason };
  if (res.status === 400 || res.status === 404) return { ok: false, invalid: true, reason: `http_${res.status}` };
  return { ok: res.ok, reason: res.ok ? undefined : `http_${res.status}` };
}

async function sendCloudContact(phoneNumberId: string, accessToken: string, to: string, contact: { nome?: string; whatsapp: string }): Promise<SendOut> {
  if (!phoneNumberId || !accessToken) return { ok: false, reason: "config_missing" };
  const digits = String(contact.whatsapp).replace(/\D/g, "");
  if (!digits) return { ok: false, reason: "contact_missing_phone" };
  const displayName = (contact.nome || digits).trim();
  const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
  const body = {
    messaging_product: "whatsapp",
    to,
    type: "contacts",
    contacts: [{
      name: { formatted_name: displayName, first_name: displayName },
      phones: [{ phone: `+${digits}`, wa_id: digits, type: "CELL" }],
    }],
  };
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(body),
  });
  const bodyTxt = await r.text().catch(() => "");
  if (!r.ok) console.error("[AGENT][CLOUD] sendContact error:", bodyTxt);
  const inv = detectInvalidFromText(bodyTxt);
  if (inv.invalid) return { ok: false, invalid: true, reason: inv.reason };
  return { ok: r.ok, reason: r.ok ? undefined : `http_${r.status}` };
}
