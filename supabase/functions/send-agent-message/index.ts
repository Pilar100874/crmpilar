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

    // ===== Resolve número (prioridade: sessão explícita do bloco > bot > padrão) =====
    let numero: any = null;
    const resolveEvolutionSession = async (session: any) => {
      const scopedEstabelecimentoId = conversation?.estabelecimento_id || estabelecimento_id || session?.estabelecimento_id;
      const { data: cfg } = scopedEstabelecimentoId
        ? await supabase
          .from("whatsapp_config")
          .select("provider, evolution_url, evolution_api_key")
          .eq("estabelecimento_id", scopedEstabelecimentoId)
          .maybeSingle()
        : { data: null };

      if (!session?.session_name || !cfg?.evolution_url || !cfg?.evolution_api_key) return null;
      return {
        provider: cfg.provider || "evolution",
        evolution_url: cfg.evolution_url,
        evolution_api_key: cfg.evolution_api_key,
        session_name: session.session_name,
        nome: session.session_name,
      };
    };

    // Sessão Evolution explicitamente escolhida no bloco/workflow deve ganhar do vínculo do bot.
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

    // Se o bloco não escolheu sessão, usa a sessão vinculada ao bot em execução.
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
      const { data: evolutionConfig } = await supabase
        .from("whatsapp_config")
        .select("*")
        .eq("estabelecimento_id", conversation.estabelecimento_id)
        .maybeSingle();
      if (evolutionConfig?.evolution_url && evolutionConfig?.evolution_api_key) {
        numero = {
          provider: evolutionConfig.provider || "evolution",
          evolution_url: evolutionConfig.evolution_url,
          evolution_api_key: evolutionConfig.evolution_api_key,
          session_name: evolutionConfig.session_name || "default",
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
      const base = (numero.evolution_url || "").replace(/\/+$/, "");
      const session = numero.session_name || "default";
      const apiKey = numero.evolution_api_key;
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
      provider: numero.provider || null,
      session: numero.session_name || numero.nome || null,
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
type SendOut = { ok: boolean; invalid?: boolean; reason?: string; attempts?: number };

function detectInvalidFromText(bodyTxt: string): { invalid: boolean; reason?: string } {
  const lower = (bodyTxt || "").toLowerCase();
  if (/exists["'\s:]+false/.test(lower)) return { invalid: true, reason: "number_not_on_whatsapp" };
  if (/not.*(exist|registered).*(whatsapp|number)/.test(lower)) return { invalid: true, reason: "number_not_on_whatsapp" };
  if (/invalid.*(number|phone|jid)/.test(lower)) return { invalid: true, reason: "invalid_number" };
  if (/"code"\s*:\s*(131026|131047|131051)/.test(lower)) return { invalid: true, reason: `meta_${lower.match(/(131026|131047|131051)/)?.[1]}` };
  return { invalid: false };
}

function failureReason(bodyTxt: string, status: number): string {
  const lower = (bodyTxt || "").toLowerCase();
  if (lower.includes("connection closed") || lower.includes("session closed") || lower.includes("socket closed")) return "sessao_desconectada";
  if (lower.includes("not connected") || lower.includes("disconnected")) return "sessao_desconectada";
  if (lower.includes("unauthorized") || lower.includes("forbidden")) return "credenciais_invalidas";
  return `http_${status}`;
}

/* ===== Retry policy for transient Evolution/Cloud failures =====
   Retries on: network errors, timeouts (AbortError), and HTTP 408/425/429/500/502/503/504.
   Does NOT retry if provider indicates invalid number.
   3 attempts total, exponential backoff with jitter. */
const TRANSIENT_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 3;
const PER_ATTEMPT_TIMEOUT_MS = 20000;

function isTransientStatus(status: number): boolean {
  return TRANSIENT_STATUSES.has(status);
}

async function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

async function fetchWithRetry(
  label: string,
  url: string,
  init: RequestInit,
): Promise<{ ok: boolean; status: number; bodyTxt: string; attempts: number; networkError?: string }> {
  let lastErr: string | undefined;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), PER_ATTEMPT_TIMEOUT_MS);
    try {
      const res = await fetch(url, { ...init, signal: ctrl.signal });
      clearTimeout(timer);
      const bodyTxt = await res.text().catch(() => "");
      if (res.ok) return { ok: true, status: res.status, bodyTxt, attempts: attempt };

      // Do not retry if the response signals an invalid number — permanent failure.
      const inv = detectInvalidFromText(bodyTxt);
      if (inv.invalid) return { ok: false, status: res.status, bodyTxt, attempts: attempt };

      if (isTransientStatus(res.status) && attempt < MAX_ATTEMPTS) {
        const backoff = 500 * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 300);
        console.warn(`[AGENT][RETRY] ${label} http_${res.status} attempt ${attempt}/${MAX_ATTEMPTS} — retrying in ${backoff}ms`);
        await sleep(backoff);
        continue;
      }
      return { ok: false, status: res.status, bodyTxt, attempts: attempt };
    } catch (e: any) {
      clearTimeout(timer);
      const isAbort = e?.name === "AbortError";
      lastErr = isAbort ? "timeout" : (e?.message || "network_error");
      if (attempt < MAX_ATTEMPTS) {
        const backoff = 500 * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 300);
        console.warn(`[AGENT][RETRY] ${label} ${lastErr} attempt ${attempt}/${MAX_ATTEMPTS} — retrying in ${backoff}ms`);
        await sleep(backoff);
        continue;
      }
      return { ok: false, status: 0, bodyTxt: "", attempts: attempt, networkError: lastErr };
    }
  }
  return { ok: false, status: 0, bodyTxt: "", attempts: MAX_ATTEMPTS, networkError: lastErr };
}


