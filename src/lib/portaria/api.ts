import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PortRole = "super_admin" | "admin" | "porteiro" | "morador";

export interface PortariaPerfil {
  userId: string | null;
  roles: PortRole[];
  isSuperAdmin: boolean;
  isGestor: boolean;
  isStaff: boolean;
  carregando: boolean;
}

/** Papéis da portaria do usuário logado (a autorização real é revalidada no backend). */
export function usePortariaPerfil(): PortariaPerfil {
  const [userId, setUserId] = useState<string | null>(null);
  const [roles, setRoles] = useState<PortRole[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? null;
      if (!ativo) return;
      setUserId(uid);
      if (uid) {
        const { data: papeis } = await supabase
          .from("port_user_roles")
          .select("role")
          .eq("user_id", uid);
        if (ativo) setRoles((papeis ?? []).map((p) => p.role as PortRole));
      }
      if (ativo) setCarregando(false);
    })();
    return () => {
      ativo = false;
    };
  }, []);

  // Usuário interno do CRM sem papel específico na Portaria: tratado como gestor
  // (a autorização real é revalidada no backend).
  const semPapel = !!userId && roles.length === 0 && !carregando;

  return {
    userId,
    roles,
    isSuperAdmin: roles.includes("super_admin"),
    isGestor: semPapel || roles.some((r) => r === "super_admin" || r === "admin"),
    isStaff: semPapel || roles.some((r) => r === "super_admin" || r === "admin" || r === "porteiro"),
    carregando,
  };

}

export interface RespostaComando {
  ok: boolean;
  mensagem: string;
}

function mensagemErro(erro: unknown, fallback: string): string {
  const e = erro as { message?: string; context?: { body?: unknown } } | null;
  const bruto = e?.message ?? "";
  if (/429/.test(bruto)) return "Muitos acionamentos seguidos. Aguarde alguns segundos.";
  if (/403/.test(bruto)) return "Você não tem permissão para abrir este acesso.";
  if (/401/.test(bruto)) return "Sessão expirada. Faça login novamente.";
  return bruto || fallback;
}

/** Envia o comando de abertura para o backend (nunca fala direto com o equipamento). */
export async function abrirAcesso(accessPointId: string): Promise<RespostaComando> {
  const nonce = `${Date.now()}-${crypto.randomUUID()}`;
  const { data, error } = await supabase.functions.invoke("portaria-comando", {
    body: { access_point_id: accessPointId, nonce },
  });
  if (error) return { ok: false, mensagem: mensagemErro(error, "Falha ao acionar o dispositivo.") };
  const resposta = data as { ok?: boolean; error?: string } | null;
  if (!resposta?.ok) return { ok: false, mensagem: resposta?.error || "Falha ao acionar o dispositivo." };
  return { ok: true, mensagem: "Acesso liberado." };
}

export async function testarDispositivo(
  deviceId: string,
  acao: "status" | "pulso_teste",
): Promise<RespostaComando> {
  const { data, error } = await supabase.functions.invoke("portaria-dispositivo", {
    body: { acao, device_id: deviceId },
  });
  if (error) return { ok: false, mensagem: mensagemErro(error, "Falha ao comunicar com o dispositivo.") };
  const r = data as { ok?: boolean; mensagem?: string } | null;
  return { ok: !!r?.ok, mensagem: r?.mensagem || (r?.ok ? "Dispositivo respondeu com sucesso." : "Dispositivo não respondeu.") };
}

export async function salvarCredenciais(
  deviceId: string,
  campos: { usuario?: string; senha?: string; token?: string },
): Promise<RespostaComando> {
  const { error } = await supabase.functions.invoke("portaria-dispositivo", {
    body: { acao: "salvar_credenciais", device_id: deviceId, ...campos },
  });
  if (error) return { ok: false, mensagem: mensagemErro(error, "Falha ao salvar credenciais.") };
  return { ok: true, mensagem: "Credenciais salvas com segurança no backend." };
}

export async function comandoControlId(
  body: Record<string, unknown>,
): Promise<RespostaComando & { dados?: unknown }> {
  const { data, error } = await supabase.functions.invoke("portaria-controlid", { body });
  if (error) return { ok: false, mensagem: mensagemErro(error, "Falha na comunicação com o iDFace.") };
  const r = data as { ok?: boolean; mensagem?: string; dados?: unknown } | null;
  return {
    ok: !!r?.ok,
    mensagem: r?.mensagem || (r?.ok ? "Operação concluída." : "Não foi possível concluir."),
    dados: r?.dados,
  };
}

export const DIAS_SEMANA = [
  { valor: 0, label: "Dom" },
  { valor: 1, label: "Seg" },
  { valor: 2, label: "Ter" },
  { valor: 3, label: "Qua" },
  { valor: 4, label: "Qui" },
  { valor: 5, label: "Sex" },
  { valor: 6, label: "Sáb" },
];

export const STATUS_CORES: Record<string, string> = {
  online: "bg-emerald-500",
  offline: "bg-muted-foreground",
  erro: "bg-destructive",
  sincronizando: "bg-amber-500",
};

export function maskTelefone(valor: string): string {
  const d = valor.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) {
    return d.replace(/^(\d{0,2})(\d{0,4})(\d{0,4}).*/, (_m, a, b, c) =>
      [a && `(${a}`, a.length === 2 ? ") " : "", b, c && `-${c}`].filter(Boolean).join(""));
  }
  return d.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, (_m, a, b, c) => `(${a}) ${b}${c ? `-${c}` : ""}`);
}
