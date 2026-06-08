// Utilitário para atualizar o app no modo PWA (tablet/celular) sem service worker.
// Estratégia: pegar uma "assinatura" do index.html (ETag/Last-Modified ou hash)
// e comparar periodicamente. Quando muda → notificar/atualizar.

const VERSION_KEY = "__pwa_version_signature__";

async function fetchSignature(): Promise<string | null> {
  try {
    // cache:no-store garante request fresh ao servidor
    const res = await fetch(`/index.html?_=${Date.now()}`, {
      method: "GET",
      cache: "no-store",
    });
    if (!res.ok) return null;
    const etag = res.headers.get("etag");
    const lastMod = res.headers.get("last-modified");
    if (etag || lastMod) return `${etag || ""}|${lastMod || ""}`;
    // Fallback: hash simples do html (assets têm hash no nome, então muda quando há deploy)
    const text = await res.text();
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0;
    }
    return `h:${hash}`;
  } catch {
    return null;
  }
}

export function isStandalonePWA(): boolean {
  if (typeof window === "undefined") return false;
  const mql = window.matchMedia?.("(display-mode: standalone)").matches;
  // iOS Safari
  // @ts-ignore
  const iosStandalone = window.navigator.standalone === true;
  return !!(mql || iosStandalone);
}

export async function captureInitialVersion(): Promise<void> {
  if (sessionStorage.getItem(VERSION_KEY)) return;
  const sig = await fetchSignature();
  if (sig) sessionStorage.setItem(VERSION_KEY, sig);
}

export async function hasNewVersion(): Promise<boolean> {
  const current = sessionStorage.getItem(VERSION_KEY);
  const latest = await fetchSignature();
  if (!current || !latest) return false;
  return current !== latest;
}

export async function forceUpdatePWA(): Promise<void> {
  try {
    // 1) Desregistra qualquer service worker (caso exista)
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister().catch(() => {})));
    }
    // 2) Limpa todos os caches da Cache Storage API
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k).catch(() => {})));
    }
    // 3) Limpa storages voláteis (mantém localStorage com sessão/preferências)
    try {
      sessionStorage.clear();
    } catch {}
  } catch (err) {
    console.warn("[PWA] Falha durante limpeza:", err);
  } finally {
    // 4) Reload forçado bypassando cache
    const url = new URL(window.location.href);
    url.searchParams.set("_v", String(Date.now()));
    window.location.replace(url.toString());
  }
}
