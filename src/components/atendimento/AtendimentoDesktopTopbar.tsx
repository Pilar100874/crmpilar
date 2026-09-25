import { CalendarDays, Clock3, Plus, Search, SlidersHorizontal } from "lucide-react";
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
    <header className="shrink-0 border-b border-border bg-card shadow-sm">
      <div className="flex h-16 items-center gap-4 px-5">
        <div className="flex min-w-0 items-baseline gap-3">
          <h1 className="truncate text-2xl font-bold text-foreground">Minha agenda</h1>
          <span className="hidden border-l border-border pl-4 text-sm font-medium text-foreground xl:inline">
            {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="relative hidden w-80 lg:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Buscar contatos, empresas, conversas..."
              className="h-10 border-border bg-muted/30 pl-9 shadow-none"
            />
          </div>
          <Button variant="outline" size="icon" className="hidden h-10 w-10 lg:inline-flex" title="Filtros">
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
          <Button onClick={onSchedule} className="h-10 gap-2 px-5 shadow-sm">
            <Plus className="h-4 w-4" />
            Agendar
          </Button>
        </div>
      </div>

      <div className="grid h-[68px] grid-cols-7 border-t border-border/60 px-3">
        <button
          type="button"
          onClick={() => onSelectDate(new Date())}
          className="flex min-w-0 items-center justify-between border-r border-border px-4 text-left transition-colors hover:bg-muted/50"
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
                "relative flex min-w-0 items-center justify-between border-r border-border px-4 text-left transition-colors last:border-r-0 hover:bg-muted/50 after:absolute after:inset-x-4 after:bottom-0 after:h-0.5 after:bg-transparent",
                selected && "bg-primary/10 after:bg-primary",
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