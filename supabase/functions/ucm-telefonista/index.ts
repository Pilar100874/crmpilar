import { createClient } from "npm:@supabase/supabase-js@2";
import { md5 } from "npm:js-md5@0.8.3";
import { clienteUcmTls } from "../_shared/ucmTls.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Mesa de telefonista: consolida ramais, chamadas ao vivo, troncos e filas do
 * UCM e executa as ações da operadora (discar, puxar chamada, transferir,
 * pausar/retomar agente em fila, desligar).
 */

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

interface AgenteFila {
  ramal: string;
  nome?: string;
  pausado: boolean;
  status?: string;
}

interface FilaUcm {
  numero: string;
  nome?: string;
  estrategia?: string;
  agentes: AgenteFila[];
}

const textoStatus = (valor: unknown) => String(valor ?? "").trim().toLowerCase();

const estaOnline = (registro: Record<string, unknown>) => {
  const bruto = textoStatus(registro.status ?? registro.presence_status ?? registro.account_status);
  if (!bruto) return false;
  if (/unavailable|unregistered|offline|unmonitored|unknown/.test(bruto)) return false;
  return /registered|available|idle|online|ok|in use|busy|ringing|inuse/.test(bruto);
};

const estaPausado = (registro: Record<string, unknown>) =>
  /paused|pause|1|true|yes/.test(textoStatus(registro.paused ?? registro.pause ?? registro.paused_status));

/** Cliente da API HTTPS do UCM (challenge -> login md5 -> cookie de sessão). */
class ClienteUcm {
  private cookie = "";
  constructor(private url: string, private usuario: string, private senha: string) {}

