import type { ReactNode } from "react";
import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** Selo de horário padrão dos cartões do Atendimento (mesmo visual da aba Agenda). */
export function AtendimentoHoraBadge({ hora, className }: { hora: string; className?: string }) {
  if (!hora) return null;
  return (
    <Badge
      className={cn(
        "border-0 bg-orange-100 px-1.5 py-0 text-[10px] font-medium text-orange-700 dark:bg-orange-950/40 dark:text-orange-300",
        className,
      )}
    >
      <Clock className="mr-0.5 h-2.5 w-2.5" />
      {hora}
    </Badge>
  );
}

/** Selo secundário (origem, referência) dos cartões do Atendimento. */
export function AtendimentoInfoBadge({ children, className }: { children: ReactNode; className?: string }) {
  if (!children) return null;
  return (
    <Badge variant="outline" className={cn("max-w-full truncate bg-card/50 px-1.5 py-0 text-[10px]", className)}>
      {children}
    </Badge>
  );
}
