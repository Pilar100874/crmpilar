import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Download, Share, Plus } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const STORAGE_KEY = "pwa-install-prompt-dismissed-at";
const SNOOZE_DAYS = 7;

const isMobileOrTablet = () => {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent || "";
  const uaMobile = /Android|iPhone|iPad|iPod|Mobile|Tablet|Silk|Kindle/i.test(ua);
  const narrow = window.innerWidth <= 1024;
  return uaMobile || narrow;
};

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (window.navigator as any).standalone === true;

const isInIframe = () => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
};

const wasRecentlyDismissed = () => {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (!v) return false;
    const ts = Number(v);
    if (!ts) return false;
    return Date.now() - ts < SNOOZE_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
};

export const PWAInstallPrompt = () => {
  const [open, setOpen] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosMode, setIosMode] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isInIframe()) return;
    if (isStandalone()) return;
    if (!isMobileOrTablet()) return;
    if (wasRecentlyDismissed()) return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setOpen(true);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    // iOS doesn't fire beforeinstallprompt — show manual instructions.
    if (isIOS()) {
      const t = setTimeout(() => {
        setIosMode(true);
        setOpen(true);
      }, 1500);
      return () => {
        clearTimeout(t);
        window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      };
    }

    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {}
    setOpen(false);
  };

  const accept = async () => {
    if (deferred) {
      try {
        await deferred.prompt();
        await deferred.userChoice;
      } catch {}
      setDeferred(null);
    }
    dismiss();
  };

  return (
    <AlertDialog open={open} onOpenChange={(v) => (!v ? dismiss() : setOpen(v))}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Instalar aplicativo
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm">
              <p>
                Deseja instalar a versão de aplicativo da Plataforma Omnicanal? Você terá acesso
                rápido pelo ícone na tela inicial, abertura em tela cheia e melhor desempenho.
              </p>
              {iosMode && (
                <div className="rounded-md border bg-muted/50 p-3 space-y-2">
                  <p className="font-medium text-foreground">Como instalar no iPhone/iPad:</p>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li className="flex items-center gap-1 flex-wrap">
                      Toque em <Share className="inline h-4 w-4" /> Compartilhar na barra do
                      Safari.
                    </li>
                    <li className="flex items-center gap-1 flex-wrap">
                      Escolha <Plus className="inline h-4 w-4" /> "Adicionar à Tela de Início".
                    </li>
                    <li>Confirme tocando em "Adicionar".</li>
                  </ol>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={dismiss}>Agora não</AlertDialogCancel>
          {!iosMode && (
            <AlertDialogAction onClick={accept}>Instalar</AlertDialogAction>
          )}
          {iosMode && <AlertDialogAction onClick={dismiss}>Entendi</AlertDialogAction>}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default PWAInstallPrompt;
