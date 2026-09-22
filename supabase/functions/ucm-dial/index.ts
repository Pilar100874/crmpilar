import { createClient } from "npm:@supabase/supabase-js@2";
import { md5 } from "npm:js-md5@0.8.3";
import { clienteUcmTls } from "../_shared/ucmTls.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Cliente da HTTPS API do Grandstream UCM (porta 8089):
 * challenge -> login (md5(challenge + senha)) -> ação com o cookie da sessão.
 * O cookie nunca sai do backend.
 */
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

/**
 * Mantém apenas o que o PABX entende (dígitos e os códigos * e #) e remove o
 * DDI 55 dos telefones do cadastro: as rotas de saída do UCM esperam o número
 * como se fosse discado do aparelho (DDD + número).
 */
const normalizarNumero = (valor: string) => {
  const limpo = (valor || "").replace(/[^\d*#]/g, "");
  if (!limpo || /[*#]/.test(limpo)) return limpo;
  if (limpo.length >= 12 && limpo.length <= 13 && limpo.startsWith("55")) return limpo.slice(2);
  if (limpo.length >= 14 && limpo.startsWith("0055")) return limpo.slice(4);
  return limpo;
};

/**
 * Click-to-Call oficial da API do UCM.
 *
 * Operação escolhida: **dialOutbound** (parâmetros `caller` e `outbound`).
 * É a única que faz exatamente o fluxo pedido: o UCM toca primeiro o ramal
 * informado em `caller` e, quando ele atende, disca o número externo usando as
 * rotas de saída já configuradas no PABX.
 * - `dialExtension` liga um ramal a outro ramal interno (não usa rota de saída);
 * - `dialOutboundTwo` é uma variante para dois números externos e o firmware
 *   deste UCM6510 a recusa (status -1) com os mesmos parâmetros.
 */
async function initiateUcmCall(cliente: ClienteUcm, extension: string, destination: string) {
  return await cliente.acao("dialOutbound", { caller: extension, outbound: destination });
}

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
    const numero = normalizarNumero(String(corpo.number ?? corpo.destination ?? ""));
    if (!numero) return responder({ error: "Informe o número a ser discado" }, 400);

    // Estabelecimento e ramal vêm do próprio cadastro do usuário (nunca do cliente).
    const { data: usuario } = await supabase
      .from("usuarios")
      .select("estabelecimento_id, ramal")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    const estabelecimentoId = usuario?.estabelecimento_id as string | undefined;
    if (!estabelecimentoId) return responder({ error: "Usuário sem estabelecimento" }, 403);

    const ramal = normalizarNumero(String(usuario?.ramal ?? ""));
    if (!ramal) {
      return responder({ error: "Seu usuário não tem ramal cadastrado. Peça ao administrador para informar o ramal." }, 400);
    }

    const { data: config } = await supabase
      .from("ucm_config")
      .select("ucm_host, ucm_user, ucm_password, sip_porta, enabled")
      .eq("estabelecimento_id", estabelecimentoId)
      .maybeSingle();

    if (!config || !config.enabled || !config.ucm_host) {
      return responder({ error: "PABX não configurado ou desativado para este estabelecimento" }, 400);
    }

    // Sempre o endereço externo (domínio do certificado), porta da API HTTPS.
    const host = String(config.ucm_host).replace(/^https?:\/\//i, "").trim();
    const porta = Number(config.sip_porta) || 8089;
    const url = host.includes(":") ? `https://${host}/api` : `https://${host}:${porta}/api`;

    const cliente = new ClienteUcm(url, config.ucm_user, config.ucm_password);
    try {
      await cliente.autenticar();
    } catch (erro) {
      const detalhe = erro instanceof Error ? erro.message : String(erro);
      console.log("Falha ao autenticar no UCM:", url, detalhe);
      return responder({ error: `Não foi possível falar com o PABX (${detalhe})` }, 502);
    }

    // Confere a permissão do ramal antes de discar: com "Internal" o UCM toca o
    // ramal, mas recusa a perna externa e a ligação morre em silêncio depois
    // que o usuário atende. Se a consulta falhar, seguimos sem bloquear.
    let permissaoRamal = "";
    try {
      const ext = await cliente.acao("getExtension", { extension: ramal });
      const dados = (ext?.response?.extension ?? ext?.response ?? {}) as Record<string, unknown>;
      permissaoRamal = String(dados.permission ?? "").toLowerCase();
      console.log("getExtension", JSON.stringify({ ramal, permission: permissaoRamal }));
    } catch (e) {
      console.log("getExtension falhou (seguindo sem validar):", e instanceof Error ? e.message : e);
    }
    if (permissaoRamal === "internal") {
      return responder({
        error: `O ramal ${ramal} está com permissão "Internal" no PABX e só faz ligações internas. No UCM: Extension/Trunk → Extensions → ramal ${ramal} → mude "Permission" para "National" e aplique as alterações.`,
        ucm: { action: "getExtension", permission: permissaoRamal },
      }, 400);
    }

    const resultado = await initiateUcmCall(cliente, ramal, numero);
    const status = Number(resultado?.status ?? 0);
    // Registro sanitizado: nunca logar senha, challenge ou cookie.
    console.log("dialOutbound", JSON.stringify({ ramal, destino: numero, status }));

    if (status !== 0) {
      const mensagem = status === -15 || status === -47
        ? "Este PABX não aceita esse comando de discagem pela API."
        : `O PABX recusou a discagem (código ${status})`;
      return responder({ error: mensagem, ucm: { action: "dialOutbound", status } }, 400);
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
        metadata: { ucm_action: "dialOutbound", ucm_status: status },
      })
      .select()
      .maybeSingle();

    return responder({
      success: true,
      call,
      extension: ramal,
      destination: numero,
      ucm: { action: "dialOutbound", status },
      message: `Chamando ramal ${ramal}. Atenda para o PABX discar ${numero}.`,
    });
  } catch (error) {
    console.error("Erro em ucm-dial:", error);
    return responder({ error: error instanceof Error ? error.message : "Erro desconhecido" }, 500);
  }
});
