// Validação de sessão e RBAC — toda autorização é revalidada no backend.
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

export const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

export function adminClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
}

export type PortRole = "super_admin" | "admin" | "porteiro" | "morador";

export interface Contexto {
  userId: string;
  roles: PortRole[];
  isGestor: boolean;
  isStaff: boolean;
}

/** Valida o JWT com o servidor de auth e carrega os papéis da portaria. */
export async function autenticar(req: Request): Promise<Contexto | null> {
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return null;

  const cliente = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await cliente.auth.getUser();
  if (error || !data.user) return null;

  const admin = adminClient();
  const { data: papeis } = await admin
    .from("port_user_roles")
    .select("role")
    .eq("user_id", data.user.id);

  const roles = (papeis ?? []).map((p) => p.role as PortRole);
  return {
    userId: data.user.id,
    roles,
    isGestor: roles.some((r) => r === "super_admin" || r === "admin"),
    isStaff: roles.some((r) => r === "super_admin" || r === "admin" || r === "porteiro"),
  };
}

export function ipOrigem(req: Request): string | null {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    null
  );
}
