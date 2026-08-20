import { Loader2, WifiOff } from "lucide-react";

/** Aviso discreto exibido nas telas de TV enquanto o watchdog reconecta/retoma. */
export function TvWatchdogAviso({ mensagem, online }: { mensagem: string | null; online: boolean }) {
  if (!mensagem) return null;
  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-[10000] -translate-x-1/2">
      <div className="flex items-center gap-2 rounded-full bg-background/85 px-4 py-2 text-sm font-medium text-foreground shadow-lg backdrop-blur">
        {online ? <Loader2 className="h-4 w-4 animate-spin" /> : <WifiOff className="h-4 w-4 text-destructive" />}
        <span>{mensagem}</span>
      </div>
    </div>
  );
}

export default TvWatchdogAviso;
