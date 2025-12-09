import { cn } from "@/lib/utils";

interface EmailLoadingBarProps {
  isLoading: boolean;
  progress?: number;
  message?: string;
}

export function EmailLoadingBar({ isLoading, progress = 0, message }: EmailLoadingBarProps) {
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4 p-8">
        <div className="relative w-48 h-1 bg-muted rounded-full overflow-hidden">
          <div 
            className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-sm font-medium text-foreground tabular-nums">
          {Math.round(progress)}%
        </span>
        {message && (
          <span className="text-xs text-muted-foreground">
            {message}
          </span>
        )}
      </div>
    </div>
  );
}
