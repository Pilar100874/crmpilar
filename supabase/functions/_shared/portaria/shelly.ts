// Adaptador Shelly (contato seco) — usado apenas no backend.
// Os endpoints são configuráveis por dispositivo (device.config) para permitir
// trocar de fabricante sem reescrever o restante do sistema.

export interface ShellyDevice {
  ip?: string | null;
  porta?: number | null;
  endpoint?: string | null;
  canal_rele?: number | null;
  pulso_ms?: number | null;
  config?: Record<string, unknown> | null;
}

export interface ShellyCredentials {
  usuario?: string | null;
  senha?: string | null;
  token?: string | null;
}

export interface ComandoResultado {
  ok: boolean;
  status?: number;
  mensagem?: string;
  detalhes?: unknown;
}

function baseUrl(device: ShellyDevice): string | null {
  if (device.endpoint) return device.endpoint.replace(/\/+$/, "");
  if (!device.ip) return null;
  const porta = device.porta ? `:${device.porta}` : "";
  const proto = (device.config?.protocolo as string) || "http";
  return `${proto}://${device.ip}${porta}`;
}

function authHeaders(cred: ShellyCredentials): Record<string, string> {
  const headers: Record<string, string> = {};
  if (cred.usuario && cred.senha) {
    headers["Authorization"] = "Basic " + btoa(`${cred.usuario}:${cred.senha}`);
  }
  return headers;
}

