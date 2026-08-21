import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, X, Smartphone, Share, MoreVertical } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);

  useEffect(() => {
    // Check if mobile or tablet device - use multiple signals
    const checkMobileOrTablet = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      
      // User agent patterns for mobile/tablet
      const mobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet|silk|kindle|playbook/i.test(userAgent);
      
      // Screen size check (tablets typically <= 1024px width)
      const isSmallScreen = window.innerWidth <= 1024;
      
      // Touch capability check
      const hasTouchScreen = 'ontouchstart' in window || 
                             navigator.maxTouchPoints > 0 || 
                             (navigator as any).msMaxTouchPoints > 0;
      
      // Consider it mobile/tablet if:
      // 1. User agent clearly indicates mobile/tablet, OR
      // 2. Small screen (regardless of touch), OR  
      // 3. Has touch capability on reasonable screen size
      const isMobile = mobileUA || isSmallScreen || (hasTouchScreen && window.innerWidth <= 1366);
      
      console.log("PWA: Device detection details", {
        userAgent: userAgent.substring(0, 100),
        mobileUA,
        isSmallScreen,
        hasTouchScreen,
        screenWidth: window.innerWidth,
        result: isMobile
      });
      
      return isMobile;
    };

    const isMobileDevice = checkMobileOrTablet();
    setIsMobileOrTablet(isMobileDevice);
    
    console.log("PWA: Device type check", { 
      isMobileDevice, 
      screenWidth: window.innerWidth,
      hasTouchScreen: 'ontouchstart' in window || navigator.maxTouchPoints > 0
    });

    // Don't show on large desktop screens without touch
    if (!isMobileDevice) {
      console.log("PWA: Desktop detected, not showing prompt");
      return;
    }

    // Check if already installed (standalone mode)
    const standaloneMedia = window.matchMedia("(display-mode: standalone)");
    const isInStandaloneMode = standaloneMedia.matches || (window.navigator as any).standalone === true;
    setIsStandalone(isInStandaloneMode);

    if (isInStandaloneMode) {
      console.log("PWA: App is already installed, not showing prompt");
      return;
    }

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iOS);

    // Check if dismissed recently (24 hours)
    const dismissedAt = localStorage.getItem("pwa-prompt-dismissed");
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      const hoursSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60);
      if (hoursSinceDismissed < 24) {
        console.log("PWA: Prompt was recently dismissed, not showing");
        return;
      }
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstall = (e: BeforeInstallPromptEvent) => {
      console.log("PWA: beforeinstallprompt event fired!");
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // For iOS or if event doesn't fire after timeout, show manual instructions
    const timer = setTimeout(() => {
      if (iOS) {
        console.log("PWA: iOS detected, showing manual install instructions");
        setShowPrompt(true);
      } else {
        // Check if we should show anyway (for browsers that support PWA but event didn't fire)
        console.log("PWA: Timeout reached, checking if should show prompt");
        // Only show if not dismissed
        if (!dismissedAt || (Date.now() - parseInt(dismissedAt, 10)) > 3600000) {
          setShowPrompt(true);
        }
      }
    }, 3000);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      console.log("PWA: No deferred prompt available");
      return;
    }

    console.log("PWA: Triggering install prompt");
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log("PWA: User choice:", outcome);

    if (outcome === "accepted") {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    console.log("PWA: User dismissed prompt");
    setShowPrompt(false);
    localStorage.setItem("pwa-prompt-dismissed", Date.now().toString());
  };

  // Clear dismissal for testing
  const handleResetDismissal = () => {
    localStorage.removeItem("pwa-prompt-dismissed");
    window.location.reload();
  };

  // Don't show on desktop or if already installed
  if (!isMobileOrTablet || isStandalone || !showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-in slide-in-from-bottom duration-300">
      <Card className="mx-auto max-w-md border-primary/20 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Smartphone className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm">Instalar Pilar Ferramentas</h3>
              {isIOS ? (
                <p className="text-xs text-muted-foreground mt-1">
                  Toque em <Share className="inline h-3 w-3 mx-0.5" /> e depois em{" "}
                  <span className="font-medium">"Adicionar à Tela Inicial"</span>
                </p>
              ) : deferredPrompt ? (
                <p className="text-xs text-muted-foreground mt-1">
                  Instale o app para acesso rápido e funcionamento offline
                </p>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">
                  Use o menu do navegador <MoreVertical className="inline h-3 w-3 mx-0.5" /> e selecione{" "}
                  <span className="font-medium">"Instalar app"</span> ou{" "}
                  <span className="font-medium">"Adicionar à tela inicial"</span>
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {!isIOS && deferredPrompt && (
            <div className="mt-3 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={handleDismiss}
              >
                Agora não
              </Button>
              <Button
                size="sm"
                className="flex-1"
                onClick={handleInstall}
              >
                <Download className="mr-2 h-4 w-4" />
                Instalar
              </Button>
            </div>
          )}

          {isIOS && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-muted p-2 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="flex h-6 w-6 items-center justify-center rounded bg-background">
                  <Share className="h-3.5 w-3.5 text-primary" />
                </span>
                <span>→</span>
                <span className="flex h-6 w-6 items-center justify-center rounded bg-background">
                  <MoreVertical className="h-3.5 w-3.5" />
                </span>
                <span>→</span>
                <span className="font-medium">Tela Inicial</span>
              </div>
            </div>
          )}

          {!isIOS && !deferredPrompt && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-muted p-2 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="flex h-6 w-6 items-center justify-center rounded bg-background">
                  <MoreVertical className="h-3.5 w-3.5" />
                </span>
                <span>→</span>
                <span className="font-medium">"Instalar app"</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
