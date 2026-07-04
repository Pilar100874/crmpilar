import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type Props = {
  /** ISO timestamp da última comunicação bem-sucedida. null = nunca */
  at?: string | null;
  /** Status textual reportado (opcional). Se "erro"/"offline", força cinza mesmo com ping recente. */
  status?: string | null;
  /** Última mensagem de erro (opcional). */
  erro?: string | null;
  /** Rótulo do que está sendo pingado (ex.: "Coletor Desktop", "Dispositivo Android"). */
  label?: string;
  /** Janela em minutos para considerar "online". Padrão 3. */
  onlineMin?: number;
  /** Janela em minutos para "instável". Padrão 15. */
  warnMin?: number;
  /** Mostrar apenas o círculo, sem texto ao lado. */
  dotOnly?: boolean;
  className?: string;
};

function classify(at: string | null | undefined, status: string | null | undefined, onlineMin: number, warnMin: number) {
  if (status && ["erro", "offline", "error"].includes(status.toLowerCase())) return "offline" as const;
  if (!at) return "offline" as const;
  const ago = Date.now() - new Date(at).getTime();
  if (ago < onlineMin * 60_000) return "online" as const;
  if (ago < warnMin * 60_000) return "warn" as const;
  return "offline" as const;
}

export function StatusPingDot({
  at,
  status,
  erro,
  label = "Comunicação",
  onlineMin = 3,
  warnMin = 15,
  dotOnly = false,
  className = "",
}: Props) {
  const state = classify(at, status, onlineMin, warnMin);
  const dot =
    state === "online"
      ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.9)]"
      : state === "warn"
      ? "bg-amber-400"
      : "bg-muted-foreground/40";
  const text =
    state === "online" ? "Online" : state === "warn" ? "Instável" : at ? "Offline" : "Sem contato";
  const when = at ? new Date(at).toLocaleString("pt-BR") : "nunca comunicou";

  const content = (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className={`h-2 w-2 rounded-full ${dot} flex-shrink-0`} />
      {!dotOnly && <span className="text-xs text-muted-foreground">{text}</span>}
    </span>
  );

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <div className="font-semibold">{label}</div>
          <div className="text-muted-foreground">{text} · último contato: {when}</div>
          {erro && <div className="mt-1 text-destructive break-all max-w-[240px]">{erro}</div>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
