// Helpers de autenticação/autorização compartilhados pelas Edge Functions.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AuthContext {
  userId: string;
  usuarioId: string | null;
  estabelecimentoId: string | null;
  isAdmin: boolean;
  isManager: boolean;
  isSystemAdmin: boolean;
  isServiceRole: boolean;
}

export function serviceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

/**
 * Valida o JWT do chamador e devolve o contexto do usuário (id, estabelecimento).
 * Retorna null quando não há sessão válida.
 */
export async function getAuthContext(req: Request): Promise<AuthContext | null> {
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  const svc = serviceClient();
  if (token === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
    return {
      userId: "service_role",
      usuarioId: null,
      estabelecimentoId: null,
      isAdmin: true,
      isManager: true,
      isSystemAdmin: true,
      isServiceRole: true,
    };
  }
  const { data, error } = await svc.auth.getUser(token);
  if (error || !data?.user) return null;

  const { data: usuario } = await svc
    .from("usuarios")
    .select("id, estabelecimento_id")
    .eq("auth_user_id", data.user.id)
    .maybeSingle();

  let isAdmin = false;
  let isManager = false;
  if (usuario?.id) {
    const { data: roles } = await svc
      .from("user_roles")
      .select("role")
      .eq("user_id", usuario.id)
      .in("role", ["admin", "gestor"]);
    isAdmin = (roles ?? []).some((item) => item.role === "admin");
    isManager = (roles ?? []).some((item) => item.role === "gestor");
  }

  const { data: systemAdmin } = await svc
    .from("administradores")
    .select("id")
    .eq("id", data.user.id)
    .maybeSingle();

  return {
    userId: data.user.id,
    usuarioId: usuario?.id ?? null,
    estabelecimentoId: usuario?.estabelecimento_id ?? null,
    isAdmin,
    isManager,
    isSystemAdmin: !!systemAdmin,
    isServiceRole: false,
  };
}

export function unauthorized(corsHeaders: Record<string, string>, msg = "Não autorizado") {
  return new Response(JSON.stringify({ error: msg }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function forbidden(corsHeaders: Record<string, string>, msg = "Acesso negado") {
  return new Response(JSON.stringify({ error: msg }), {
    status: 403,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const PRIVATE_HOST_RE =
  /^(localhost|127\.|0\.|10\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?|metadata\.google\.internal$)/i;

/**
 * Bloqueia SSRF: exige http(s) e rejeita hosts internos/privados.
 */
export function assertPublicUrl(rawUrl: string): URL {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    throw new Error("URL inválida");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new Error("Protocolo não permitido");
  }
  if (PRIVATE_HOST_RE.test(u.hostname) || u.hostname.endsWith(".internal") || u.hostname.endsWith(".local")) {
    throw new Error("Destino de rede interna não permitido");
  }
  return u;
}
