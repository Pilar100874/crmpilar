import { createClient } from "npm:@supabase/supabase-js@2";
import { md5 } from "npm:js-md5@0.8.3";
import { clienteUcmTls } from "../_shared/ucmTls.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

class ClienteUcm {
  private cookie = "";
  constructor(private url: string, private usuario: string, private senha: string) {}

  private async chamar(corpo: Record<string, unknown>) {
    const controlador = new AbortController();
    const tempo = setTimeout(() => controlador.abort(), 10000);
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

  async acao(nome: string, extras: Record<string, unknown> = {}) {
    return await this.chamar({ action: nome, cookie: this.cookie, ...extras });
  }
}

/** Remove qualquer campo sensível (senha, segredo, cookie...) da resposta. */
function sanitizar(valor: unknown): unknown {
  if (Array.isArray(valor)) return valor.map(sanitizar);
  if (valor && typeof valor === "object") {
    const saida: Record<string, unknown> = {};
    for (const [chave, v] of Object.entries(valor as Record<string, unknown>)) {
      if (/secret|pass|md5|token|cookie|auth|pwd/i.test(chave)) continue;
      saida[chave] = sanitizar(v);
    }
    return saida;
  }
  return valor;
}

/** Mantém só os campos úteis para o diagnóstico de privilégio. */
function resumirRamal(registro: Record<string, unknown>) {
  const campos = ["extension", "extension_name", "fullname", "technology", "privilege", "permission", "status", "out_of_service", "ringtimeout"];
  const saida: Record<string, unknown> = {};
  for (const c of campos) if (registro[c] !== undefined) saida[c] = registro[c];
  return saida;
}

function resumirRota(registro: Record<string, unknown>) {
  const campos = [
    "outbound_route", "outbound_route_name", "name", "privilege", "pattern",
    "patterns", "trunk", "trunks", "members", "sequence", "prepend", "prefix",
    "strip", "callerid", "use_callerid",
  ];
  const saida: Record<string, unknown> = {};
  for (const c of campos) if (registro[c] !== undefined) saida[c] = registro[c];
  return saida;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

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
      .select("estabelecimento_id, ramal")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    const estabelecimentoId = usuario?.estabelecimento_id as string | undefined;
    if (!estabelecimentoId) return responder({ error: "Usuário sem estabelecimento" }, 403);
    const ramal = String(usuario?.ramal ?? "").replace(/\D/g, "");

    const { data: config } = await supabase
      .from("ucm_config")
      .select("ucm_host, ucm_user, ucm_password, sip_porta, enabled")
      .eq("estabelecimento_id", estabelecimentoId)
      .maybeSingle();
    if (!config || !config.enabled || !config.ucm_host) {
      return responder({ error: "PABX não configurado ou desativado para este estabelecimento" }, 400);
    }

    const host = String(config.ucm_host).replace(/^https?:\/\//i, "").trim();
    const porta = Number(config.sip_porta) || 8089;
    const url = host.includes(":") ? `https://${host}/api` : `https://${host}:${porta}/api`;

    const cliente = new ClienteUcm(url, config.ucm_user, config.ucm_password);
    await cliente.autenticar();

    const corpo = await req.json().catch(() => ({}));
    const resultado: Record<string, unknown> = { ramal_consultado: ramal };

    // 1) Dados do ramal do usuário: privilégio de discagem.
    const listagem = await cliente.acao("listExtension", { sidx: "extension", sord: "asc", page: 1 });
    const rotas = await cliente.acao("listOutboundRoutes", { sidx: "sequence", sord: "asc", page: 1 });
    if (corpo?.raw) {
      return responder({ listExtension: sanitizar(listagem), listOutboundRoutes: sanitizar(rotas) });
    }
    const ramais = (listagem?.response?.extension ?? []) as Array<Record<string, unknown>>;
    if (Array.isArray(ramais)) {
      const meu = ramais.find((r) => String(r.extension) === ramal);
      if (meu) resultado.ramal = resumirRamal(sanitizar(meu) as Record<string, unknown>);
      resultado.total_ramais = ramais.length;
    } else {
      resultado.listExtension_status = listagem?.status;
    }

    // 2) Rotas de saída: privilégio exigido e padrões de número.
    const rotas = await cliente.acao("listOutboundRoutes", { sidx: "sequence", sord: "asc", page: 1 });
    const lista = (rotas?.response?.outbound_route ?? rotas?.response?.outbound_routes ?? []) as Array<Record<string, unknown>>;
    if (Array.isArray(lista)) {
      resultado.rotas_saida = lista.map((r) => resumirRota(sanitizar(r) as Record<string, unknown>));
    } else {
      resultado.listOutboundRoutes_status = rotas?.status;
    }

    return responder(resultado);
  } catch (error) {
    console.error("Erro em ucm-diagnostico:", error);
    return responder({ error: error instanceof Error ? error.message : "Erro desconhecido" }, 500);
  }
});
