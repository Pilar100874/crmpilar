import { useEffect, useMemo } from "react";

/**
 * Guarda o andamento da vistoria (etapa, dados e fotos) no navegador.
 * Em celulares/tablets a câmera nativa pode descarregar a página; ao voltar,
 * a tela era remontada do zero e o usuário caía na etapa inicial.
 */
const PREFIXO = "vistoria-rascunho:";

export function lerRascunhoVistoria<T>(chave: string): T | null {
  try {
    const bruto = sessionStorage.getItem(PREFIXO + chave);
    return bruto ? (JSON.parse(bruto) as T) : null;
  } catch {
    return null;
  }
}

export function limparRascunhoVistoria(chave: string) {
  try {
    sessionStorage.removeItem(PREFIXO + chave);
  } catch {
    /* ignora */
  }
}

/** Mantém o rascunho salvo enquanto `ativo` for verdadeiro. */
export function useRascunhoVistoria<T>(chave: string, estado: T, ativo: boolean) {
  const serializado = useMemo(() => {
    try {
      return JSON.stringify(estado);
    } catch {
      return "";
    }
  }, [estado]);

  useEffect(() => {
    try {
      if (ativo && serializado) sessionStorage.setItem(PREFIXO + chave, serializado);
      else sessionStorage.removeItem(PREFIXO + chave);
    } catch {
      /* ignora */
    }
  }, [chave, ativo, serializado]);
}
