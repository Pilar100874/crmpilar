import { createClient } from "npm:@supabase/supabase-js@2";
import { md5 } from "npm:js-md5@0.8.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RamalUcm {
  ramal: string;
  nome?: string;
  online: boolean;
  endereco?: string;
  tipo?: string;
}

interface ChamadaUcm {
  canal?: string;
  origem?: string;
  destino?: string;
  duracao?: string;
  estado?: string;
}

interface TroncoUcm {
  nome?: string;
  tipo?: string;
  status?: string;
}

const textoStatus = (valor: unknown) => String(valor ?? "").trim().toLowerCase();

const estaOnline = (registro: Record<string, unknown>) => {
  const bruto = textoStatus(registro.status ?? registro.presence_status ?? registro.account_status);
  if (!bruto) return false;
  if (/unavailable|unregistered|offline|unmonitored|unknown/.test(bruto)) return false;
  return /registered|available|idle|online|ok|in use|busy|ringing|inuse/.test(bruto);
};

/** Cliente da API HTTPS do UCM (challenge -> login -> ações). */
class ClienteUcm {
  private cookie = "";
  constructor(private url: string, private usuario: string, private senha: string) {}

  private async chamar(corpo: Record<string, unknown>) {
    const controlador = new AbortController();
    const tempo = setTimeout(() => controlador.abort(), 8000);
    try {
      const resposta = await fetch(this.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.cookie ? { Cookie: this.cookie } : {}),
        },
        body: JSON.stringify({ request: corpo }),
        signal: controlador.signal,
      });
      if (!resposta.ok) throw new Error(`UCM respondeu ${resposta.status}`);
      return (await resposta.json()) as { status?: number; response?: Record<string, unknown> };
    } finally {
      clearTimeout(tempo);
    }
  }

  async autenticar() {
    const desafio = await this.chamar({ action: "challenge", user: this.usuario, version: "1.0" });
    const valor = String(desafio?.response?.challenge ?? "");
    if (!valor) throw new Error("UCM não retornou o desafio de autenticação");
    const login = await this.chamar({
      action: "login",
      user: this.usuario,
      token: md5(valor + this.senha),
    });
    const cookie = String(login?.response?.cookie ?? "");
    if (!cookie) throw new Error("Usuário ou senha da API do UCM inválidos");
    this.cookie = `session_id=${cookie}`;
  }

  async acao(nome: string, extras: Record<string, unknown> = {}) {
    try {
      const r = await this.chamar({ action: nome, cookie: this.cookie.replace("session_id=", ""), ...extras });
      return r?.response ?? null;
    } catch (erro) {
      console.log(`Ação ${nome} indisponível:`, erro instanceof Error ? erro.message : erro);
      return null;
    }
  }
}

