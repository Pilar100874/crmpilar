import { CalendarDays, Clock3, Plus, Search } from "lucide-react";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface AtendimentoDesktopTopbarProps {
  selectedDate: Date;
  counts: Record<string, number>;
  overdueCount: number;
  search: string;
  onSearchChange: (value: string) => void;
  onSelectDate: (date: Date) => void;
  onSchedule: () => void;
}

export function AtendimentoDesktopTopbar({
  selectedDate,
  counts,
  overdueCount,
  search,
  onSearchChange,
  onSelectDate,
  onSchedule,
}: AtendimentoDesktopTopbarProps) {
  const days = Array.from({ length: 6 }, (_, index) => addDays(new Date(), index));

  return (
    <header className="shrink-0 border-b border-border bg-card">
      <div className="flex h-14 items-center gap-4 px-4">
        <div className="flex min-w-0 items-baseline gap-3">
          <h1 className="truncate text-xl font-bold text-foreground">Minha agenda</h1>
          <span className="hidden text-sm text-muted-foreground xl:inline">
            {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="relative hidden w-72 lg:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Buscar contatos, empresas, conversas..."
              className="h-9 bg-muted/40 pl-9"
            />
          </div>
          <Button onClick={onSchedule} className="h-9 gap-2 px-4">
            <Plus className="h-4 w-4" />
            Agendar
          </Button>
        </div>
      </div>

      <div className="grid h-[66px] grid-cols-7 border-t border-border/60 px-3">
        <button
          type="button"
          onClick={() => onSelectDate(new Date())}
          className="flex min-w-0 items-center justify-between border-r border-border px-3 text-left transition-colors hover:bg-muted/50"
        >
          <span>
            <span className="block text-[11px] font-medium text-muted-foreground">Atrasados</span>
            <span className="block text-lg font-bold text-destructive">{overdueCount}</span>
          </span>
          <Clock3 className="h-4 w-4 text-destructive" />
        </button>
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const selected = format(selectedDate, "yyyy-MM-dd") === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDate(day)}
              className={cn(
                "flex min-w-0 items-center justify-between border-r border-border px-3 text-left transition-colors last:border-r-0 hover:bg-muted/50",
                selected && "bg-primary/10",
              )}
            >
              <span className="min-w-0">
                <span className={cn("block truncate text-[11px] font-medium text-muted-foreground", selected && "text-primary")}>{indexLabel(day)}</span>
                <span className="block text-lg font-bold text-foreground">{counts[key] || 0}</span>
              </span>
              <CalendarDays className={cn("h-4 w-4 text-muted-foreground", selected && "text-primary")} />
            </button>
          );
        })}
      </div>
    </header>
  );
}

function indexLabel(day: Date) {
  const today = format(new Date(), "yyyy-MM-dd") === format(day, "yyyy-MM-dd");
  if (today) return `Hoje · ${format(day, "dd")}`;
  return format(day, "EEE · dd", { locale: ptBR });
}