import { useCallback, useEffect, useState } from "react";

/** Preferência local do usuário: mostrar ou não o botão do Assistente Pilar (comandos por voz). */
const CHAVE = "pilar_assistente_voz_ativo";
const EVENTO = "pilar-assistente-voz-mudou";

export function lerAssistenteVozAtivo(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(CHAVE) !== "0";
}

export function definirAssistenteVozAtivo(ativo: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CHAVE, ativo ? "1" : "0");
  window.dispatchEvent(new CustomEvent(EVENTO, { detail: ativo }));
}

export function useAssistenteVozAtivo(): [boolean, (ativo: boolean) => void] {
  const [ativo, setAtivo] = useState<boolean>(() => lerAssistenteVozAtivo());

  useEffect(() => {
    const sincronizar = () => setAtivo(lerAssistenteVozAtivo());
    window.addEventListener(EVENTO, sincronizar);
    window.addEventListener("storage", sincronizar);
    return () => {
      window.removeEventListener(EVENTO, sincronizar);
      window.removeEventListener("storage", sincronizar);
    };
  }, []);

  const alterar = useCallback((valor: boolean) => {
    definirAssistenteVozAtivo(valor);
    setAtivo(valor);
  }, []);

  return [ativo, alterar];
}
