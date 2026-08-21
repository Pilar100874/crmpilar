import { Trophy, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserProductivity {
  id: string;
  name: string;
  completedTasks: number;
  avgTimeEfficiency: number; // percentage - 100 means exact, >100 means faster, <100 means slower
  avatar?: string;
}

interface ProductivityRankingProps {
  users: UserProductivity[];
  loading?: boolean;
}

export function ProductivityRanking({ users, loading }: ProductivityRankingProps) {
  const sortedUsers = [...users].sort((a, b) => {
    // Sort by efficiency first, then by completed tasks
    if (b.avgTimeEfficiency !== a.avgTimeEfficiency) {
      return b.avgTimeEfficiency - a.avgTimeEfficiency;
    }
    return b.completedTasks - a.completedTasks;
  });

  const getEfficiencyIcon = (efficiency: number) => {
    if (efficiency >= 110) return <TrendingUp className="h-4 w-4 text-success" />;
    if (efficiency <= 90) return <TrendingDown className="h-4 w-4 text-critical" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 110) return "text-success";
    if (efficiency >= 100) return "text-foreground";
    if (efficiency >= 90) return "text-warning";
    return "text-critical";
  };

  const getMedalColor = (position: number) => {
    switch (position) {
      case 0: return "bg-yellow-500";
      case 1: return "bg-muted-foreground";
      case 2: return "bg-amber-700";
      default: return "bg-muted";
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 lg:p-6">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="h-5 w-5 text-yellow-500" />
        <h3 className="text-lg font-semibold">Ranking de Produtividade</h3>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-8">
          <Trophy className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Sem dados de produtividade ainda
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedUsers.slice(0, 5).map((user, index) => (
            <div
              key={user.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg transition-colors",
                index === 0 ? "bg-yellow-500/10 border border-yellow-500/30" : "bg-muted/50"
              )}
            >
              {/* Position */}
              <div
                className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold text-primary-foreground flex-shrink-0",
                  getMedalColor(index)
                )}
              >
                {index + 1}
              </div>

              {/* User info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground">
                  {user.completedTasks} tarefas concluídas
                </p>
              </div>

              {/* Efficiency */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {getEfficiencyIcon(user.avgTimeEfficiency)}
                <span className={cn("text-sm font-mono font-bold", getEfficiencyColor(user.avgTimeEfficiency))}>
                  {user.avgTimeEfficiency}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
          Eficiência = (Tempo Estimado ÷ Tempo Real) × 100
        </p>
      </div>
    </div>
  );
}
