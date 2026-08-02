import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * Cofre de credenciais/segredos por organização (estabelecimento_id) para
 * Playwright, Remotion, Higgsfield e Claude Code.
 *
 * Ações (POST { acao, ... }):
 *  - salvar     : cria/atualiza credencial (segredo cifrado AES-GCM)
 *  - rotacionar : gera nova versão do segredo, guardando histórico
 *  - revelar    : devolve o segredo em claro (somente quem pode gerenciar; auditado)
 *  - usar       : uso interno (service_role + x-aip-internal) por workflows/rotinas
 *
 * O segredo nunca é lido pelo front: a coluna `segredo_cifrado` não tem
 * GRANT SELECT para `authenticated`.
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const CRED_KEY = Deno.env.get("AIP_CRED_ENCRYPTION_KEY") ?? "";

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
  const chave = await chaveAes();
  const dados = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, chave, enc.encode(valor));
  return `v1.${b64(iv)}.${b64(dados)}`;
}

async function decifrar(pacote: string) {
  const [versao, ivB64, dadosB64] = pacote.split(".");
  if (versao !== "v1") throw new Error("Formato de segredo desconhecido");
  const chave = await chaveAes();
  const aberto = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: deB64(ivB64) },
    chave,
    deB64(dadosB64),
  );
  return dec.decode(aberto);
}

/** Máscara segura para exibição na tela (nunca revela o valor). */
const mascarar = (valor: string) =>
  valor.length <= 8
    ? `${"•".repeat(Math.max(valor.length - 2, 2))}${valor.slice(-2)}`
    : `${valor.slice(0, 3)}${"•".repeat(6)}${valor.slice(-4)}`;

