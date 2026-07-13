import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Botão flutuante que abre a rota atual em uma nova aba com `?solo=1`,
 * fazendo com que os layouts principais ocultem menus/sidebar,
 * permitindo abrir várias telas ao mesmo tempo.
 *
 * Fica oculto quando já estamos em modo "solo".
 */
export function isSoloMode(): boolean {
  if (typeof window === "undefined") return false;
  const p = new URLSearchParams(window.location.search);
  return p.get("solo") === "1" || !!p.get("fromtela");
}

function isNoTabMode(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("notab") === "1";
}

export default function OpenInNewTabButton() {
  if (isSoloMode() || isNoTabMode()) return null;

  const abrirNovaAba = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("solo", "1");
    window.open(url.toString(), "_blank", "noopener,noreferrer");
  };

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={abrirNovaAba}
            aria-label="Abrir esta tela em uma nova aba"
            className="fixed bottom-4 right-4 z-[1000] h-10 w-10 rounded-full shadow-lg bg-background/95 backdrop-blur border-border hover:bg-accent"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">
          Abrir em nova aba (sem menu)
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