async function sendEvolutionText(toNumberOnly: string, text: string, sessionName: string, base: string, apiKey: string): Promise<SendOut> {
  if (!base || !apiKey) { console.error("[AGENT][EVO] Faltam URL/apikey"); return { ok: false, reason: "config_missing" }; }
  const number = String(toNumberOnly).replace(/\D/g, "");
  const r = await fetchWithRetry("EVO sendText", `${base}/message/sendText/${encodeURIComponent(sessionName)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: apiKey },
    body: JSON.stringify({ number, text }),
  });
  console.log("[AGENT][EVO] sendText:", r.status, (r.bodyTxt || "").slice(0, 200), "attempts:", r.attempts);
  if (r.ok) return { ok: true, attempts: r.attempts };
  const inv = detectInvalidFromText(r.bodyTxt);
  if (inv.invalid) return { ok: false, invalid: true, reason: inv.reason, attempts: r.attempts };
  const reason = r.networkError ? `net_${r.networkError}` : failureReason(r.bodyTxt, r.status);
  return { ok: false, reason: `${reason}${r.attempts > 1 ? `_after_${r.attempts}_tentativas` : ""}`, attempts: r.attempts };
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
  const r = await fetchWithRetry("EVO sendMedia", endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: apiKey },
    body: JSON.stringify(body),
  });
  console.log("[AGENT][EVO] sendMedia:", r.status, (r.bodyTxt || "").slice(0, 200), "attempts:", r.attempts);
  if (r.ok) return { ok: true, attempts: r.attempts };
  const inv = detectInvalidFromText(r.bodyTxt);
  if (inv.invalid) return { ok: false, invalid: true, reason: inv.reason, attempts: r.attempts };
  const reason = r.networkError ? `net_${r.networkError}` : failureReason(r.bodyTxt, r.status);
  return { ok: false, reason: `${reason}${r.attempts > 1 ? `_after_${r.attempts}_tentativas` : ""}`, attempts: r.attempts };
}


/* ===== Cloud API senders ===== */
async function sendCloudText(phoneNumberId: string, accessToken: string, to: string, text: string): Promise<SendOut> {
  if (!phoneNumberId || !accessToken) { console.error("[AGENT][CLOUD] Faltam credenciais"); return { ok: false, reason: "config_missing" }; }
  const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
  const r = await fetchWithRetry("CLOUD sendText", url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body: text } }),
  });
  if (r.ok) return { ok: true, attempts: r.attempts };
  console.error("[AGENT][CLOUD] sendText error:", r.bodyTxt, "attempts:", r.attempts);
  const inv = detectInvalidFromText(r.bodyTxt);
  if (inv.invalid) return { ok: false, invalid: true, reason: inv.reason, attempts: r.attempts };
  const reason = r.networkError ? `net_${r.networkError}` : `http_${r.status}`;
  return { ok: false, reason: `${reason}${r.attempts > 1 ? `_after_${r.attempts}_tentativas` : ""}`, attempts: r.attempts };
}

async function sendCloudMedia(phoneNumberId: string, accessToken: string, to: string, mediaUrl: string, mediaType: string, caption?: string): Promise<SendOut> {
  if (!phoneNumberId || !accessToken) { console.error("[AGENT][CLOUD] Faltam credenciais"); return { ok: false, reason: "config_missing" }; }
  const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
  const typeMap: Record<string, string> = { image: "image", video: "video", audio: "audio", file: "document", document: "document" };
  const t = typeMap[(mediaType || "").toLowerCase()] || "document";
  const body: any = { messaging_product: "whatsapp", to, type: t, [t]: { link: mediaUrl } };
  if (caption && (t === "image" || t === "video" || t === "document")) body[t].caption = caption;
  const r = await fetchWithRetry("CLOUD sendMedia", url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(body),
  });
  if (r.ok) return { ok: true, attempts: r.attempts };
  console.error("[AGENT][CLOUD] sendMedia error:", r.bodyTxt, "attempts:", r.attempts);
  const inv = detectInvalidFromText(r.bodyTxt);
  if (inv.invalid) return { ok: false, invalid: true, reason: inv.reason, attempts: r.attempts };
  const reason = r.networkError ? `net_${r.networkError}` : `http_${r.status}`;
  return { ok: false, reason: `${reason}${r.attempts > 1 ? `_after_${r.attempts}_tentativas` : ""}`, attempts: r.attempts };
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
  const r = await fetchWithRetry("EVO sendContact", `${base}/message/sendContact/${encodeURIComponent(sessionName)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: apiKey },
    body: JSON.stringify(body),
  });
  console.log("[AGENT][EVO] sendContact:", r.status, (r.bodyTxt || "").slice(0, 200), "attempts:", r.attempts);
  if (r.ok) return { ok: true, attempts: r.attempts };
  const inv = detectInvalidFromText(r.bodyTxt);
  if (inv.invalid) return { ok: false, invalid: true, reason: inv.reason, attempts: r.attempts };
  const reason = r.networkError ? `net_${r.networkError}` : failureReason(r.bodyTxt, r.status);
  return { ok: false, reason: `${reason}${r.attempts > 1 ? `_after_${r.attempts}_tentativas` : ""}`, attempts: r.attempts };
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
  const r = await fetchWithRetry("CLOUD sendContact", url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(body),
  });
  if (r.ok) return { ok: true, attempts: r.attempts };
  console.error("[AGENT][CLOUD] sendContact error:", r.bodyTxt, "attempts:", r.attempts);
  const inv = detectInvalidFromText(r.bodyTxt);
  if (inv.invalid) return { ok: false, invalid: true, reason: inv.reason, attempts: r.attempts };
  const reason = r.networkError ? `net_${r.networkError}` : `http_${r.status}`;
  return { ok: false, reason: `${reason}${r.attempts > 1 ? `_after_${r.attempts}_tentativas` : ""}`, attempts: r.attempts };
}

