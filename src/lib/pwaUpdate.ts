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

function hardReload() {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set("_v", String(Date.now()));
    // location.replace pode ser bloqueado em alguns contextos; tenta múltiplas estratégias.
    window.location.replace(url.toString());
    // Fallback: alguns navegadores móveis ignoram replace dentro de promise async
    setTimeout(() => {
      try {
        window.location.href = url.toString();
      } catch {}
      setTimeout(() => {
        try {
          // @ts-ignore - true força bypass de cache em alguns browsers antigos
          window.location.reload(true);
        } catch {
          window.location.reload();
        }
      }, 300);
    }, 200);
  } catch {
    try {
      window.location.reload();
    } catch {}
  }
}

export async function forceUpdatePWA(): Promise<void> {
  // Dispara o reload com timeout de segurança — se a limpeza demorar/falhar, recarrega assim mesmo.
  const safety = window.setTimeout(() => hardReload(), 4000);
  try {
    try {
      const latest = localStorage.getItem(PENDING_VERSION_KEY) || (await fetchSignature());
      if (latest) localStorage.setItem(VERSION_KEY, latest);
      localStorage.removeItem(PENDING_VERSION_KEY);
    } catch {}

    if ("serviceWorker" in navigator) {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister().catch(() => {})));
      } catch {}
    }
    if ("caches" in window) {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k).catch(() => {})));
      } catch {}
    }
    try {
      sessionStorage.clear();
    } catch {}
  } catch (err) {
    console.warn("[PWA] Falha durante limpeza:", err);
  } finally {
    window.clearTimeout(safety);
    hardReload();
  }
}
