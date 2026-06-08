import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { captureInitialVersion, hasNewVersion, forceUpdatePWA, isStandalonePWA } from "@/lib/pwaUpdate";

// Só roda em produção e em modo PWA standalone (evita falsos positivos no dev/preview do Lovable,
// onde o index.html muda a cada request por causa do Vite/HMR).
const ENABLED = import.meta.env.PROD && typeof window !== "undefined";

// Intervalo de checagem: 2 minutos
const CHECK_INTERVAL_MS = 2 * 60 * 1000;

export default function PWAUpdateNotifier() {
  const notifiedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    const notify = () => {
      if (notifiedRef.current) return;
      notifiedRef.current = true;
      toast("Nova versão disponível", {
        description: "Atualize para receber as últimas melhorias do sistema.",
        duration: Infinity,
        action: {
          label: "Atualizar agora",
          onClick: () => forceUpdatePWA(),
        },
      });
    };

    const check = async () => {
      if (cancelled) return;
      try {
        if (await hasNewVersion()) notify();
      } catch {}
    };

    (async () => {
      await captureInitialVersion();
      // Escuta evento manual disparado pelo menu
      window.addEventListener("pwa-force-update", forceUpdatePWA as EventListener);
      // Checa quando a aba volta ao foco
      const onVisible = () => {
        if (document.visibilityState === "visible") check();
      };
      document.addEventListener("visibilitychange", onVisible);
      // Checa periodicamente
      timer = window.setInterval(check, CHECK_INTERVAL_MS);
      // Primeira checagem após 30s
      window.setTimeout(check, 30_000);

      return () => {
        document.removeEventListener("visibilitychange", onVisible);
        window.removeEventListener("pwa-force-update", forceUpdatePWA as EventListener);
      };
    })();

    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
    };
  }, []);

  return null;
}
