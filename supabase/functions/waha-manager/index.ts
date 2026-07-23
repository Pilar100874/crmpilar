// Evolution API manager — substitui o antigo WAHA manager.
// Mantemos o nome da função (waha-manager) para preservar todas as chamadas existentes do frontend,
// mas internamente todas as requisições vão para a Evolution API.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const env = (key: string, fallback = "") => (Deno.env.get(key) || fallback).trim();
const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const normalizeBaseUrl = (url: string) => url.replace(/\/+$/, "");

const buildHeaders = (apiKey: string) => ({
  Accept: "application/json",
  "Content-Type": "application/json",
  apikey: apiKey,
});

async function safeJson(resp: Response): Promise<any> {
  const txt = await resp.text().catch(() => "");
  if (!txt) return null;
  try { return JSON.parse(txt); } catch { return txt; }
}

// Evolution v2 state -> nosso status interno (mantém compatibilidade com o front)
function mapState(payload: any): { status: string; phoneNumber: string | null } {
  const state = String(
    payload?.instance?.state ||
    payload?.state ||
    payload?.status ||
    "",
  ).toLowerCase();

  const ownerJid =
    payload?.instance?.owner ||
    payload?.instance?.ownerJid ||
    payload?.owner ||
    payload?.wuid ||
    null;

  const phone = ownerJid
    ? String(ownerJid).split("@")[0].split(":")[0].replace(/\D/g, "")
    : null;

  if (state === "open" || state === "connected") {
    return { status: "WORKING", phoneNumber: phone };
  }
  if (state === "connecting" || state === "qrcode" || state === "qr") {
    return { status: "SCAN_QR_CODE", phoneNumber: null };
  }
  if (state === "close" || state === "closed" || state === "disconnected") {
    return { status: "STOPPED", phoneNumber: null };
  }
  if (state === "failed" || state === "error") {
    return { status: "FAILED", phoneNumber: null };
  }
  return { status: "STOPPED", phoneNumber: null };
}

function extractQr(payload: any): string | null {
  if (!payload) return null;
  // Evolution v2: { qrcode: { base64: "data:image/png;base64,..." , code: "..." } }
  const qrObj = payload.qrcode || payload.qrCode || payload.qr || payload;
  if (typeof qrObj === "string") {
    if (qrObj.startsWith("data:image")) return qrObj;
    return null;
  }
  const b64 =
    qrObj?.base64 ||
    qrObj?.qrcode?.base64 ||
    qrObj?.image ||
    null;
  if (b64) {
    return String(b64).startsWith("data:image") ? String(b64) : `data:image/png;base64,${b64}`;
  }
  return null;
}

async function evoFetch(url: string, init: RequestInit) {
  const resp = await fetch(url, { ...init, signal: AbortSignal.timeout(15000) });
  return { resp, data: await safeJson(resp.clone()) };
}

async function getInstanceState(base: string, headers: Record<string, string>, instance: string) {
  const { resp, data } = await evoFetch(`${base}/instance/connectionState/${encodeURIComponent(instance)}`, {
    method: "GET",
    headers,
  });
  if (!resp.ok) return { exists: false, status: "STOPPED", phoneNumber: null };
  return { exists: true, ...mapState(data) };
}

async function fetchInstanceInfo(base: string, headers: Record<string, string>, instance: string) {
  // GET /instance/fetchInstances?instanceName=xxx — pode retornar owner/phone
  const url = `${base}/instance/fetchInstances?instanceName=${encodeURIComponent(instance)}`;
  const { resp, data } = await evoFetch(url, { method: "GET", headers });
  if (!resp.ok) return null;
  if (Array.isArray(data)) return data[0] || null;
  return data;
}

async function setWebhook(base: string, headers: Record<string, string>, instance: string, webhookUrl: string) {
  const body = JSON.stringify({
    webhook: {
      enabled: true,
      url: webhookUrl,
      byEvents: false,
      base64: false,
      events: [
        "MESSAGES_UPSERT",
        "CONNECTION_UPDATE",
        "QRCODE_UPDATED",
      ],
    },
  });
  // v2: POST /webhook/set/{instance}
  const attempts = [
    `${base}/webhook/set/${encodeURIComponent(instance)}`,
  ];
  for (const url of attempts) {
    try {
      const { resp } = await evoFetch(url, { method: "POST", headers, body });
      if (resp.ok || resp.status === 201) return true;
    } catch (_) { /* ignore */ }
  }
  return false;
}

async function createInstance(base: string, headers: Record<string, string>, instance: string, webhookUrl: string) {
  const body = JSON.stringify({
    instanceName: instance,
    qrcode: true,
    integration: "WHATSAPP-BAILEYS",
    webhook: {
      url: webhookUrl,
      byEvents: false,
      base64: false,
      events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "QRCODE_UPDATED"],
    },
  });
  const { resp, data } = await evoFetch(`${base}/instance/create`, {
    method: "POST",
    headers,
    body,
  });
  // 201 created, 409 already exists, 200 OK
  if (resp.ok || resp.status === 201 || resp.status === 409) return { ok: true, data };
  return { ok: false, data, status: resp.status };
}

