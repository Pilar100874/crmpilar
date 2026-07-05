// Registro guardado do Service Worker de Push.
// Nunca ativa em preview/dev do Lovable — só em produção (crmpilar.lovable.app, domínios custom, PWA instalado).

import { supabase } from "@/integrations/supabase/client";

const SW_PATH = "/push-sw.js";
const VAPID_PUBLIC_KEY =
  "BKFM8bfRYOju82ipJX1ZpeFv4qczvBYMS09stglVzaoxaCBFDkJ7Zu_dHHfK-qFHCJ8L6bN3jzkoQ8LvDHUjcHM";

function isRefusedContext(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const host = window.location.hostname;
    const url = new URL(window.location.href);
    if (url.searchParams.get("sw") === "off") return true;
    if (window.self !== window.top) return true; // iframe (Lovable preview)
    if (host.startsWith("id-preview--") || host.startsWith("preview--")) return true;
    if (host.endsWith(".lovableproject.com") || host === "lovableproject.com") return true;
    if (host.endsWith(".lovableproject-dev.com") || host === "lovableproject-dev.com") return true;
    if (host.endsWith(".beta.lovable.dev") || host === "beta.lovable.dev") return true;
    return false;
  } catch {
    return true;
  }
}

function urlB64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const arr = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i);
  return arr;
}

async function unregisterMatching() {
  try {
    if (!("serviceWorker" in navigator)) return;
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      regs
        .filter((r) => (r.active?.scriptURL || "").endsWith(SW_PATH))
        .map((r) => r.unregister().catch(() => {}))
    );
  } catch {}
}

export async function ensurePushServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined") return null;
  if (!("serviceWorker" in navigator)) return null;
  if (isRefusedContext()) {
    await unregisterMatching();
    return null;
  }
  try {
    return await navigator.serviceWorker.register(SW_PATH, { scope: "/" });
  } catch (e) {
    console.warn("[push] falha ao registrar SW", e);
    return null;
  }
}

export function detectPlatform(): "web" | "android" | "ios" {
  const ua = navigator.userAgent || "";
  if (/android/i.test(ua)) return "android";
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  return "web";
}

export async function subscribeToPush(opts: {
  usuarioId?: string | null;
  contatoId?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  if (!("Notification" in window)) return { ok: false, error: "Navegador sem suporte" };
  if (!("PushManager" in window)) return { ok: false, error: "PushManager indisponível" };

  const reg = await ensurePushServiceWorker();
  if (!reg) return { ok: false, error: "Service Worker não pôde ser registrado neste contexto" };

  const perm = await Notification.requestPermission();
  if (perm !== "granted") return { ok: false, error: "Permissão negada" };

  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  const json = sub.toJSON() as any;
  const { error } = await supabase.functions.invoke("push-subscribe", {
    body: {
      usuario_id: opts.usuarioId ?? null,
      contato_id: opts.contatoId ?? null,
      endpoint: sub.endpoint,
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth,
      plataforma: detectPlatform(),
      user_agent: navigator.userAgent,
    },
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function unsubscribeFromPush(): Promise<void> {
  try {
    if (!("serviceWorker" in navigator)) return;
    const reg = await navigator.serviceWorker.getRegistration(SW_PATH);
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      const endpoint = sub.endpoint;
      await sub.unsubscribe();
      await supabase.from("push_subscriptions").update({ ativo: false }).eq("endpoint", endpoint);
    }
  } catch (e) {
    console.warn("[push] unsubscribe falhou", e);
  }
}

export async function pushPermissionStatus(): Promise<"default" | "granted" | "denied" | "unsupported"> {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission as any;
}

export function isPushSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
}
