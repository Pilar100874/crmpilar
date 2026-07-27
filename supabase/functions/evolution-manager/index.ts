// Evolution API manager — gerencia instâncias, status e QR code do WhatsApp via Evolution API.

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
        "MESSAGES_UPDATE",
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
      events: ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "CONNECTION_UPDATE", "QRCODE_UPDATED"],
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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function extractMessages(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.messages?.records)) return data.messages.records;
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(data?.messages)) return data.messages;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function parseEvolutionAck(payload: any): { messageId?: string; status?: string; raw?: any } {
  const messageId = payload?.key?.id || payload?.id || payload?.messageId || payload?.message?.key?.id || payload?.data?.key?.id;
  const status = payload?.status || payload?.message?.status || payload?.data?.status;
  return {
    messageId: messageId ? String(messageId) : undefined,
    status: status ? String(status).toUpperCase() : undefined,
    raw: payload,
  };
}

// Baileys ack: 0=erro, 1=pendente no servidor, 2=entregue ao dispositivo, 3=lido, 4=reproduzido
function mapAckNumberToStatus(ack: any): string | null {
  const n = typeof ack === "number" ? ack : Number(ack);
  if (!Number.isFinite(n)) return null;
  if (n <= 0) return "ERROR";
  if (n === 1) return "SERVER_ACK";
  if (n === 2) return "DELIVERY_ACK";
  if (n === 3) return "READ";
  if (n >= 4) return "PLAYED";
  return null;
}

function extractRecordStatus(record: any, fallback?: string): string {
  if (!record) return String(fallback || "PENDING").toUpperCase();
  const ackStatus =
    mapAckNumberToStatus(record?.ack) ??
    mapAckNumberToStatus(record?.message?.ack) ??
    mapAckNumberToStatus(record?.messageStatus);
  if (ackStatus) return ackStatus;
  const raw = record?.status || record?.message?.status || record?.messageStatus;
  if (raw) {
    const upper = String(raw).toUpperCase();
    // status textuais que o Evolution v2 pode retornar
    if (upper === "DELIVERY_ACK" || upper === "READ" || upper === "PLAYED" || upper === "SERVER_ACK" || upper === "DELIVERED") return upper;
    if (upper === "ERROR" || upper === "FAILED" || upper === "FAILURE") return upper;
    return upper;
  }
  return String(fallback || "PENDING").toUpperCase();
}

function isPendingStatus(status?: string) {
  const value = String(status || "").toUpperCase();
  return !value || value === "PENDING" || value === "SERVER_ACK_PENDING";
}

function isDeliveredStatus(status?: string) {
  const value = String(status || "").toUpperCase();
  return value === "SERVER_ACK" || value === "DELIVERY_ACK" || value === "READ" || value === "PLAYED" || value === "DELIVERED";
}

function isFinalErrorStatus(status?: string) {
  const value = String(status || "").toUpperCase();
  return value === "ERROR" || value === "FAILED" || value === "FAILURE";
}

function buildNumberVariants(phone: string): string[] {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return [];
  return Array.from(new Set([digits, `${digits}@s.whatsapp.net`]));
}

type DiagnosticStep = {
  id: string;
  title: string;
  status: "ok" | "warning" | "error" | "info";
  message: string;
  latency?: number;
  details?: unknown;
};

async function pollMessageStatus(base: string, headers: Record<string, string>, instance: string, ack: { messageId?: string; status?: string }) {
  let lastStatus = String(ack.status || "PENDING").toUpperCase();
  let found = false;
  let lastRecord: any = null;

  for (const wait of [2_000, 3_000, 4_000, 5_000, 6_000]) {
    await sleep(wait);
    const { resp, data } = await evoFetch(`${base}/chat/findMessages/${encodeURIComponent(instance)}`, {
      method: "POST",
      headers,
      body: JSON.stringify(ack.messageId ? { where: { key: { id: ack.messageId } } } : { where: { key: { fromMe: true } } }),
    });

    if (!resp.ok) {
      lastStatus = `HTTP_${resp.status}`;
      continue;
    }

    const records = extractMessages(data);
    const match = ack.messageId
      ? records.find((m) => String(m?.key?.id || m?.id || m?.messageId || "") === ack.messageId)
      : records[0];
    if (match) {
      found = true;
      lastRecord = match;
      lastStatus = extractRecordStatus(match, ack.status);
      if (isDeliveredStatus(lastStatus) || isFinalErrorStatus(lastStatus)) break;
    }
  }

  return { found, status: lastStatus, record: lastRecord };
}