async function fetchComTimeout(url: string, init: RequestInit, ms = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

/**
 * Aciona o relé em modo PULSO (nunca liga permanentemente).
 * Suporta Shelly Gen1 (/relay), Gen2+ (RPC) e Shelly Cloud.
 */
export async function shellyPulso(
  device: ShellyDevice,
  cred: ShellyCredentials,
): Promise<ComandoResultado> {
  const canal = device.canal_rele ?? 0;
  const pulsoMs = Math.min(Math.max(device.pulso_ms ?? 1000, 200), 10000);
  const segundos = Math.max(1, Math.round(pulsoMs / 1000));
  const geracao = ((device.config?.geracao as string) || "gen2").toLowerCase();

  try {
    if (geracao === "cloud") {
      const server = (device.config?.cloud_server as string) || "";
      const deviceId = (device.config?.cloud_device_id as string) || "";
      if (!server || !deviceId || !cred.token) {
        return { ok: false, mensagem: "Configuração do Shelly Cloud incompleta." };
      }
      const body = new URLSearchParams({
        id: deviceId,
        channel: String(canal),
        turn: "on",
        timer: String(segundos),
        auth_key: cred.token,
      });
      const resp = await fetchComTimeout(
        `https://${server.replace(/^https?:\/\//, "").replace(/\/+$/, "")}/device/relay/control`,
        { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body },
      );
      const texto = await resp.text();
      return { ok: resp.ok, status: resp.status, detalhes: texto.slice(0, 500) };
    }

    const base = baseUrl(device);
    if (!base) return { ok: false, mensagem: "Dispositivo sem IP/endpoint configurado." };

    const rpc = `${base}/rpc/Switch.Set?id=${canal}&on=true&toggle_after=${segundos}`;
    const gen1url = `${base}/relay/${canal}?turn=on&timer=${segundos}`;
    const urls = geracao === "gen1" ? [gen1url, rpc] : [rpc, gen1url];

    let ultima: Response | null = null;
    let texto = "";
    for (const url of urls) {
      ultima = await fetchComTimeout(url, { headers: authHeaders(cred) });
      texto = await ultima.text();
      if (ultima.ok || (ultima.status !== 404 && ultima.status !== 400)) break;
    }
    return {
      ok: !!ultima?.ok,
      status: ultima?.status,
      mensagem: ultima?.ok ? undefined : `Shelly respondeu ${ultima?.status}`,
      detalhes: texto.slice(0, 500),
    };
  } catch (e) {
    return { ok: false, mensagem: (e as Error).message || "Falha de comunicação com o Shelly." };
  }
}

/** Consulta simples de status/online. */
export async function shellyStatus(
  device: ShellyDevice,
  cred: ShellyCredentials,
  canal = 0,
): Promise<ComandoResultado> {
  const base = baseUrl(device);
  if (!base) return { ok: false, mensagem: "Dispositivo sem IP/endpoint configurado." };
  const geracao = ((device.config?.geracao as string) || "gen2").toLowerCase();
  const gen2 = [
    `${base}/rpc/Switch.GetStatus?id=${canal}`,
    `${base}/rpc/Shelly.GetStatus`,
    `${base}/status`,
  ];
  const gen1 = [`${base}/status`, `${base}/rpc/Switch.GetStatus?id=${canal}`, `${base}/rpc/Shelly.GetStatus`];
  const urls = geracao === "gen1" ? gen1 : gen2;
  try {
    let ultima: Response | null = null;
    let texto = "";
    for (const url of urls) {
      ultima = await fetchComTimeout(url, { headers: authHeaders(cred) }, 6000);
      texto = await ultima.text();
      // Só aceita a resposta se ela realmente disser o estado do canal.
      if (ultima.ok && estadoDoCanal(texto, canal) !== null) break;
      if (ultima.ok) continue;
      if (ultima.status !== 404 && ultima.status !== 400) break;
    }
    return { ok: !!ultima?.ok, status: ultima?.status, detalhes: texto.slice(0, 8000) };
  } catch (e) {
    return { ok: false, mensagem: (e as Error).message };
  }
}



/** Liga ou desliga o relé de forma permanente (luz/tomada). */
export async function shellyLigar(
  device: ShellyDevice,
  cred: ShellyCredentials,
  canal: number,
  ligar: boolean,
): Promise<ComandoResultado> {
  const base = baseUrl(device);
  if (!base) return { ok: false, mensagem: "Dispositivo sem IP/endpoint configurado." };
  const geracao = ((device.config?.geracao as string) || "gen2").toLowerCase();
  const rpc = `${base}/rpc/Switch.Set?id=${canal}&on=${ligar ? "true" : "false"}`;
  const gen1 = `${base}/relay/${canal}?turn=${ligar ? "on" : "off"}`;
  const urls = geracao === "gen1" ? [gen1, rpc] : [rpc, gen1];
  try {
    let ultima: Response | null = null;
    let texto = "";
    for (const url of urls) {
      ultima = await fetchComTimeout(url, { headers: authHeaders(cred) });
      texto = await ultima.text();
      if (ultima.ok || (ultima.status !== 404 && ultima.status !== 400)) break;
    }
    return {
      ok: !!ultima?.ok,
      status: ultima?.status,
      mensagem: ultima?.ok ? undefined : `Shelly respondeu ${ultima?.status}`,
      detalhes: texto.slice(0, 500),
    };
  } catch (e) {
    return { ok: false, mensagem: (e as Error).message || "Falha de comunicação com o Shelly." };
  }
}

/** Extrai o estado ligado/desligado de um canal a partir da resposta de status. */
export function estadoDoCanal(detalhes: unknown, canal: number): boolean | null {
  let obj: Record<string, unknown> | null = null;
  if (typeof detalhes === "string") {
    try { obj = JSON.parse(detalhes); } catch { return null; }
  } else if (detalhes && typeof detalhes === "object") {
    obj = detalhes as Record<string, unknown>;
  }
  if (!obj) return null;
  const gen2 = obj[`switch:${canal}`] as { output?: boolean } | undefined;
  if (gen2 && typeof gen2.output === "boolean") return gen2.output;
  const rels = obj["relays"] as Array<{ ison?: boolean }> | undefined;
  if (Array.isArray(rels) && rels[canal] && typeof rels[canal].ison === "boolean") {
    return !!rels[canal].ison;
  }
  const inputs = obj[`input:${canal}`] as { state?: boolean } | undefined;
  if (inputs && typeof inputs.state === "boolean") return inputs.state;
  return null;
}
