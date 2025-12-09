import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Mail, RefreshCw, CheckCircle2, Loader2, CloudDownload, Inbox } from "lucide-react";
import { useEffect, useState } from "react";

interface EmailLoadingBarProps {
  isLoading: boolean;
  progress?: number;
  message?: string;
  currentCount?: number;
  totalCount?: number;
}

const loadingStages = [
  { icon: CloudDownload, text: "Conectando ao servidor de email...", color: "text-blue-500" },
  { icon: RefreshCw, text: "Sincronizando mensagens...", color: "text-amber-500" },
  { icon: Mail, text: "Baixando emails...", color: "text-primary" },
  { icon: Inbox, text: "Organizando caixa de entrada...", color: "text-green-500" },
];

export function EmailLoadingBar({ 
  isLoading, 
  progress = 0, 
  message,
  currentCount = 0,
  totalCount = 0
}: EmailLoadingBarProps) {
  const [currentStage, setCurrentStage] = useState(0);
  const [dots, setDots] = useState("");

  useEffect(() => {
    if (!isLoading) {
      setCurrentStage(0);
      setDots("");
      return;
    }

    // Animate dots
    const dotsInterval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? "" : prev + ".");
    }, 500);

    // Progress through stages based on progress percentage
    if (progress < 25) setCurrentStage(0);
    else if (progress < 50) setCurrentStage(1);
    else if (progress < 75) setCurrentStage(2);
    else setCurrentStage(3);

    return () => clearInterval(dotsInterval);
  }, [isLoading, progress]);

  if (!isLoading) return null;

  const stage = loadingStages[currentStage];
  const StageIcon = stage.icon;

  return (
    <div className="border-b bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 px-4 py-4">
      <div className="flex flex-col gap-3">
        {/* Header with icon and message */}
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex items-center justify-center w-10 h-10 rounded-full bg-background shadow-sm",
            "animate-pulse"
          )}>
            <StageIcon className={cn("h-5 w-5", stage.color)} />
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className={cn("text-sm font-medium", stage.color)}>
                {message || stage.text}{dots}
              </span>
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            </div>
            
            {totalCount > 0 && (
              <span className="text-xs text-muted-foreground">
                {currentCount} de {totalCount} emails processados
              </span>
            )}
          </div>

          {/* Progress percentage */}
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-primary">
              {Math.round(progress)}%
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="relative">
          <Progress value={progress} className="h-2" />
          
          {/* Stage indicators */}
          <div className="flex justify-between mt-2">
            {loadingStages.map((s, index) => {
              const IconComponent = s.icon;
              const isActive = index === currentStage;
              const isComplete = index < currentStage;
              
              return (
                <div 
                  key={index}
                  className={cn(
                    "flex items-center gap-1 text-xs transition-all duration-300",
                    isActive && "text-primary font-medium scale-105",
                    isComplete && "text-green-500",
                    !isActive && !isComplete && "text-muted-foreground/50"
                  )}
                >
                  {isComplete ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <IconComponent className={cn(
                      "h-3 w-3",
                      isActive && "animate-bounce"
                    )} />
                  )}
                  <span className="hidden sm:inline">
                    {index === 0 && "Conectar"}
                    {index === 1 && "Sincronizar"}
                    {index === 2 && "Baixar"}
                    {index === 3 && "Organizar"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}