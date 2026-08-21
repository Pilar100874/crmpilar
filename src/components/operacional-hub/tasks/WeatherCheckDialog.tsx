import { useState } from "react";
import { CloudRain, Sun, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWeatherCondition } from "@/hooks/useWeatherCondition";
import { useToast } from "@/hooks/use-toast";

interface WeatherCheckDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function WeatherCheckDialog({ open, onConfirm, onCancel }: WeatherCheckDialogProps) {
  const { isRaining, toggleRain } = useWeatherCondition();
  const { toast } = useToast();
  const [updating, setUpdating] = useState(false);

  if (!open) return null;

  const handleChoice = async (raining: boolean) => {
    // Only toggle if the current state differs from the choice
    if (raining !== isRaining) {
      setUpdating(true);
      const result = await toggleRain();
      setUpdating(false);
      if (result.error) {
        toast({ title: "Erro", description: "Não foi possível atualizar o clima", variant: "destructive" });
        return;
      }
    }
    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-sm mx-4 rounded-2xl bg-card border border-border shadow-2xl p-6 space-y-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <CloudRain className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-foreground">Como está o tempo?</h2>
          <p className="text-sm text-muted-foreground">
            Isso ajuda a organizar suas tarefas do dia
          </p>
        </div>

        {updating ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleChoice(false)}
              className={cn(
                "flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all active:scale-95",
                !isRaining 
                  ? "border-success bg-success/10" 
                  : "border-border bg-card hover:border-success/50 hover:bg-success/5"
              )}
            >
              <Sun className="h-10 w-10 text-amber-500" />
              <span className="text-base font-bold text-foreground">Sem chuva</span>
            </button>

            <button
              onClick={() => handleChoice(true)}
              className={cn(
                "flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all active:scale-95",
                isRaining 
                  ? "border-blue-500 bg-blue-500/10" 
                  : "border-border bg-card hover:border-blue-500/50 hover:bg-blue-500/5"
              )}
            >
              <CloudRain className="h-10 w-10 text-blue-500" />
              <span className="text-base font-bold text-foreground">Chovendo</span>
            </button>
          </div>
        )}

        <button
          onClick={onCancel}
          className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
        >
          Voltar
        </button>
      </div>
    </div>
  );
}
