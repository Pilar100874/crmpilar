import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * Configurações do servidor de execução (Claude Agent SDK / Railway) enviadas
 * pelo CRM. Os valores ficam cifrados (AES-GCM) em `aip_server_config` e são
 * decifrados apenas aqui, no momento de enviar para o servidor.
 *
 * Ações (POST { acao }):
 *  - listar  : chaves configuradas + máscara (nunca o valor)
 *  - salvar  : grava/atualiza { itens: [{ chave, valor }] }
 *  - remover : apaga uma chave
 *  - enviar  : decifra tudo e faz POST /config no servidor de execução
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const CRED_KEY = Deno.env.get("AIP_CRED_ENCRYPTION_KEY") ?? "";
const RUNNER_URL = Deno.env.get("AIP_RUNNER_URL") ?? "";
const RUNNER_KEY = Deno.env.get("AIP_RUNNER_KEY") ?? "";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const enc = new TextEncoder();
const dec = new TextDecoder();

async function chaveAes() {
  const material = await crypto.subtle.digest("SHA-256", enc.encode(CRED_KEY));
  return crypto.subtle.importKey("raw", material, "AES-GCM", false, ["encrypt", "decrypt"]);
}

const b64 = (b: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(b as ArrayBuffer)));
const deB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function cifrar(valor: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const dados = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await chaveAes(), enc.encode(valor));
  return `v1.${b64(iv)}.${b64(dados)}`;
}

async function decifrar(pacote: string) {
  const [versao, ivB64, dadosB64] = pacote.split(".");
  if (versao !== "v1") throw new Error("Formato de segredo desconhecido");
  const aberto = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: deB64(ivB64) },
    await chaveAes(),
    deB64(dadosB64),
  );
  return dec.decode(aberto);
}

const mascarar = (valor: string) =>
  valor.length <= 8
    ? `${"•".repeat(Math.max(valor.length - 2, 2))}${valor.slice(-2)}`
    : `${valor.slice(0, 3)}${"•".repeat(6)}${valor.slice(-4)}`;

/** Chaves aceitas — evita gravar qualquer coisa vinda do navegador. */
const CHAVES_PERMITIDAS = [
  "ANTHROPIC_API_KEY",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "RAILWAY_DEPLOY_HOOK_URL",
  "WORKSPACE_DIR",
  "APP_VERSION",
  "HIGGSFIELD_API_KEY",
  "REMOTION_LICENSE_KEY",
  "OPENAI_API_KEY",
  "PLAYWRIGHT_BROWSERS_PATH",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!CRED_KEY) return json({ error: "AIP_CRED_ENCRYPTION_KEY não configurada" }, 500);

    const corpo = await req.json().catch(() => ({}));
    const acao = String(corpo.acao ?? "");

    const authHeader = req.headers.get("Authorization") ?? "";
    const cliente = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await cliente.auth.getUser();
    if (!userData?.user) return json({ error: "Não autenticado" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

    const { data: usuario } = await admin
      .from("usuarios")
      .select("id")
      .eq("auth_user_id", userData.user.id)
      .maybeSingle();

    const { data: roles } = usuario
      ? await admin.from("user_roles").select("role").eq("user_id", usuario.id)
      : { data: [] as { role: string }[] };

    const autorizado = (roles ?? []).some((r) => ["admin", "gestor"].includes(r.role));
    if (!autorizado) return json({ error: "Acesso restrito a administradores e gestores" }, 403);

    if (acao === "listar") {
      const { data } = await admin
        .from("aip_server_config")
        .select("chave, mascara, atualizado_em, enviado_em")
        .order("chave");
      return json({ ok: true, itens: data ?? [], runner_url_configurada: Boolean(RUNNER_URL) });
    }

    if (acao === "salvar") {
      const itens = Array.isArray(corpo.itens) ? corpo.itens : [];
      const gravadas: string[] = [];
      for (const item of itens) {
        const chave = String(item?.chave ?? "");
        const valor = String(item?.valor ?? "");
        if (!CHAVES_PERMITIDAS.includes(chave) || !valor.trim()) continue;
        await admin.from("aip_server_config").upsert(
          {
            chave,
            valor_cifrado: await cifrar(valor.trim()),
            mascara: mascarar(valor.trim()),
            atualizado_em: new Date().toISOString(),
            atualizado_por: usuario?.id ?? null,
          },
          { onConflict: "chave" },
        );
        gravadas.push(chave);
      }
      return json({ ok: true, gravadas });
    }

    if (acao === "remover") {
      const chave = String(corpo.chave ?? "");
      if (!CHAVES_PERMITIDAS.includes(chave)) return json({ error: "Chave inválida" }, 400);
      await admin.from("aip_server_config").delete().eq("chave", chave);
      return json({ ok: true });
    }

    if (acao === "enviar") {
      if (!RUNNER_URL) return json({ ok: false, erro: "AIP_RUNNER_URL não configurada" });
      const { data } = await admin.from("aip_server_config").select("chave, valor_cifrado");
      const config: Record<string, string> = {};
      for (const linha of data ?? []) {
        try {
          config[linha.chave] = await decifrar(linha.valor_cifrado);
        } catch {
          // ignora item corrompido
        }
      }
      // A chave de serviço e a URL do backend não precisam ser digitadas: a própria
      // função já as possui no ambiente e as injeta no envio quando não foram salvas.
      if (!config.SUPABASE_SERVICE_ROLE_KEY && SERVICE_KEY) config.SUPABASE_SERVICE_ROLE_KEY = SERVICE_KEY;
      if (!config.SUPABASE_URL && SUPABASE_URL) config.SUPABASE_URL = SUPABASE_URL;

      if (!Object.keys(config).length) return json({ ok: false, erro: "Nenhuma configuração salva" });

      const r = await fetch(`${RUNNER_URL.replace(/\/$/, "")}/config`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(RUNNER_KEY ? { "X-Runner-Key": RUNNER_KEY } : {}),
        },
        body: JSON.stringify({ config }),
      });
      const resposta = await r.text();
      if (r.ok) {
        await admin
          .from("aip_server_config")
          .update({ enviado_em: new Date().toISOString() })
          .in("chave", Object.keys(config));
      }
      return json({
        ok: r.ok,
        http: r.status,
        aplicadas: Object.keys(config),
        resposta: resposta.slice(0, 500),
        ...(r.ok ? {} : { erro: `HTTP ${r.status}` }),
      });
    }

    return json({ error: "Ação desconhecida" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
