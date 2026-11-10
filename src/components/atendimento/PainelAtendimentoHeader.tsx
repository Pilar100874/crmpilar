import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  icon: LucideIcon;
  subtitle?: string;
  actions?: ReactNode;
  onClose?: () => void;
  closeLabel?: string;
  className?: string;
}

export function PainelAtendimentoHeader({ title, icon: Icon, subtitle, actions, onClose, closeLabel = `Fechar ${title}`, className }: Props) {
  return <header data-atendimento-header className={cn("flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border bg-background px-4 py-4 text-foreground sm:px-6", className)}>
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="h-5 w-5" /></span>
      <div className="min-w-0"><h2 className="break-words text-base font-semibold leading-snug">{title}</h2>{subtitle && <p className="mt-0.5 break-words text-xs text-muted-foreground">{subtitle}</p>}</div>
    </div>
    {(actions || onClose) && <div className="flex max-w-full shrink-0 flex-wrap items-center gap-1 [&_button]:shrink-0">{actions}{onClose && <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" title={closeLabel} aria-label={closeLabel} onClick={onClose}><X className="h-4 w-4" /></Button>}</div>}
  </header>;
}