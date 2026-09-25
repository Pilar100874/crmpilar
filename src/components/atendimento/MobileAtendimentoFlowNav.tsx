import { CalendarDays, CalendarCheck, ContactRound, MessagesSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type MobileFlowView = "agenda" | "atendimento" | "cadastro" | "finalizacao";

interface MobileAtendimentoFlowNavProps {
  activeView: MobileFlowView;
  hasContact: boolean;
  pendingCount: number;
  onNavigate: (view: MobileFlowView) => void;
}

const items = [
  { id: "agenda" as const, label: "Agenda", icon: CalendarDays },
  { id: "atendimento" as const, label: "Atendimento", icon: MessagesSquare },
  { id: "cadastro" as const, label: "Cadastro", icon: ContactRound },
  { id: "finalizacao" as const, label: "Finalização", icon: CalendarCheck },
];

export function MobileAtendimentoFlowNav({ activeView, hasContact, pendingCount, onNavigate }: MobileAtendimentoFlowNavProps) {
  return (
    <nav className="shrink-0 border-t border-border bg-card/95 px-1 pb-safe backdrop-blur-sm" aria-label="Fluxo do atendimento">
      <div className="grid grid-cols-4">
        {items.map(({ id, label, icon: Icon }) => {
          const disabled = id !== "agenda" && !hasContact;
          return (
            <Button
              key={id}
              type="button"
              variant="ghost"
              disabled={disabled}
              onClick={() => onNavigate(id)}
              className={cn(
                "relative h-14 min-w-0 flex-col gap-1 rounded-none px-1 text-[10px]",
                activeView === id ? "bg-primary/10 text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="truncate">{label}</span>
              {id === "agenda" && pendingCount > 0 && (
                <span className="absolute right-[20%] top-1.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                  {pendingCount > 99 ? "99+" : pendingCount}
                </span>
              )}
            </Button>
          );
        })}
      </div>
    </nav>
  );
}
