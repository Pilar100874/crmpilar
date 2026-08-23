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

    const url = geracao === "gen1"
      ? `${base}/relay/${canal}?turn=on&timer=${segundos}`
      : `${base}/rpc/Switch.Set?id=${canal}&on=true&toggle_after=${segundos}`;

    const resp = await fetchComTimeout(url, { headers: authHeaders(cred) });
    const texto = await resp.text();
    return {
      ok: resp.ok,
      status: resp.status,
      mensagem: resp.ok ? undefined : `Shelly respondeu ${resp.status}`,
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
): Promise<ComandoResultado> {
  const base = baseUrl(device);
  if (!base) return { ok: false, mensagem: "Dispositivo sem IP/endpoint configurado." };
  const geracao = ((device.config?.geracao as string) || "gen2").toLowerCase();
  const url = geracao === "gen1" ? `${base}/status` : `${base}/rpc/Shelly.GetStatus`;
  try {
    const resp = await fetchComTimeout(url, { headers: authHeaders(cred) }, 6000);
    const texto = await resp.text();
    return { ok: resp.ok, status: resp.status, detalhes: texto.slice(0, 1000) };
  } catch (e) {
    return { ok: false, mensagem: (e as Error).message };
  }
}
