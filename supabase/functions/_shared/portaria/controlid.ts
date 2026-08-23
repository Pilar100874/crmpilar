// Adaptador Control iD (iDFace Max) — usado apenas no backend.
// Todos os caminhos são configuráveis por dispositivo (device.config.endpoints)
// para não engessar o sistema caso o fabricante altere a API.

export interface ControlIdDevice {
  ip?: string | null;
  porta?: number | null;
  endpoint?: string | null;
  config?: Record<string, unknown> | null;
}

export interface ControlIdCredentials {
  usuario?: string | null;
  senha?: string | null;
  token?: string | null;
}

export interface ControlIdResultado {
  ok: boolean;
  status?: number;
  mensagem?: string;
  dados?: unknown;
}

const PADRAO = {
  login: "/login.fcgi",
  logout: "/logout.fcgi",
  execute_actions: "/execute_actions.fcgi",
  create_objects: "/create_objects.fcgi",
  load_objects: "/load_objects.fcgi",
  modify_objects: "/modify_objects.fcgi",
  destroy_objects: "/destroy_objects.fcgi",
  user_set_image: "/user_set_image.fcgi",
  system_information: "/system_information.fcgi",
};

function caminho(device: ControlIdDevice, chave: keyof typeof PADRAO): string {
  const custom = (device.config?.endpoints as Record<string, string> | undefined)?.[chave];
  return custom || PADRAO[chave];
}

function baseUrl(device: ControlIdDevice): string | null {
  if (device.endpoint) return device.endpoint.replace(/\/+$/, "");
  if (!device.ip) return null;
  const porta = device.porta ? `:${device.porta}` : "";
  const proto = (device.config?.protocolo as string) || "http";
  return `${proto}://${device.ip}${porta}`;
}

async function post(url: string, body: unknown, ms = 10000): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(t);
  }
}

/**
 * Serviço do iDFace Max. Mantém a sessão em memória durante a execução.
 * As credenciais nunca saem do backend.
 */
export class ControlIDService {
  private session: string | null = null;

  constructor(
    private device: ControlIdDevice,
    private cred: ControlIdCredentials,
  ) {}

  private url(chave: keyof typeof PADRAO, comSessao = true): string | null {
    const base = baseUrl(this.device);
    if (!base) return null;
    const sufixo = comSessao && this.session ? `?session=${this.session}` : "";
    return `${base}${caminho(this.device, chave)}${sufixo}`;
  }

  async login(): Promise<ControlIdResultado> {
    if (this.session) return { ok: true };
    const url = this.url("login", false);
    if (!url) return { ok: false, mensagem: "Dispositivo sem IP/endpoint configurado." };
    if (!this.cred.usuario || !this.cred.senha) {
      return { ok: false, mensagem: "Credenciais do iDFace não configuradas." };
    }
    try {
      const resp = await post(url, { login: this.cred.usuario, password: this.cred.senha });
      const dados = await resp.json().catch(() => null);
      const session = (dados as { session?: string } | null)?.session;
      if (!resp.ok || !session) {
        return { ok: false, status: resp.status, mensagem: "Falha ao autenticar no iDFace.", dados };
      }
      this.session = session;
      return { ok: true, dados };
    } catch (e) {
      return { ok: false, mensagem: (e as Error).message };
    }
  }

  private async chamar(chave: keyof typeof PADRAO, body: unknown): Promise<ControlIdResultado> {
    const login = await this.login();
    if (!login.ok) return login;
    const url = this.url(chave);
    if (!url) return { ok: false, mensagem: "Dispositivo sem IP/endpoint configurado." };
    try {
      const resp = await post(url, body);
      const texto = await resp.text();
      let dados: unknown = texto;
      try { dados = JSON.parse(texto); } catch { /* resposta não-JSON */ }
      return { ok: resp.ok, status: resp.status, dados, mensagem: resp.ok ? undefined : `iDFace respondeu ${resp.status}` };
    } catch (e) {
      return { ok: false, mensagem: (e as Error).message };
    }
  }

  getDeviceStatus() {
    return this.chamar("system_information", {});
  }

  /** Abre a porta acionando a ação de porta do equipamento. */
  openDoor(portaNumero = 1) {
    return this.chamar("execute_actions", {
      actions: [{ action: "door", parameters: `door=${portaNumero}` }],
    });
  }

  getUsers(limite = 100) {
    return this.chamar("load_objects", { object: "users", limit: limite });
  }

  createUser(user: { name: string; registration?: string; begin_time?: number; end_time?: number }) {
    return this.chamar("create_objects", { object: "users", values: [user] });
  }

  updateUser(id: number | string, valores: Record<string, unknown>) {
    return this.chamar("modify_objects", {
      object: "users",
      values: valores,
      where: { users: { id: Number(id) } },
    });
  }

  deleteUser(id: number | string) {
    return this.chamar("destroy_objects", { object: "users", where: { users: { id: Number(id) } } });
  }

  /** Envia a foto facial do usuário (base64 de JPEG). */
  async enrollFace(userId: number | string, imagemBase64: string): Promise<ControlIdResultado> {
    const login = await this.login();
    if (!login.ok) return login;
    const base = baseUrl(this.device);
    if (!base) return { ok: false, mensagem: "Dispositivo sem IP/endpoint configurado." };
    const url = `${base}${caminho(this.device, "user_set_image")}?session=${this.session}&user_id=${userId}&match=1&timestamp=${Math.floor(Date.now() / 1000)}`;
    try {
      const bin = Uint8Array.from(atob(imagemBase64.replace(/^data:[^,]+,/, "")), (c) => c.charCodeAt(0));
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 15000);
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: bin,
        signal: ctrl.signal,
      });
      clearTimeout(t);
      const texto = await resp.text();
      return { ok: resp.ok, status: resp.status, dados: texto.slice(0, 500) };
    } catch (e) {
      return { ok: false, mensagem: (e as Error).message };
    }
  }

  revokeFace(userId: number | string) {
    return this.chamar("destroy_objects", {
      object: "user_images",
      where: { user_images: { user_id: Number(userId) } },
    });
  }

  getAccessLogs(limite = 100) {
    return this.chamar("load_objects", { object: "access_logs", limit: limite, order: ["-time"] });
  }
}