async function connectInstance(base: string, headers: Record<string, string>, instance: string): Promise<string | null> {
  // GET /instance/connect/{instance} -> retorna QR code base64
  for (let attempt = 1; attempt <= 15; attempt++) {
    const { resp, data } = await evoFetch(`${base}/instance/connect/${encodeURIComponent(instance)}`, {
      method: "GET",
      headers,
    });
    if (resp.ok) {
      const qr = extractQr(data);
      if (qr) return qr;
    }
    await new Promise((r) => setTimeout(r, Math.min(2000, attempt * 400)));
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action, estabelecimentoId, sessionId, sessionName, webhookUrl } = body || {};

    if (!action || !estabelecimentoId || !sessionName) {
      return json({ error: "Ação, estabelecimento e instância são obrigatórios." }, 400);
    }

    const supabase = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
    const { data: config, error: cfgErr } = await supabase
      .from("whatsapp_config")
      .select("waha_url, waha_api_key, webhook_url")
      .eq("estabelecimento_id", estabelecimentoId)
      .maybeSingle();

    if (cfgErr) return json({ error: cfgErr.message }, 500);

    // Reaproveitamos as colunas existentes: waha_url -> Evolution URL, waha_api_key -> Evolution apikey.
    const base = normalizeBaseUrl(config?.waha_url || env("EVOLUTION_URL") || env("WAHA_URL"));
    const apiKey = String(config?.waha_api_key || env("EVOLUTION_API_KEY") || env("WAHA_API_KEY") || "").trim();
    const resolvedWebhookUrl = String(
      webhookUrl ||
      config?.webhook_url ||
      `${env("SUPABASE_URL")}/functions/v1/whatsapp-webhook`,
    ).trim();

    if (!base || !apiKey) {
      return json({ error: "URL ou Chave de API da Evolution não configurada." }, 400);
    }

    const headers = buildHeaders(apiKey);
    const instance = String(sessionName).trim();

    if (action === "status") {
      const state = await getInstanceState(base, headers, instance);
      // Tenta enriquecer com número
      let phone = state.phoneNumber;
      if (state.status === "WORKING" && !phone) {
        const info = await fetchInstanceInfo(base, headers, instance);
        const ownerJid = info?.instance?.owner || info?.owner || info?.ownerJid;
        if (ownerJid) phone = String(ownerJid).split("@")[0].split(":")[0].replace(/\D/g, "");
      }
      if (state.status === "WORKING") {
        await setWebhook(base, headers, instance, resolvedWebhookUrl);
      }
      if (sessionId) {
        const update: Record<string, unknown> = {
          status: state.status,
          qr_code: state.status === "WORKING" ? null : undefined,
        };
        if (phone) update.phone_number = phone;
        await supabase.from("whatsapp_sessions").update(update).eq("id", sessionId);
      }
      return json({ success: true, status: state.status, phoneNumber: phone });
    }

    if (action === "start") {
      const created = await createInstance(base, headers, instance, resolvedWebhookUrl);
      // 409 = already exists; 403 "already in use" também significa que a instância já existe — seguimos para connect/QR
      const alreadyExistsMsg = JSON.stringify(created.data || "").toLowerCase().includes("already in use");
      if (!created.ok && created.status !== 409 && !alreadyExistsMsg) {
        return json({ error: `Falha ao criar instância Evolution (${created.status}).`, details: created.data }, 500);
      }
      await setWebhook(base, headers, instance, resolvedWebhookUrl);

      // Se a instância já foi criada, o connect retorna o QR
      const qr = await connectInstance(base, headers, instance);
      if (!qr) {
        // Talvez já esteja conectada
        const state = await getInstanceState(base, headers, instance);
        if (state.status === "WORKING") {
          if (sessionId) {
            await supabase.from("whatsapp_sessions").update({ status: "WORKING", qr_code: null }).eq("id", sessionId);
          }
          return json({ success: true, status: "WORKING" });
        }
        return json({ error: "Não foi possível obter o QR Code da Evolution." }, 500);
      }
      if (sessionId) {
        await supabase.from("whatsapp_sessions").update({ qr_code: qr, status: "SCAN_QR_CODE" }).eq("id", sessionId);
      }
      return json({ success: true, qrCode: qr });
    }

    if (action === "qr") {
      const qr = await connectInstance(base, headers, instance);
      if (!qr) return json({ error: "QR Code indisponível." }, 500);
      if (sessionId) {
        await supabase.from("whatsapp_sessions").update({ qr_code: qr, status: "SCAN_QR_CODE" }).eq("id", sessionId);
      }
      return json({ success: true, qrCode: qr });
    }

    return json({ error: "Ação inválida." }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno no manager Evolution.";
    console.error("[Evolution Manager]", message);
    return json({ error: message }, 500);
  }
});
