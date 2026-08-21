import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CloudRain, CloudOff, Play, LogOut, Loader2 } from "lucide-react";
import { useShiftStatus } from "@/hooks/operacional-hub/useShiftStatus";
import { useWeatherCondition } from "@/hooks/operacional-hub/useWeatherCondition";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export function ShiftAndWeatherControl() {
  const { isCheckedIn, checkInTime, loading: shiftLoading, checkIn, checkOut } = useShiftStatus();
  const { isRaining, loading: weatherLoading, toggleRain } = useWeatherCondition();
  const { toast } = useToast();
  
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleCheckIn = async () => {
    setActionLoading("checkin");
    const { error } = await checkIn();
    setActionLoading(null);
    
    if (error) {
      toast({ title: "Erro", description: error, variant: "destructive" });
    } else {
      toast({ title: "Turno iniciado!", description: "Bom trabalho!" });
    }
  };

  const handleCheckOut = async () => {
    setActionLoading("checkout");
    const { error } = await checkOut();
    setActionLoading(null);
    
    if (error) {
      toast({ title: "Erro", description: error, variant: "destructive" });
    } else {
      toast({ title: "Turno encerrado", description: "Até a próxima!" });
    }
  };

  const handleToggleRain = async () => {
    setActionLoading("rain");
    const { error } = await toggleRain();
    setActionLoading(null);
    
    if (error) {
      toast({ title: "Erro", description: error, variant: "destructive" });
    } else {
      toast({ 
        title: isRaining ? "Chuva desativada" : "Chuva ativada",
        description: isRaining 
          ? "Tarefas externas liberadas" 
          : "Tarefas externas bloqueadas automaticamente"
      });
    }
  };

  if (shiftLoading || weatherLoading) {
    return (
      <div className="flex gap-3">
        <div className="h-12 w-40 bg-muted animate-pulse rounded-xl" />
        <div className="h-12 w-40 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      {/* Shift Control */}
      {!isCheckedIn ? (
        <Button
          size="lg"
          onClick={handleCheckIn}
          disabled={actionLoading === "checkin"}
          className="gap-2 bg-success hover:bg-success/90 text-success-foreground"
        >
          {actionLoading === "checkin" ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Play className="h-5 w-5" />
          )}
          Iniciar Turno
        </Button>
      ) : (
        <div className="flex items-center gap-2">
          <div className="px-4 py-2 rounded-xl bg-success/10 border border-success/30">
            <p className="text-sm font-medium text-success">
              Turno iniciado às{" "}
              {checkInTime && format(new Date(checkInTime), "HH:mm", { locale: ptBR })}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCheckOut}
            disabled={actionLoading === "checkout"}
            className="gap-1"
          >
            {actionLoading === "checkout" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
            Encerrar
          </Button>
        </div>
      )}

      {/* Weather Control */}
      <Button
        size="lg"
        variant={isRaining ? "default" : "outline"}
        onClick={handleToggleRain}
        disabled={actionLoading === "rain"}
        className={cn(
          "gap-2 transition-all",
          isRaining && "bg-primary hover:bg-primary/90 text-primary-foreground"
        )}
      >
        {actionLoading === "rain" ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : isRaining ? (
          <CloudRain className="h-5 w-5" />
        ) : (
          <CloudOff className="h-5 w-5" />
        )}
        {isRaining ? "Chuva Ativa" : "Sem Chuva"}
      </Button>
    </div>
  );
}
