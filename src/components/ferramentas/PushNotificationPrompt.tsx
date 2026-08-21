import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bell, X } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export function PushNotificationPrompt() {
  const { isSupported, permission, requestPermission } = usePushNotifications();
  const [dismissed, setDismissed] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isSupported || permission !== "default") return;
    const wasDismissed = localStorage.getItem("push-prompt-dismissed");
    if (wasDismissed) return;
    // Show after a short delay
    const timer = setTimeout(() => setShow(true), 3000);
    return () => clearTimeout(timer);
  }, [isSupported, permission]);

  if (!show || dismissed || permission !== "default") return null;

  const handleAllow = async () => {
    await requestPermission();
    setShow(false);
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShow(false);
    localStorage.setItem("push-prompt-dismissed", "true");
  };

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-6 md:max-w-sm animate-in slide-in-from-bottom-5">
      <div className="rounded-lg border bg-card p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-primary/10 p-2">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-sm">Ativar notificações</h4>
            <p className="text-xs text-muted-foreground mt-1">
              Receba alertas sobre empréstimos vencidos e atualizações importantes.
            </p>
            <div className="flex gap-2 mt-3">
              <Button size="sm" onClick={handleAllow} className="flex-1">
                Permitir
              </Button>
              <Button size="sm" variant="outline" onClick={handleDismiss}>
                Agora não
              </Button>
            </div>
          </div>
          <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
