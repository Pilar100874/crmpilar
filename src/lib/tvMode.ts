import { useEffect, useState } from "react";
import { getTvDeviceToken } from "@/lib/tvDeviceClient";

const STORAGE_KEY = "tv_mode_forcado";

/** Detecta se a tela deve rodar em "Modo TV" (TV Box / totem). */
export function isTvMode(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  if (params.get("tv") === "0") return false;
  if (getTvDeviceToken()) return true;
  if (params.get("tv") === "1" || params.get("kiosk") === "1") return true;
  try {
    if (localStorage.getItem(STORAGE_KEY) === "1") return true;
  } catch {
    /* storage indisponível */
  }
  // Android TV Box / navegadores de TV
  const ua = navigator.userAgent.toLowerCase();
  return /smart-?tv|smarttv|googletv|android tv|aft|hbbtv|netcast|web0s|tizen|crkey/.test(ua);
}

/** Liga/desliga o modo TV manualmente (persistido no dispositivo). */
export function setTvModeForcado(ativo: boolean) {
  try {
    if (ativo) localStorage.setItem(STORAGE_KEY, "1");
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Aplica o Modo TV: esconde controles de saída (via classe global),
 * remove o cursor, bloqueia scroll/zoom e mantém a tela acesa.
 * Retorna se o modo está ativo para esconder botões no JSX.
 */
export function useTvMode(): boolean {
  const [tv] = useState(() => isTvMode());

  useEffect(() => {
    if (!tv) return;
    const root = document.documentElement;
    root.classList.add("tv-mode");
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Mantém a tela acesa em TV Box quando suportado
    let wakeLock: any = null;
    const pedirWakeLock = async () => {
      try {
        wakeLock = await (navigator as any).wakeLock?.request("screen");
      } catch {
        /* sem suporte */
      }
    };
    pedirWakeLock();
    const onVisibility = () => {
      if (document.visibilityState === "visible") pedirWakeLock();
    };
    document.addEventListener("visibilitychange", onVisibility);

    // Evita sair da tela por gestos/atalhos comuns em TV Box
    const blockKeys = (e: KeyboardEvent) => {
      if (e.key === "Backspace" && !(e.target as HTMLElement)?.closest("input,textarea")) {
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", blockKeys);

    return () => {
      root.classList.remove("tv-mode");
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("keydown", blockKeys);
      try {
        wakeLock?.release?.();
      } catch {
        /* ignore */
      }
    };
  }, [tv]);

  return tv;
}
