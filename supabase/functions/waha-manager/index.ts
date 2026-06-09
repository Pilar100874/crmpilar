import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const env = (key: string, fallback = "") => (Deno.env.get(key) || fallback).trim();

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const normalizeBaseUrl = (url: string) => url.replace(/\/+$/, "");

const buildHeaders = (apiKey: string) => ({
  Accept: "application/json",
  "Content-Type": "application/json",
  "x-api-key": apiKey,
});

async function readText(response: Response) {
  return await response.text().catch(() => "");
}

function extractQr(payload: any): string | null {
  if (!payload) return null;
  if (typeof payload === "string" && payload.startsWith("data:image")) return payload;
  if (payload.qr) return String(payload.qr);
  if (payload.qrCode) return String(payload.qrCode);
  if (payload.base64) return `data:image/png;base64,${payload.base64}`;
  if (payload.data) return String(payload.data).startsWith("data:image")
    ? String(payload.data)
    : `data:${payload.mimetype || "image/png"};base64,${payload.data}`;
  return null;
}

function mapStatus(payload: any) {
  const wahaStatus = String(payload?.status || payload?.state || "").toUpperCase();
  const engineState = String(payload?.engine?.state || "").toUpperCase();
  const meId = payload?.me?.id || payload?.me?.user || payload?.me?.number;

  if (wahaStatus === "FAILED") return { status: "FAILED", phoneNumber: null };
  if (wahaStatus === "WORKING" || wahaStatus === "AUTHENTICATED" || engineState === "CONNECTED" || meId) {
    return { status: "WORKING", phoneNumber: meId ? String(meId).split("@")[0].replace(/\D/g, "") : null };
  }
  if (wahaStatus === "SCAN_QR_CODE" || wahaStatus === "STARTING") return { status: "SCAN_QR_CODE", phoneNumber: null };
  return { status: "STOPPED", phoneNumber: null };
}

async function wahaFetch(url: string, init: RequestInit, terminal401 = true) {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(12000) });
  const text = await readText(response);
  if (response.status === 401 && terminal401) {
    throw new Error("WAHA recusou a Chave de API. Use o valor WAHA_API_KEY do servidor, não a senha do dashboard.");
  }
  return { response, text };
}

async function getSessionStatus(base: string, headers: Record<string, string>, sessionName: string) {
  const urls = [
    `${base}/api/sessions/${encodeURIComponent(sessionName)}`,
    `${base}/api/sessions/${encodeURIComponent(sessionName)}/status`,
    `${base}/api/${encodeURIComponent(sessionName)}`,
    `${base}/api/${encodeURIComponent(sessionName)}/status`,
  ];

  for (const url of urls) {
    const { response, text } = await wahaFetch(url, { method: "GET", headers });
    if (!response.ok) continue;
    const payload = text ? JSON.parse(text) : {};
    return { payload, ...mapStatus(payload) };
  }

  return { payload: null, status: "STOPPED", phoneNumber: null };
}

async function syncWebhook(base: string, headers: Record<string, string>, sessionName: string, webhookUrl: string) {
  const body = JSON.stringify({
    name: sessionName,
    config: { webhooks: [{ url: webhookUrl, events: ["message", "message.any"] }] },
  });
  const attempts = [
    { url: `${base}/api/sessions/${encodeURIComponent(sessionName)}`, method: "PUT" },
    { url: `${base}/api/sessions/${encodeURIComponent(sessionName)}`, method: "POST" },
  ];
  for (const attempt of attempts) {
    const { response } = await wahaFetch(attempt.url, { method: attempt.method, headers, body }, false);
    if (response.ok || [200, 201, 202, 204, 409].includes(response.status)) return;
  }
}

