// Utilitário para atualizar o app no modo PWA (tablet/celular) sem service worker.
// Estratégia: comparar uma assinatura estável dos assets gerados no index.html.

const VERSION_KEY = "__pwa_version_signature__";
const PENDING_VERSION_KEY = "__pwa_pending_version_signature__";

function buildSignatureFromHtml(html: string): string | null {
  const assetMatches = Array.from(
    html.matchAll(/\/(assets\/[^"'<>\s]+\.(?:js|css))/g),
    (match) => match[1],
  );

  const uniqueAssets = Array.from(new Set(assetMatches)).sort();
  if (uniqueAssets.length > 0) return `assets:${uniqueAssets.join("|")}`;

  // Fallback determinístico: remove trechos que podem variar por request.
  const normalizedHtml = html
    .replace(/\?_=[0-9]+/g, "")
    .replace(/_v=[0-9]+/g, "")
    .replace(/\s+/g, " ")
    .trim();

  let hash = 0;
  for (let i = 0; i < normalizedHtml.length; i++) {
    hash = (hash << 5) - hash + normalizedHtml.charCodeAt(i);
    hash |= 0;
  }
  return `h:${hash}`;
}

async function fetchSignature(): Promise<string | null> {
  try {
    const res = await fetch(`/index.html?_=${Date.now()}`, {
      method: "GET",
      cache: "no-store",
    });
    if (!res.ok) return null;
    const text = await res.text();
    return buildSignatureFromHtml(text);
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
  if (localStorage.getItem(VERSION_KEY)) return;
  const sig = await fetchSignature();
  if (sig) localStorage.setItem(VERSION_KEY, sig);
}

export async function hasNewVersion(): Promise<boolean> {
  const current = localStorage.getItem(VERSION_KEY);
  const latest = await fetchSignature();
  if (!current || !latest) return false;
  const hasChanged = current !== latest;
  if (hasChanged) localStorage.setItem(PENDING_VERSION_KEY, latest);
  return hasChanged;
}

export async function forceUpdatePWA(): Promise<void> {
  try {
    const latest = localStorage.getItem(PENDING_VERSION_KEY) || (await fetchSignature());
    if (latest) localStorage.setItem(VERSION_KEY, latest);
    localStorage.removeItem(PENDING_VERSION_KEY);
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
