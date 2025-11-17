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
    <div className="space-y-2 p-3 border-b border-border bg-card">
      {/* Linha 1: Título + View Selector */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">CALENDÁRIO</h1>
        <Select value={viewMode} onValueChange={(v) => onViewModeChange(v as ViewMode)}>
          <SelectTrigger className="w-[100px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Dia</SelectItem>
            <SelectItem value="list">Lista</SelectItem>
            <SelectItem value="week">Semana</SelectItem>
            <SelectItem value="month">Mês</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Linha 2: Navegação */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={onPrevious}
            className="h-8 w-8"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onToday}
            className="text-xs h-8 px-2"
          >
            Hoje
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={onNext}
            className="h-8 w-8"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={onShowFilter}
            className="h-8 w-8"
          >
            <Filter className="w-4 h-4" />
          </Button>
          <Button
            onClick={onNewTask}
            size="icon"
            className="h-8 w-8"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Linha 3: Data */}
      <div className="text-center">
        <h2 className="text-sm font-semibold">
          {format(currentDate, viewMode === "month" ? "MMMM/yy" : "d MMM yyyy", { locale: ptBR })}
        </h2>
      </div>
    </div>
  );
}
