import { supabase } from "@/integrations/supabase/client";
import type { TvCommandTipo } from "@/types/tvSignage";

// Gera código de 8 caracteres A-Z0-9
export function gerarCodigo(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  const arr = new Uint32Array(8);
  crypto.getRandomValues(arr);
  for (const v of arr) out += chars[v % chars.length];
  return out;
}

// Gera token opaco base64url (32 bytes)
export function gerarToken(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function sha256Hex(data: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function getEstabelecimentoId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("usuarios").select("estabelecimento_id").eq("auth_user_id", user.id).maybeSingle();
  return (data as any)?.estabelecimento_id ?? null;
}

export async function getUsuarioId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("usuarios").select("id").eq("auth_user_id", user.id).maybeSingle();
  return (data as any)?.id ?? null;
}

export async function enviarComando(deviceId: string, tipo: TvCommandTipo, payload: Record<string, any> = {}) {
  const estId = await getEstabelecimentoId();
  const usuarioId = await getUsuarioId();
  return await supabase.from("tv_commands").insert({
    device_id: deviceId,
    estabelecimento_id: estId,
    tipo,
    payload,
    criado_por: usuarioId,
  } as any);
}

// Rotas internas do sistema que podem ser projetadas em TV
// IMPORTANTE: apenas rotas preparadas para modo TV (autenticação via tv_token,
// fora do LayoutWrapper que exige sessão de usuário). Outras rotas do sistema
// redirecionam para /login quando abertas sem sessão Supabase.
export const ROTAS_INTERNAS = [
  { value: "/tv/vendas", label: "TV — Vendas" },
  { value: "/tv/veiculos", label: "TV — Veículos" },
  { value: "/tv/cameras", label: "TV — Câmeras (Mosaico)" },
  { value: "/tv/apresentacao", label: "TV — Apresentação da Empresa" },
];