async function auditar(
  admin: ReturnType<typeof createClient>,
  estabelecimentoId: string,
  usuarioId: string | null,
  acao: string,
  credencialId: string | null,
  detalhes: Record<string, unknown> = {},
) {
  await admin.from("aip_audit_log").insert({
    estabelecimento_id: estabelecimentoId,
    usuario_id: usuarioId,
    acao,
    recurso_tipo: "credencial",
    recurso_id: credencialId,
    detalhes,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!CRED_KEY) return json({ error: "AIP_CRED_ENCRYPTION_KEY não configurada" }, 500);

    const corpo = await req.json().catch(() => ({}));
    const acao = String(corpo?.acao ?? "");
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false },
    });

    // --- Uso interno (workflows/rotinas rodando com service_role) -----------
    if (acao === "usar") {
      const interno = req.headers.get("x-aip-internal");
      const authz = req.headers.get("Authorization") ?? "";
      if (interno !== "1" || !authz.includes(SERVICE_KEY)) {
        return json({ error: "Chamada interna não autorizada" }, 401);
      }
      const { data: cred } = await admin
        .from("aip_credenciais")
        .select("*")
        .eq("estabelecimento_id", corpo.estabelecimento_id)
        .eq("provedor", corpo.provedor)
        .eq("ativo", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cred?.segredo_cifrado) return json({ error: "Credencial não encontrada" }, 404);
      if (cred.expira_em && new Date(cred.expira_em) < new Date()) {
        return json({ error: "Credencial expirada" }, 409);
      }
      await admin
        .from("aip_credenciais")
        .update({ ultimo_uso: new Date().toISOString() })
        .eq("id", cred.id);
      return json({ segredo: await decifrar(cred.segredo_cifrado), dados: cred.dados ?? {} });
    }

    // --- Ações do usuário autenticado ---------------------------------------
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Não autenticado" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });
    const { data: auth } = await userClient.auth.getUser();
    const usuario = auth?.user;
    if (!usuario) return json({ error: "Não autenticado" }, 401);

    const { data: estabelecimentoId } = await userClient.rpc("get_auth_user_estabelecimento_id");
    if (!estabelecimentoId) return json({ error: "Organização não identificada" }, 403);

    const { data: podeGerenciar } = await userClient.rpc("aip_pode_gerenciar_credenciais");
    if (!podeGerenciar) {
      return json({ error: "Sem permissão para gerenciar credenciais desta organização" }, 403);
    }

    if (acao === "salvar") {
      const { id, provedor, nome, descricao, ambiente, dados, segredo, rotacao_dias, expira_em } =
        corpo;
      if (!provedor || !nome) return json({ error: "Provedor e nome são obrigatórios" }, 400);

      const base: Record<string, unknown> = {
        estabelecimento_id: estabelecimentoId,
        provedor,
        nome: String(nome).trim(),
        descricao: descricao ?? null,
        ambiente: ambiente ?? "producao",
        dados: dados ?? {},
        rotacao_dias: rotacao_dias ?? null,
        expira_em: expira_em ?? null,
      };
      if (segredo) {
        base.segredo_cifrado = await cifrar(String(segredo));
        base.mascara = mascarar(String(segredo));
      }

      // Escrita com o client do usuário: RLS/RBAC continuam valendo.
      const resultado = id
        ? await userClient.from("aip_credenciais").update(base).eq("id", id).select("id").single()
        : await userClient
            .from("aip_credenciais")
            .insert({ ...base, created_by: usuario.id })
            .select("id")
            .single();

      if (resultado.error) return json({ error: resultado.error.message }, 400);
      return json({ ok: true, id: resultado.data.id });
    }

    if (acao === "rotacionar") {
      const { id, segredo, motivo } = corpo;
      if (!id || !segredo) return json({ error: "Informe a credencial e o novo segredo" }, 400);

      const { data: atual, error: errAtual } = await userClient
        .from("aip_credenciais")
        .select("id, estabelecimento_id, versao, mascara")
        .eq("id", id)
        .single();
      if (errAtual || !atual) return json({ error: "Credencial não encontrada" }, 404);

      // Histórico da versão anterior (com o segredo antigo cifrado).
      const { data: anterior } = await admin
        .from("aip_credenciais")
        .select("segredo_cifrado")
        .eq("id", id)
        .single();
      await admin.from("aip_credencial_versoes").insert({
        credencial_id: id,
        estabelecimento_id: atual.estabelecimento_id,
        versao: atual.versao,
        mascara: atual.mascara,
        segredo_cifrado: anterior?.segredo_cifrado ?? null,
        motivo: motivo ?? "Rotação manual",
        criado_por: usuario.id,
      });

      const { error } = await userClient
        .from("aip_credenciais")
        .update({
          segredo_cifrado: await cifrar(String(segredo)),
          mascara: mascarar(String(segredo)),
          versao: (atual.versao ?? 1) + 1,
          rotacionado_em: new Date().toISOString(),
          rotacionado_por: usuario.id,
        })
        .eq("id", id);
      if (error) return json({ error: error.message }, 400);

      await auditar(admin, atual.estabelecimento_id, usuario.id, "credencial_rotacionada", id, {
        versao: (atual.versao ?? 1) + 1,
        motivo: motivo ?? null,
      });
      return json({ ok: true, versao: (atual.versao ?? 1) + 1 });
    }

    if (acao === "revelar") {
      const { id } = corpo;
      // Confirma via RLS que o usuário enxerga a credencial desta organização.
      const { data: visivel } = await userClient
        .from("aip_credenciais")
        .select("id, estabelecimento_id, provedor, nome")
        .eq("id", id)
        .maybeSingle();
      if (!visivel) return json({ error: "Credencial não encontrada" }, 404);

      const { data: cred } = await admin
        .from("aip_credenciais")
        .select("segredo_cifrado")
        .eq("id", id)
        .single();
      if (!cred?.segredo_cifrado) return json({ error: "Credencial sem segredo salvo" }, 404);

      await auditar(admin, visivel.estabelecimento_id, usuario.id, "credencial_revelada", id, {
        provedor: visivel.provedor,
        nome: visivel.nome,
      });
      return json({ segredo: await decifrar(cred.segredo_cifrado) });
    }

    return json({ error: `Ação desconhecida: ${acao}` }, 400);
  } catch (e) {
    console.error("aip-credenciais falhou:", e);
    return json({ error: (e as Error).message }, 500);
  }
});