async function runDiagnostic(params: {
  base: string;
  headers: Record<string, string>;
  instance: string;
  phone: string;
  message: string;
  webhookUrl: string;
}) {
  const steps: DiagnosticStep[] = [];
  const startedAt = new Date().toISOString();

  const addStep = (step: DiagnosticStep) => steps.push(step);

  try {
    const started = Date.now();
    const { resp, data } = await evoFetch(`${params.base}/instance/fetchInstances`, {
      method: "GET",
      headers: params.headers,
    });
    addStep({
      id: "server",
      title: "Servidor Evolution",
      status: resp.ok ? "ok" : "error",
      message: resp.ok
        ? `Servidor acessível em ${Date.now() - started}ms.`
        : `Servidor respondeu HTTP ${resp.status}.`,
      latency: Date.now() - started,
      details: resp.ok ? undefined : data,
    });
    if (!resp.ok) {
      return { ok: false, conclusion: "Falha antes do envio: URL, apikey, firewall ou servidor Evolution.", startedAt, finishedAt: new Date().toISOString(), steps };
    }
  } catch (e: any) {
    addStep({ id: "server", title: "Servidor Evolution", status: "error", message: e?.message || "Falha de conexão." });
    return { ok: false, conclusion: "O backend não conseguiu alcançar o servidor Evolution.", startedAt, finishedAt: new Date().toISOString(), steps };
  }

  const stateStarted = Date.now();
  const state = await getInstanceState(params.base, params.headers, params.instance);
  addStep({
    id: "instance",
    title: "Instância WhatsApp",
    status: state.exists && state.status === "WORKING" ? "ok" : "error",
    message: state.exists
      ? `Status atual: ${state.status}${state.phoneNumber ? ` • número ${state.phoneNumber}` : ""}.`
      : "Instância não encontrada no Evolution.",
    latency: Date.now() - stateStarted,
    details: state,
  });
  if (!state.exists || state.status !== "WORKING") {
    return { ok: false, conclusion: "A instância não está conectada. O problema está antes do disparo da mensagem.", startedAt, finishedAt: new Date().toISOString(), steps };
  }

  const webhookStarted = Date.now();
  const webhookOk = await setWebhook(params.base, params.headers, params.instance, params.webhookUrl);
  addStep({
    id: "webhook",
    title: "Webhook de entrada",
    status: webhookOk ? "ok" : "warning",
    message: webhookOk
      ? "Webhook configurado/confirmado na instância. Mensagens recebidas devem chegar ao sistema."
      : "Não foi possível confirmar o webhook. O envio pode funcionar, mas respostas do cliente podem não chegar.",
    latency: Date.now() - webhookStarted,
    details: { webhookUrl: params.webhookUrl },
  });

  const variants = buildNumberVariants(params.phone);
  if (!variants.length) {
    addStep({ id: "phone", title: "Número de teste", status: "error", message: "Número inválido para teste." });
    return { ok: false, conclusion: "Informe um WhatsApp válido com DDD e país.", startedAt, finishedAt: new Date().toISOString(), steps };
  }

  let delivered = false;
  let pending = false;
  let usedNumber: string | null = null;
  let messageId: string | null = null;
  let providerStatus: string | null = null;

  for (const number of variants) {
    const sendStarted = Date.now();
    try {
      const { resp, data } = await evoFetch(`${params.base}/message/sendText/${encodeURIComponent(params.instance)}`, {
        method: "POST",
        headers: params.headers,
        body: JSON.stringify({ number, text: params.message, delay: 1200, linkPreview: false }),
      });
      const ack = parseEvolutionAck(data);
      const sendStepId = `send-${number.includes("@") ? "jid" : "digits"}`;
      if (!resp.ok && resp.status !== 201) {
        addStep({
          id: sendStepId,
          title: number.includes("@") ? "Envio com JID" : "Envio com número",
          status: "error",
          message: `Evolution recusou o envio com HTTP ${resp.status}.`,
          latency: Date.now() - sendStarted,
          details: data,
        });
        continue;
      }

      usedNumber = number;
      messageId = ack.messageId || null;
      providerStatus = ack.status || "PENDING";
      addStep({
        id: sendStepId,
        title: number.includes("@") ? "Envio com JID" : "Envio com número",
        status: "ok",
        message: `Evolution aceitou o envio${ack.messageId ? ` • ID ${ack.messageId}` : ""}${ack.status ? ` • ${ack.status}` : ""}.`,
        latency: Date.now() - sendStarted,
        details: { status: ack.status, messageId: ack.messageId },
      });

      const pollStarted = Date.now();
      const delivery = await pollMessageStatus(params.base, params.headers, params.instance, ack);
      providerStatus = delivery.status;
      addStep({
        id: `delivery-${number.includes("@") ? "jid" : "digits"}`,
        title: "Confirmação no Evolution",
        status: isFinalErrorStatus(delivery.status) ? "error" : isPendingStatus(delivery.status) ? "warning" : "ok",
        message: delivery.found
          ? `Registro encontrado com status ${delivery.status}.`
          : `Mensagem aceita, mas não apareceu no histórico consultável. Último status: ${delivery.status}.`,
        latency: Date.now() - pollStarted,
        details: { status: delivery.status, found: delivery.found, messageId: ack.messageId },
      });

      if (!isPendingStatus(delivery.status)) {
        delivered = true;
        break;
      }
      if (!isFinalErrorStatus(delivery.status)) {
        pending = true;
        break;
      }
    } catch (e: any) {
      addStep({
        id: `send-${number.includes("@") ? "jid" : "digits"}`,
        title: number.includes("@") ? "Envio com JID" : "Envio com número",
        status: "error",
        message: e?.message || "Erro ao chamar endpoint de envio.",
        latency: Date.now() - sendStarted,
      });
    }
  }

  const conclusion = delivered
    ? "Envio confirmado. Se não chegou no aparelho, verifique o WhatsApp do destinatário, bloqueios do contato ou atraso de rede."
    : pending
    ? "Lovable chegou ao Evolution e o Evolution aceitou a mensagem, mas ela ficou sem confirmação. O bloqueio está no Evolution/WhatsApp/Baileys/sessão vinculada."
    : "Lovable chegou ao Evolution, mas o Evolution finalizou o envio com erro. Verifique sessão, bloqueio do WhatsApp, LID/JID e logs do Evolution.";

  return {
    ok: delivered,
    conclusion,
    providerStatus,
    messageId,
    usedNumber,
    startedAt,
    finishedAt: new Date().toISOString(),
    steps,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action, estabelecimentoId, sessionId, sessionName, webhookUrl } = body || {};

    if (action === "test") {
      const testUrl = normalizeBaseUrl(String(body?.url || "").trim());
      const testKey = String(body?.apiKey || "").trim();
      const managerUrl = String(body?.managerUrl || "").trim();
      if (!testUrl || !testKey) {
        return json({ ok: false, error: "Informe URL e apikey para testar." }, 400);
      }

      // 1) Servidor Evolution (fetchInstances)
      let serverResult: any = { ok: false };
      try {
        const started = Date.now();
        const resp = await fetch(`${testUrl}/instance/fetchInstances`, {
          method: "GET",
          headers: buildHeaders(testKey),
          signal: AbortSignal.timeout(10000),
        });
        const latency = Date.now() - started;
        const data = await safeJson(resp);
        if (resp.status === 401 || resp.status === 403) {
          serverResult = { ok: false, status: resp.status, latency, error: "apikey rejeitada pelo servidor Evolution (401/403). Confira o valor de AUTHENTICATION_API_KEY no .env do servidor." };
        } else if (!resp.ok) {
          serverResult = { ok: false, status: resp.status, latency, error: `Servidor respondeu ${resp.status}. Verifique se a URL aponta para uma instalação Evolution v2 acessível.`, details: data };
        } else {
          const rawList = Array.isArray(data) ? data : (Array.isArray(data?.instances) ? data.instances : []);
          const list = rawList.map((it: any) => {
            const inst = it?.instance || it;
            return {
              name: inst?.instanceName || inst?.name || inst?.id || "—",
              status: inst?.connectionStatus || inst?.status || inst?.state || "unknown",
              number: inst?.owner || inst?.number || inst?.profileName || null,
              profileName: inst?.profileName || null,
            };
          });
          serverResult = { ok: true, status: resp.status, latency, instances: list.length, list };
        }
      } catch (e: any) {
        const msg = e?.message || String(e);
        const hint = /timeout|abort/i.test(msg)
          ? "Tempo esgotado (>10s). O servidor pode estar offline ou bloqueando requisições externas."
          : /fetch|network|dns|resolve/i.test(msg)
          ? "Não foi possível resolver o endereço. Verifique o domínio, HTTPS e liberação de firewall."
          : msg;
        serverResult = { ok: false, error: `Falha ao conectar no servidor: ${hint}` };
      }

      // 2) Manager (opcional, se informado)
      let managerResult: any = null;
      if (managerUrl) {
        const mUrl = normalizeBaseUrl(managerUrl);
        try {
          const started = Date.now();
          // O Manager valida a apikey pelo mesmo endpoint /instance/fetchInstances.
          const resp = await fetch(`${mUrl}/instance/fetchInstances`, {
            method: "GET",
            headers: buildHeaders(testKey),
            signal: AbortSignal.timeout(10000),
          });
          const latency = Date.now() - started;
          if (resp.status === 401 || resp.status === 403) {
            managerResult = { ok: false, status: resp.status, latency, error: "Manager acessível, mas a apikey foi rejeitada. Use a mesma AUTHENTICATION_API_KEY do servidor." };
          } else if (resp.status === 404) {
            managerResult = { ok: false, status: resp.status, latency, error: "URL do Manager não expõe a API (404). Normalmente o Manager e o servidor compartilham o mesmo domínio — confira se não digitou o caminho /manager por engano." };
          } else if (!resp.ok) {
            managerResult = { ok: false, status: resp.status, latency, error: `Manager respondeu ${resp.status}. Verifique se a URL está correta e acessível publicamente.` };
          } else {
            managerResult = { ok: true, status: resp.status, latency };
          }
        } catch (e: any) {
          const msg = e?.message || String(e);
          const hint = /timeout|abort/i.test(msg)
            ? "Tempo esgotado (>10s) ao acessar o Manager."
            : /fetch|network|dns|resolve/i.test(msg)
            ? "Não foi possível resolver o endereço do Manager. Confira domínio/HTTPS."
            : msg;
          managerResult = { ok: false, error: `Falha ao acessar o Manager: ${hint}` };
        }
      }

      return json({
        ok: serverResult.ok && (managerResult ? managerResult.ok : true),
        server: serverResult,
        manager: managerResult,
        // Campos legados para compatibilidade com UI antiga
        latency: serverResult.latency,
        instances: serverResult.instances ?? null,
        list: serverResult.list ?? [],
        error: !serverResult.ok
          ? serverResult.error
          : (managerResult && !managerResult.ok ? managerResult.error : undefined),
      });
    }


    if (!action || !estabelecimentoId || !sessionName) {
      return json({ error: "Ação, estabelecimento e instância são obrigatórios." }, 400);
    }

    const supabase = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
    const { data: config, error: cfgErr } = await supabase
      .from("whatsapp_config")
      .select("evolution_url, evolution_api_key, webhook_url")
      .eq("estabelecimento_id", estabelecimentoId)
      .maybeSingle();

    if (cfgErr) return json({ error: cfgErr.message }, 500);

    // Colunas evolution_url / evolution_api_key da tabela whatsapp_config.
    const base = normalizeBaseUrl(config?.evolution_url || env("EVOLUTION_URL"));
    const apiKey = String(config?.evolution_api_key || env("EVOLUTION_API_KEY") || "").trim();
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

    if (action === "pending_count") {
      // Conta mensagens fromMe com status PENDING nos últimos N minutos.
      // Detecta sessão "zumbi": Evolution diz WORKING mas mensagens não entregam
      // (celular pareado offline / instância travada).
      const minutes = Math.max(1, Math.min(120, Number(body?.minutes ?? 15)));
      const sinceMs = Date.now() - minutes * 60_000;
      try {
        const { resp, data } = await evoFetch(
          `${base}/chat/findMessages/${encodeURIComponent(instance)}`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({ where: { key: { fromMe: true } } }),
          },
        );
        if (!resp.ok) return json({ success: true, pending: 0, total: 0, supported: false });
        const raw: any[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.messages?.records) ? data.messages.records
          : Array.isArray(data?.records) ? data.records
          : Array.isArray(data?.messages) ? data.messages
          : [];
        let pending = 0, total = 0, newest = 0;
        for (const m of raw) {
          const tsRaw = m?.messageTimestamp ?? m?.timestamp ?? m?.messageTimestampMs ?? 0;
          const ts = Number(tsRaw) > 1e12 ? Number(tsRaw) : Number(tsRaw) * 1000;
          if (!ts || ts < sinceMs) continue;
          total++;
          if (ts > newest) newest = ts;
          const st = String(m?.status || "").toUpperCase();
          if (st === "PENDING" || st === "ERROR" || st === "SERVER_ACK_PENDING") pending++;
        }
        return json({ success: true, pending, total, minutes, newest, supported: true });
      } catch (e: any) {
        return json({ success: true, pending: 0, total: 0, supported: false, error: e?.message });
      }
    }

    if (action === "diagnose") {
      const phone = String(body?.testPhone || body?.phone || "").replace(/\D/g, "");
      if (!phone || phone.length < 10) {
        return json({ ok: false, error: "Informe um WhatsApp de teste válido com DDD." }, 400);
      }
      const message = String(body?.testMessage || "").trim() || `Teste diagnóstico Pilar CRM ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`;
      const report = await runDiagnostic({
        base,
        headers,
        instance,
        phone,
        message,
        webhookUrl: resolvedWebhookUrl,
      });
      return json({ success: true, ...report });
    }

    return json({ error: "Ação inválida." }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno no manager Evolution.";
    console.error("[Evolution Manager]", message);
    return json({ error: message }, 500);
  }
});
