import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "primary" | "warning" | "success" | "destructive";
}

const variantStyles = {
  default: "bg-card border-border",
  primary: "bg-primary/5 border-primary/20",
  warning: "bg-warning/5 border-warning/20",
  success: "bg-success/5 border-success/20",
  destructive: "bg-destructive/5 border-destructive/20",
};

const iconStyles = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary/10 text-primary",
  warning: "bg-warning/10 text-warning",
  success: "bg-success/10 text-success",
  destructive: "bg-destructive/10 text-destructive",
};

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  variant = "default",
}: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border p-3 transition-all hover:shadow-md md:p-6",
        variantStyles[variant]
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="truncate text-xs font-medium text-muted-foreground md:text-sm">{title}</p>
          <p className="text-2xl font-bold tracking-tight md:text-3xl">{value}</p>
          {description && (
            <p className="truncate text-xs text-muted-foreground">{description}</p>
          )}
          {trend && (
            <p
              className={cn(
                "text-sm font-medium",
                trend.isPositive ? "text-success" : "text-destructive"
              )}
            >
              {trend.isPositive ? "+" : "-"}
              {Math.abs(trend.value)}%
            </p>
          )}
        </div>
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg md:h-12 md:w-12",
            iconStyles[variant]
          )}
        >
          <Icon className="h-4 w-4 md:h-6 md:w-6" />
        </div>
      </div>
    </div>
  );
}
