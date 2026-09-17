import { createClient } from "npm:@supabase/supabase-js@2";
import { md5 } from "npm:js-md5@0.8.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Cliente da API HTTPS do UCM (porta 8089): challenge -> login -> ação. */
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
    const login = await this.chamar({ action: "login", user: this.usuario, token: md5(valor + this.senha) });
    const cookie = String(login?.response?.cookie ?? "");
    if (!cookie) throw new Error("Usuário ou senha da API do UCM inválidos");
    this.cookie = cookie;
  }

  async acao(nome: string, extras: Record<string, unknown> = {}) {
    return await this.chamar({ action: nome, cookie: this.cookie, ...extras });
  }
}

/** Mantém apenas o que o PABX entende: dígitos e os códigos * e #. */
const normalizarNumero = (valor: string) => valor.replace(/[^\d*#]/g, "");

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
    const numero = normalizarNumero(String(corpo.number ?? ""));
    const ramal = normalizarNumero(String(corpo.extension ?? ""));
    if (!numero) return responder({ error: "Informe o número a ser discado" }, 400);
    if (!ramal) return responder({ error: "Informe o ramal de origem" }, 400);

    // O estabelecimento vem do próprio usuário (não do cliente).
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
      return responder({ error: "PABX não configurado ou desativado para este estabelecimento" }, 400);
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
      return responder({ error: `Não foi possível falar com o PABX (${ultimoErro || "sem resposta"})` }, 502);
    }

    const resultado = await cliente.acao("dialExtension", { caller: ramal, callee: numero });
    if (resultado?.status !== undefined && Number(resultado.status) !== 0) {
      return responder({ error: `O PABX recusou a discagem (código ${resultado.status})` }, 400);
    }

    const { data: call } = await supabase
      .from("calls")
      .insert({
        estabelecimento_id: estabelecimentoId,
        call_id: String(resultado?.response?.call_id ?? `call_${Date.now()}`),
        numero_destino: numero,
        ramal,
        status: "dialing",
        direcao: "outbound",
        metadata: { ucm_response: resultado ?? null },
      })
      .select()
      .maybeSingle();

    return responder({ success: true, call, message: "Chamada iniciada" });
  } catch (error) {
    console.error("Erro em ucm-dial:", error);
    return responder({ error: error instanceof Error ? error.message : "Erro desconhecido" }, 500);
  }
});
