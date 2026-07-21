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
export const ROTAS_INTERNAS = [
  { value: "/dashboard", label: "Painel Principal" },
  { value: "/tv/vendas", label: "TV — Vendas" },
  { value: "/tv/veiculos", label: "TV — Veículos" },
  { value: "/tv/cameras", label: "TV — Câmeras (Mosaico)" },
  { value: "/analytics", label: "Analytics Avançado" },
  { value: "/logistica/monitoramento", label: "Logística — Monitoramento" },
  { value: "/logistica/dashboard", label: "Logística — Dashboard" },
  { value: "/dashboard-supervisor", label: "Dashboard Supervisor" },
  { value: "/dashboard-atendente", label: "Dashboard Atendente" },
  { value: "/sla-dashboard", label: "SLA Dashboard" },
  { value: "/monitor-filas", label: "Monitor de Filas" },
  { value: "/monitor-funcionarios", label: "Monitor de Funcionários" },
  { value: "/cameras/dashboard", label: "Câmeras — Dashboard" },
];
