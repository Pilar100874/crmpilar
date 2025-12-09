import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface EmailLoadingBarProps {
  isLoading: boolean;
  progress?: number;
  message?: string;
}

export function EmailLoadingBar({ isLoading, progress = 0, message }: EmailLoadingBarProps) {
  if (!isLoading) return null;

  return (
    <div className="border-b bg-gradient-to-r from-primary/5 to-primary/10 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <Progress value={progress} className="h-2" />
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap min-w-[120px]">
          {message || "Carregando emails..."}
        </span>
      </div>
    </div>
  );
}
