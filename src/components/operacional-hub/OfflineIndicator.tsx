import { WifiOff, CloudOff, Loader2, Upload, Camera } from "lucide-react";
import { useOfflineSync } from "@/hooks/operacional-hub/useOfflineSync";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function OfflineIndicator() {
  const { isOnline, pendingCount, syncing, syncQueue } = useOfflineSync();

  if (isOnline && pendingCount === 0) return null;

  return (
    <div
      className={cn(
        "fixed top-14 lg:top-0 left-0 right-0 lg:left-72 z-40 px-4 py-2 flex items-center justify-between gap-2 text-sm font-medium transition-all",
        !isOnline
          ? "bg-destructive/90 text-destructive-foreground"
          : "bg-warning/90 text-warning-foreground"
      )}
    >
      <div className="flex items-center gap-2">
        {!isOnline ? (
          <>
            <WifiOff className="h-4 w-4" />
            <span>Sem conexão — modo offline ativo</span>
          </>
        ) : (
          <>
            <CloudOff className="h-4 w-4" />
            <span>{pendingCount} ação(ões) pendente(s)</span>
          </>
        )}
      </div>

      {isOnline && pendingCount > 0 && (
        <Button
          size="sm"
          variant="secondary"
          className="h-7 text-xs gap-1"
          onClick={() => syncQueue()}
          disabled={syncing}
        >
          {syncing ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Upload className="h-3 w-3" />
          )}
          Sincronizar
        </Button>
      )}
    </div>
  );
}
