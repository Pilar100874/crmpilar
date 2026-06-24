import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wifi, WifiOff, RefreshCw, Loader2 } from "lucide-react";
import { usePontoOfflineQueue } from "./usePontoOfflineQueue";

export function OfflineQueueIndicator() {
  const { queue, online, sincronizando, sincronizar } = usePontoOfflineQueue();
  if (online && queue.length === 0) {
    return (
      <Badge variant="secondary" className="gap-1">
        <Wifi className="h-3 w-3" /> Online
      </Badge>
    );
  }
  return (
    <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-2 py-1">
      {online ? (
        <Wifi className="h-3.5 w-3.5 text-green-600" />
      ) : (
        <WifiOff className="h-3.5 w-3.5 text-orange-600" />
      )}
      <span className="text-xs">
        {online ? "Online" : "Offline"} · {queue.length} pendente(s)
      </span>
      {online && queue.length > 0 && (
        <Button size="sm" variant="ghost" className="h-6 px-2" onClick={sincronizar} disabled={sincronizando}>
          {sincronizando ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
        </Button>
      )}
    </div>
  );
}