async function getQRCode(base: string, headers: Record<string, string>, sessionName: string) {
  for (let attempt = 1; attempt <= 20; attempt++) {
    const urls = [
      { method: "GET", url: `${base}/api/${encodeURIComponent(sessionName)}/auth/qr` },
      { method: "GET", url: `${base}/api/sessions/${encodeURIComponent(sessionName)}/auth/qr` },
      { method: "POST", url: `${base}/api/${encodeURIComponent(sessionName)}/auth/qr`, body: "{}" },
      { method: "POST", url: `${base}/api/sessions/${encodeURIComponent(sessionName)}/auth/qr`, body: "{}" },
    ];
    for (const current of urls) {
      const { response, text } = await wahaFetch(current.url, {
        method: current.method,
        headers,
        ...(current.body ? { body: current.body } : {}),
      });
      if (!response.ok) continue;
      const qr = extractQr(text ? JSON.parse(text) : null);
      if (qr) return qr;
    }
    await new Promise((resolve) => setTimeout(resolve, Math.min(2500, attempt * 500)));
  }
  throw new Error("QR code não disponível no WAHA. Tente iniciar a sessão novamente.");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action, estabelecimentoId, sessionId, sessionName, webhookUrl } = body || {};

    if (!action || !estabelecimentoId || !sessionName) {
      return jsonResponse({ error: "Ação, estabelecimento e sessão são obrigatórios." }, 400);
    }

    const supabase = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
    const { data: config, error: configError } = await supabase
      .from("whatsapp_config")
      .select("waha_url, waha_api_key, webhook_url")
      .eq("estabelecimento_id", estabelecimentoId)
      .maybeSingle();

    if (configError) return jsonResponse({ error: configError.message }, 500);

    const base = normalizeBaseUrl(config?.waha_url || env("WAHA_URL"));
    const apiKey = env("WAHA_API_KEY") || String(config?.waha_api_key || "").trim();
    const resolvedWebhookUrl = String(webhookUrl || config?.webhook_url || `${env("SUPABASE_URL")}/functions/v1/whatsapp-webhook`).trim();

    if (!base || !apiKey) {
      return jsonResponse({ error: "URL ou Chave de API do WAHA não configurada." }, 400);
    }

    const headers = buildHeaders(apiKey);

    if (action === "status") {
      const statusResult = await getSessionStatus(base, headers, sessionName);
      if (statusResult.status === "WORKING") await syncWebhook(base, headers, sessionName, resolvedWebhookUrl);
      if (sessionId) {
        const updatePayload: Record<string, unknown> = {
          status: statusResult.status,
          qr_code: statusResult.status === "WORKING" ? null : undefined,
        };
        if (statusResult.phoneNumber) updatePayload.phone_number = statusResult.phoneNumber;
        await supabase.from("whatsapp_sessions").update(updatePayload).eq("id", sessionId);
      }
      return jsonResponse({ success: true, ...statusResult });
    }

    if (action === "start") {
      const createBody = JSON.stringify({
        name: sessionName,
        config: { webhooks: [{ url: resolvedWebhookUrl, events: ["message", "message.any"] }] },
      });
      const createAttempts = [
        { url: `${base}/api/sessions`, method: "POST", body: createBody },
        { url: `${base}/api/sessions/${encodeURIComponent(sessionName)}`, method: "POST", body: createBody },
        { url: `${base}/api/${encodeURIComponent(sessionName)}`, method: "POST", body: createBody },
      ];
      for (const attempt of createAttempts) {
        const { response } = await wahaFetch(attempt.url, { method: attempt.method, headers, body: attempt.body });
        if (response.ok || [200, 201, 202, 204, 409].includes(response.status)) break;
      }

      const startAttempts = [
        { url: `${base}/api/sessions/${encodeURIComponent(sessionName)}/start`, method: "POST" },
        { url: `${base}/api/${encodeURIComponent(sessionName)}/start`, method: "POST" },
      ];
      let started = false;
      for (const attempt of startAttempts) {
        const { response } = await wahaFetch(attempt.url, { method: attempt.method, headers });
        if (response.ok || response.status === 201) {
          started = true;
          break;
        }
      }
      if (!started) throw new Error("Não foi possível iniciar a sessão no WAHA.");

      const qrCode = await getQRCode(base, headers, sessionName);
      if (sessionId) {
        await supabase.from("whatsapp_sessions").update({ qr_code: qrCode, status: "SCAN_QR_CODE" }).eq("id", sessionId);
      }
      return jsonResponse({ success: true, qrCode });
    }

    if (action === "qr") {
      const qrCode = await getQRCode(base, headers, sessionName);
      if (sessionId) await supabase.from("whatsapp_sessions").update({ qr_code: qrCode, status: "SCAN_QR_CODE" }).eq("id", sessionId);
      return jsonResponse({ success: true, qrCode });
    }

    return jsonResponse({ error: "Ação WAHA inválida." }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno ao gerenciar WAHA.";
    console.error("[WAHA Manager]", message);
    return jsonResponse({ error: message }, 500);
  }
});