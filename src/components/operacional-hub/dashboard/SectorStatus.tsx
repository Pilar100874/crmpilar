import { cn } from "@/lib/utils";

interface Sector {
  id: string;
  name: string;
  completed: number;
  total: number;
  color: string;
}

interface SectorStatusProps {
  sectors: Sector[];
}

function getStatusColor(percentage: number): string {
  if (percentage >= 80) return "success";
  if (percentage >= 50) return "warning";
  return "critical";
}

export function SectorStatus({ sectors }: SectorStatusProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 lg:p-6">
      <h3 className="text-lg font-semibold mb-4">Status por Setor</h3>
      <div className="space-y-4">
        {sectors.map((sector) => {
          const percentage = sector.total > 0 
            ? Math.round((sector.completed / sector.total) * 100) 
            : 0;
          const status = getStatusColor(percentage);

          return (
            <div key={sector.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: sector.color }}
                  />
                  <span className="text-sm font-medium">{sector.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {sector.completed}/{sector.total}
                  </span>
                  <div
                    className={cn(
                      "h-3 w-3 rounded-full",
                      status === "success" && "bg-success glow-success",
                      status === "warning" && "bg-warning glow-warning",
                      status === "critical" && "bg-critical glow-critical pulse-critical"
                    )}
                  />
                </div>
              </div>
              <div className="progress-bar">
                <div
                  className={cn(
                    "progress-bar-fill",
                    status === "success" && "bg-success",
                    status === "warning" && "bg-warning",
                    status === "critical" && "bg-critical"
                  )}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
