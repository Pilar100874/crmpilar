import { useEffect, useMemo } from "react";
import { useEtapasPendentes } from "@/contexts/UnsavedChangesContext";

/**
 * Guarda o andamento da vistoria (etapa, dados e fotos) no navegador.
 * Em celulares/tablets a câmera nativa pode descarregar a página; ao voltar,
 * a tela era remontada do zero e o usuário caía na etapa inicial.
 */
const PREFIXO = "vistoria-rascunho:";

export function lerRascunhoVistoria<T>(chave: string): T | null {
  try {
    const bruto = sessionStorage.getItem(PREFIXO + chave);
    if (!bruto) return null;
    const salvo = JSON.parse(bruto);
    // Only a reload on this same screen (e.g. the native camera) resumes it.
    return salvo.rota === window.location.pathname ? salvo.estado as T : null;
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
  useEtapasPendentes(chave, ativo, chave === "cv-entrada" ? "Entrada de veículos" : "Saída de veículos", () => limparRascunhoVistoria(chave));
  useEffect(() => () => limparRascunhoVistoria(chave), [chave]);
  const serializado = useMemo(() => {
    try {
      return JSON.stringify(estado);
    } catch {
      return "";
    }
  }, [estado]);

  useEffect(() => {
    try {
      if (ativo && serializado) sessionStorage.setItem(PREFIXO + chave, JSON.stringify({ rota: window.location.pathname, estado: JSON.parse(serializado) }));
      else sessionStorage.removeItem(PREFIXO + chave);
    } catch {
      /* ignora */
    }
  }, [chave, ativo, serializado]);
}
