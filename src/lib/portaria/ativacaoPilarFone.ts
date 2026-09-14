import { supabase } from "@/integrations/supabase/client";

const CHAVE_STORAGE = "pilar_fone_ativacao";

export type AtivacaoPilarFone = {
  chave: string;
  estabelecimentoId: string;
  empresa: string;
};

export function estaNoApkPilarFone() {
  const capacitor = (globalThis as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return !!capacitor?.isNativePlatform?.();
}

export function lerAtivacaoPilarFone(): AtivacaoPilarFone | null {
  try {
    const valor = localStorage.getItem(CHAVE_STORAGE);
    if (!valor) return null;
    const ativacao = JSON.parse(valor) as Partial<AtivacaoPilarFone>;
    if (!ativacao.chave || !ativacao.estabelecimentoId) return null;
    return {
      chave: ativacao.chave,
      estabelecimentoId: ativacao.estabelecimentoId,
      empresa: ativacao.empresa ?? "",
    };
  } catch {
    return null;
  }
}

export function limparAtivacaoPilarFone() {
  localStorage.removeItem(CHAVE_STORAGE);
}

export async function validarChavePilarFone(chave: string): Promise<AtivacaoPilarFone> {
  const chaveNormalizada = chave.trim().toUpperCase();
  const { data, error } = await supabase.functions.invoke("automacao-app-chave", {
    body: { chave: chaveNormalizada, app: "pilar-fone" },
  });

  if (error || !data?.estabelecimento_id) {
    const mensagem = typeof data?.error === "string" ? data.error : "Chave inválida ou bloqueada";
    throw new Error(mensagem);
  }

  const ativacao: AtivacaoPilarFone = {
    chave: chaveNormalizada,
    estabelecimentoId: String(data.estabelecimento_id),
    empresa: String(data.empresa ?? ""),
  };
  localStorage.setItem(CHAVE_STORAGE, JSON.stringify(ativacao));
  return ativacao;
}