const listaDe = (resposta: Record<string, unknown> | null, ...chaves: string[]) => {
  if (!resposta) return [] as Record<string, unknown>[];
  for (const chave of chaves) {
    const valor = resposta[chave];
    if (Array.isArray(valor)) return valor as Record<string, unknown>[];
  }
  return [] as Record<string, unknown>[];
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const responder = (corpo: unknown, status = 200) =>
    new Response(JSON.stringify(corpo), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("authorization");
    if (!authHeader) return responder({ error: "Não autenticado" }, 401);

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authError || !user) return responder({ error: "Não autenticado" }, 401);

    const { data: usuario } = await supabase
      .from("usuarios")
      .select("estabelecimento_id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    const estabelecimentoId = usuario?.estabelecimento_id as string | undefined;
    if (!estabelecimentoId) return responder({ error: "Usuário sem estabelecimento" }, 403);

    const { data: config } = await supabase
      .from("ucm_config")
      .select("ucm_host, remote_ip, ucm_user, ucm_password, enabled")
      .eq("estabelecimento_id", estabelecimentoId)
      .maybeSingle();

    if (!config || !config.enabled || !config.ucm_host) {
      return responder({ ok: false, motivo: "PABX não configurado ou desativado", ramais: [], chamadas: [], troncos: [] });
    }

    const comPorta = (host: string) => (host.includes(":") ? host : `${host}:8089`);
    const candidatos = [config.remote_ip, config.ucm_host]
      .filter((h): h is string => Boolean(h && h.trim()))
      .map((h) => `https://${comPorta(h.replace(/^https?:\/\//i, "").trim())}/api`);

    let cliente: ClienteUcm | null = null;
    let ultimoErro = "";
    for (const url of candidatos) {
      try {
        const tentativa = new ClienteUcm(url, config.ucm_user, config.ucm_password);
        await tentativa.autenticar();
        cliente = tentativa;
        break;
      } catch (erro) {
        ultimoErro = erro instanceof Error ? erro.message : String(erro);
        console.log("Falha ao conectar no UCM:", url, ultimoErro);
      }
    }

    if (!cliente) {
      return responder({
        ok: false,
        motivo: `Não foi possível falar com o PABX (${ultimoErro || "sem resposta"})`,
        ramais: [],
        chamadas: [],
        troncos: [],
      });
    }

    const [contas, pontes, livres, troncosSip, troncosAnalog] = await Promise.all([
      cliente.acao("listAccount", {
        options: "extension,fullname,status,addr,account_type,out_of_service",
        item_num: 500,
        page: 1,
        sidx: "extension",
        sord: "asc",
      }),
      cliente.acao("listBridgedChannels"),
      cliente.acao("listUnBridgedChannels"),
      cliente.acao("listSIPTrunk", { options: "trunk_name,technology,out_of_service" }),
      cliente.acao("listAnalogTrunk", { options: "trunk_name,out_of_service" }),
    ]);

    const ramais: RamalUcm[] = listaDe(contas, "account", "extension", "list").map((c) => ({
      ramal: String(c.extension ?? c.ext ?? ""),
      nome: (c.fullname as string) || undefined,
      online: estaOnline(c),
      endereco: (c.addr as string) || undefined,
      tipo: (c.account_type as string) || undefined,
    })).filter((r) => r.ramal);

    const normalizarChamada = (c: Record<string, unknown>, estado: string): ChamadaUcm => ({
      canal: (c.channel as string) ?? (c.channelname as string) ?? undefined,
      origem: (c.callerid as string) ?? (c.src as string) ?? (c.caller as string) ?? undefined,
      destino: (c.dialplan as string) ?? (c.dest as string) ?? (c.callee as string) ?? undefined,
      duracao: (c.duration as string) ?? undefined,
      estado,
    });

    const chamadas: ChamadaUcm[] = [
      ...listaDe(pontes, "channel", "list").map((c) => normalizarChamada(c, "Em conversa")),
      ...listaDe(livres, "channel", "list").map((c) => normalizarChamada(c, "Chamando")),
    ];

    const troncos: TroncoUcm[] = [
      ...listaDe(troncosSip, "sip_trunk", "trunk", "list").map((t) => ({
        nome: (t.trunk_name as string) ?? undefined,
        tipo: (t.technology as string) ?? "SIP",
        status: textoStatus(t.out_of_service) === "1" ? "Fora de serviço" : "Ativo",
      })),
      ...listaDe(troncosAnalog, "analog_trunk", "trunk", "list").map((t) => ({
        nome: (t.trunk_name as string) ?? undefined,
        tipo: "Analógico",
        status: textoStatus(t.out_of_service) === "1" ? "Fora de serviço" : "Ativo",
      })),
    ];

    return responder({ ok: true, ramais, chamadas, troncos });
  } catch (erro) {
    console.error("Erro em ucm-status:", erro);
    return responder(
      { ok: false, motivo: erro instanceof Error ? erro.message : "Erro inesperado", ramais: [], chamadas: [], troncos: [] },
      200,
    );
  }
});