  private async chamar(corpo: Record<string, unknown>) {
    const controlador = new AbortController();
    const tempo = setTimeout(() => controlador.abort(), 8000);
    try {
      const resposta = await fetch(this.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request: corpo }),
        signal: controlador.signal,
        ...clienteUcmTls(),
      } as RequestInit);
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
    const login = await this.chamar({ action: "login", user: this.usuario, token: md5(valor + this.senha) });
    const cookie = String(login?.response?.cookie ?? "");
    if (!cookie) throw new Error("Usuário ou senha da API do UCM inválidos");
    this.cookie = cookie;
  }

  /** Ação tolerante: falha vira null em vez de exceção. */
  async acao(nome: string, extras: Record<string, unknown> = {}) {
    try {
      const r = await this.chamar({ action: nome, cookie: this.cookie, ...extras });
      return r?.response ?? null;
    } catch (erro) {
      console.log(`Ação ${nome} indisponível:`, erro instanceof Error ? erro.message : erro);
      return null;
    }
  }

  /** Ação completa: devolve status + resposta para inspeção. */
  async acaoBruta(nome: string, extras: Record<string, unknown> = {}) {
    try {
      return await this.chamar({ action: nome, cookie: this.cookie, ...extras });
    } catch (erro) {
      return { status: -999, response: { erro: erro instanceof Error ? erro.message : String(erro) } };
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

/** Interpreta a lista de membros da fila nos formatos que o UCM devolve. */
const interpretarAgentes = (bruto: unknown): AgenteFila[] => {
  if (!bruto) return [];
  // "2222,2223" ou "2222&2223"
  if (typeof bruto === "string") {
    return bruto
      .split(/[,&;\s]+/)
      .map((r) => r.trim())
      .filter(Boolean)
      .map((ramal) => ({ ramal, pausado: false }));
  }
  if (Array.isArray(bruto)) {
    return bruto
      .map((item) => {
        if (typeof item === "string" || typeof item === "number") {
          return { ramal: String(item), pausado: false };
        }
        const reg = item as Record<string, unknown>;
        const ramal = String(reg.extension ?? reg.member ?? reg.agent ?? reg.ramal ?? "");
        if (!ramal) return null;
        return {
          ramal,
          nome: (reg.fullname as string) || (reg.membername as string) || undefined,
          pausado: estaPausado(reg),
          status: (reg.status as string) || undefined,
        };
      })
      .filter((a): a is AgenteFila => Boolean(a));
  }
  return [];
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

    const corpo = await req.json().catch(() => ({}));
    const acao = String(corpo.acao ?? "painel");

    const { data: usuario } = await supabase
      .from("usuarios")
      .select("estabelecimento_id, ramal")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    const estabelecimentoId = usuario?.estabelecimento_id as string | undefined;
    if (!estabelecimentoId) return responder({ error: "Usuário sem estabelecimento" }, 403);

    const meuRamal = String(usuario?.ramal ?? "").replace(/[^\d*#]/g, "");

    const { data: config } = await supabase
      .from("ucm_config")
      .select("ucm_host, remote_ip, ucm_user, ucm_password, sip_porta, enabled")
      .eq("estabelecimento_id", estabelecimentoId)
      .maybeSingle();

    if (!config || !config.enabled || !config.ucm_host) {
      return responder({ error: "PABX não configurado ou desativado para este estabelecimento" }, 400);
    }

    const comPorta = (host: string) =>
      host.includes(":") ? host : `${host}:${Number(config.sip_porta) || 8089}`;
    const candidatos = [config.remote_ip, config.ucm_host]
      .filter((h): h is string => Boolean(h && String(h).trim()))
      .map((h) => `https://${comPorta(String(h).replace(/^https?:\/\//i, "").trim())}/api`);

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
      return responder(
        { error: `Não foi possível falar com o PABX (${ultimoErro || "sem resposta"})` },
        502,
      );
    }

    // ---------- Ações da operadora ----------

    if (acao === "puxar") {
      const alvo = String(corpo.ramal ?? "").replace(/[^\d*#]/g, "");
      if (!meuRamal) return responder({ error: "Seu usuário não tem ramal cadastrado" }, 400);
      if (!alvo) return responder({ error: "Informe o ramal que está tocando" }, 400);
      // Captura dirigida do Grandstream: ** + ramal que está tocando.
      const r = await cliente.acaoBruta("dialOutbound", { caller: meuRamal, outbound: `**${alvo}` });
      if (Number(r?.status) !== 0) {
        return responder({ error: `O PABX recusou a captura (código ${Number(r?.status)})` }, 400);
      }
      return responder({ ok: true, message: `Seu ramal vai tocar: atenda para assumir a chamada do ramal ${alvo}.` });
    }

    if (acao === "transferir") {
      const canal = String(corpo.canal ?? "").trim();
      const destino = String(corpo.destino ?? "").replace(/[^\d*#]/g, "");
      if (!canal || !destino) return responder({ error: "Informe a chamada e o ramal de destino" }, 400);
      // A API do UCM varia por firmware: tentamos os nomes conhecidos de transferência.
      const tentativas: Array<[string, Record<string, unknown>]> = [
        ["transfercall", { channel: canal, exten: destino }],
        ["transferCall", { channel: canal, exten: destino }],
        ["blindTransfer", { channel: canal, exten: destino }],
        ["transfercall", { call_id: canal, destination: destino }],
      ];
      let ultimoStatus: number | null = null;
      for (const [nome, extras] of tentativas) {
        const r = await cliente.acaoBruta(nome, extras);
        const status = Number(r?.status ?? -999);
        console.log("transferir tentativa", JSON.stringify({ nome, status }));
        if (status === 0) {
          return responder({ ok: true, message: `Chamada transferida para ${destino}.` });
        }
        // -1/-15/-47 = ação inexistente neste firmware: tenta a próxima.
        if (![-1, -15, -47, -999].includes(status)) ultimoStatus = status;
      }
      return responder({
        error: ultimoStatus !== null
          ? `O PABX recusou a transferência (código ${ultimoStatus})`
          : "Este PABX não permite transferir chamadas pela API. Transfira pelo próprio telefone ou pelo Pilar Fone.",
      }, 400);
    }

    if (acao === "desligar") {
      const canal = String(corpo.canal ?? "").trim();
      if (!canal) return responder({ error: "Informe a chamada a desligar" }, 400);
      // "hangup" é o nome confirmado no UCM6510; os demais cobrem outros firmwares.
      const tentativas = ["hangup", "hangupCall", "hangupcall", "hangupChannel"];
      for (const nome of tentativas) {
        const r = await cliente.acaoBruta(nome, { channel: canal });
        const status = Number(r?.status ?? -999);
        if (status === 0) return responder({ ok: true, message: "Chamada encerrada." });
        if (![-1, -15, -47, -999].includes(status)) {
          return responder({ error: `O PABX recusou o desligamento (código ${status})` }, 400);
        }
      }
      return responder({ error: "Este PABX não permite desligar chamadas pela API." }, 400);
    }

    if (acao === "fila_pausar") {
      const fila = String(corpo.fila ?? "").trim();
      const ramal = String(corpo.ramal ?? "").replace(/[^\d*#]/g, "");
      const pausar = Boolean(corpo.pausar);
      if (!fila || !ramal) return responder({ error: "Informe a fila e o agente" }, 400);
      const tentativas: Array<[string, Record<string, unknown>]> = pausar
        ? [
            ["pauseQueueAgent", { queue: fila, agent: ramal, paused: "1" }],
            ["pauseQueueAgent", { queue: fila, member: ramal, paused: "1" }],
            ["updateQueueAgent", { queue: fila, agent: ramal, paused: "1" }],
            ["queueAgentPause", { queue: fila, agent: ramal }],
          ]
        : [
            ["pauseQueueAgent", { queue: fila, agent: ramal, paused: "0" }],
            ["unpauseQueueAgent", { queue: fila, agent: ramal }],
            ["updateQueueAgent", { queue: fila, agent: ramal, paused: "0" }],
          ];
      let ultimoStatus: number | null = null;
      for (const [nome, extras] of tentativas) {
        const r = await cliente.acaoBruta(nome, extras);
        const status = Number(r?.status ?? -999);
        console.log("fila_pausar tentativa", JSON.stringify({ nome, status, fila, ramal, pausar }));
        if (status === 0) {
          return responder({
            ok: true,
            message: pausar
              ? `Agente ${ramal} pausado na fila ${fila}.`
              : `Agente ${ramal} de volta à fila ${fila}.`,
          });
        }
        if (![-1, -15, -47, -999].includes(status)) ultimoStatus = status;
      }
      return responder({
        error: ultimoStatus !== null
          ? `O PABX recusou a operação na fila (código ${ultimoStatus})`
          : "Este PABX não permite pausar agentes pela API. Use o código de pausa no próprio ramal.",
      }, 400);
    }

    // ---------- Painel (padrão) ----------

    const [contas, pontes, livres, troncosSip, troncosAnalog, filasBrutas] = await Promise.all([
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
      cliente.acao("listQueue", {
        options: "extension,queue_name,strategy,members",
        item_num: 100,
        page: 1,
        sidx: "extension",
        sord: "asc",
      }),
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

    // Filas: tenta a listagem resumida e, por fila, o detalhe com os agentes.
    const filas: FilaUcm[] = [];
    const listaFilas = listaDe(filasBrutas, "queue", "list");
    for (const f of listaFilas) {
      const numero = String(f.extension ?? f.queue ?? "");
      if (!numero) continue;
      const fila: FilaUcm = {
        numero,
        nome: (f.queue_name as string) || (f.name as string) || undefined,
        estrategia: (f.strategy as string) || undefined,
        agentes: interpretarAgentes(f.members),
      };
      if (fila.agentes.length === 0) {
        const detalhe = await cliente.acao("getQueue", { queue: numero });
        const dados = (detalhe?.queue ?? detalhe ?? {}) as Record<string, unknown>;
        fila.agentes = interpretarAgentes(
          dados.members ?? dados.member ?? dados.agent ?? dados.agents,
        );
        if (!fila.nome) fila.nome = (dados.queue_name as string) || undefined;
        if (!fila.estrategia) fila.estrategia = (dados.strategy as string) || undefined;
      }
      filas.push(fila);
    }

    return responder({ ok: true, ramais, chamadas, troncos, filas, meu_ramal: meuRamal });
  } catch (erro) {
    console.error("Erro em ucm-telefonista:", erro);
    return responder(
      { error: erro instanceof Error ? erro.message : "Erro inesperado" },
      500,
    );
  }
});
