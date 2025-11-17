import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Plus, Filter } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type ViewMode = "day" | "week" | "month" | "list" | "table";

interface CalendarioMobileHeaderProps {
  currentDate: Date;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  onNewTask: () => void;
  onShowFilter: () => void;
}

export function CalendarioMobileHeader({
  currentDate,
  viewMode,
  onViewModeChange,
  onPrevious,
  onNext,
  onToday,
  onNewTask,
  onShowFilter
}: CalendarioMobileHeaderProps) {
  return (
    <div className="bg-background/95 backdrop-blur-sm border-b border-border/40 sticky top-0 z-20">
      <div className="px-4 py-3 space-y-3">
        {/* Linha 1: Navegação e Data */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onPrevious}
              className="h-8 w-8 hover:bg-primary/10"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h2 className="text-sm font-medium min-w-[120px] text-center">
              {format(currentDate, viewMode === "month" ? "MMM/yy" : "d MMM", { locale: ptBR })}
            </h2>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onNext}
              className="h-8 w-8 hover:bg-primary/10"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onToday}
              className="h-8 px-3 text-xs font-medium"
            >
              Hoje
            </Button>
            <Select value={viewMode} onValueChange={(v) => onViewModeChange(v as ViewMode)}>
              <SelectTrigger className="w-[90px] h-8 text-xs border-border/40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="day">Dia</SelectItem>
                <SelectItem value="list">Lista</SelectItem>
                <SelectItem value="week">Semana</SelectItem>
                <SelectItem value="month">Mês</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Linha 2: Ações */}
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onShowFilter}
            className="h-8 px-3 gap-2 text-xs"
          >
            <Filter className="w-3.5 h-3.5" />
            Filtros
          </Button>
          <Button
            onClick={onNewTask}
            size="sm"
            className="h-8 px-4 gap-2 text-xs shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Nova Tarefa
          </Button>
        </div>
      </div>
    </div>
  );
}
