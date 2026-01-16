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
        <div className="flex-1 relative h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {message || "Carregando emails..."}
        </span>
      </div>
    </div>
  );
}
