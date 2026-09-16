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

/** Erro de ativação: `rejeitada` só é true quando o servidor recusou a chave. */
export class ErroChavePilarFone extends Error {
  rejeitada: boolean;
  constructor(mensagem: string, rejeitada: boolean) {
    super(mensagem);
    this.name = "ErroChavePilarFone";
    this.rejeitada = rejeitada;
  }
}

function statusDoErro(erro: unknown): number | null {
  const ctx = (erro as { context?: { status?: unknown } } | null)?.context;
  return typeof ctx?.status === "number" ? ctx.status : null;
}

export async function validarChavePilarFone(chave: string): Promise<AtivacaoPilarFone> {
  const chaveNormalizada = chave.trim().toUpperCase();
  let data: { estabelecimento_id?: string; empresa?: string; error?: string } | null = null;
  let error: unknown = null;
  try {
    const resposta = await supabase.functions.invoke("automacao-app-chave", {
      body: { chave: chaveNormalizada, app: "pilar-fone" },
    });
    data = resposta.data;
    error = resposta.error;
  } catch (e) {
    // Falha de rede/transporte: nunca é motivo para apagar a ativação.
    throw new ErroChavePilarFone("Não foi possível falar com o servidor. Verifique a internet.", false);
  }

  if (error) {
    const status = statusDoErro(error);
    const recusada = status !== null && status >= 400 && status < 500;
    throw new ErroChavePilarFone(
      recusada
        ? (typeof data?.error === "string" ? data.error : "Chave inválida ou bloqueada")
        : "Não foi possível falar com o servidor. Tente novamente.",
      recusada,
    );
  }

  if (!data?.estabelecimento_id) {
    const mensagem = typeof data?.error === "string" ? data.error : "Chave inválida ou bloqueada";
    throw new ErroChavePilarFone(mensagem, true);
  }

  const ativacao: AtivacaoPilarFone = {
    chave: chaveNormalizada,
    estabelecimentoId: String(data.estabelecimento_id),
    empresa: String(data.empresa ?? ""),
  };
  localStorage.setItem(CHAVE_STORAGE, JSON.stringify(ativacao));
  return ativacao;
}
