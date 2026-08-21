import { Clock, CheckCircle2, AlertTriangle, XCircle, Play, ChevronRight, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export type TaskStatus = "pending" | "in_progress" | "completed" | "delayed" | "not_done" | "blocked";

interface Task {
  id: string;
  name: string;
  sector: string;
  sectorColor: string;
  status: TaskStatus;
  estimatedTime: number;
  assignedTo?: string;
  blockedBy?: string; // Name of task blocking this one
}

interface TaskListProps {
  tasks: Task[];
  title: string;
  showAll?: boolean;
}

const statusConfig = {
  pending: {
    icon: Clock,
    label: "Pendente",
    bgColor: "bg-muted",
    textColor: "text-muted-foreground",
  },
  in_progress: {
    icon: Play,
    label: "Em Execução",
    bgColor: "bg-primary/10",
    textColor: "text-primary",
  },
  completed: {
    icon: CheckCircle2,
    label: "Concluída",
    bgColor: "bg-success/10",
    textColor: "text-success",
  },
  delayed: {
    icon: AlertTriangle,
    label: "Atrasada",
    bgColor: "bg-warning/10",
    textColor: "text-warning",
  },
  not_done: {
    icon: XCircle,
    label: "Não Realizada",
    bgColor: "bg-critical/10",
    textColor: "text-critical",
  },
  blocked: {
    icon: Lock,
    label: "Bloqueada",
    bgColor: "bg-muted",
    textColor: "text-muted-foreground",
  },
};

export function TaskList({ tasks, title, showAll = false }: TaskListProps) {
  // Sort tasks: in_progress first, then pending, then blocked, then completed
  const sortedTasks = [...tasks].sort((a, b) => {
    const order: Record<TaskStatus, number> = {
      in_progress: 0,
      delayed: 1,
      pending: 2,
      blocked: 3,
      completed: 4,
      not_done: 5,
    };
    return order[a.status] - order[b.status];
  });

  const displayTasks = showAll ? sortedTasks : sortedTasks.slice(0, 5);

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        {!showAll && tasks.length > 5 && (
          <Link to="/operacional/tasks">
            <Button variant="ghost" size="sm" className="text-primary">
              Ver todas
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        )}
      </div>
      <div className="space-y-2">
        {displayTasks.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Nenhuma tarefa encontrada
          </p>
        ) : (
          displayTasks.map((task) => {
            const config = statusConfig[task.status];
            const Icon = config.icon;
            const isBlocked = task.status === "blocked";

            return (
              <Link
                key={task.id}
                to={isBlocked ? "#" : `/tasks/${task.id}`}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-xl transition-colors",
                  isBlocked 
                    ? "bg-muted/20 opacity-60 cursor-not-allowed" 
                    : "bg-muted/30 hover:bg-muted/50"
                )}
                onClick={(e) => isBlocked && e.preventDefault()}
              >
                <div
                  className="h-10 w-1 rounded-full flex-shrink-0"
                  style={{ backgroundColor: isBlocked ? "#9ca3af" : task.sectorColor }}
                />
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "font-medium truncate",
                    isBlocked ? "text-muted-foreground" : "text-foreground"
                  )}>
                    {task.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {isBlocked && task.blockedBy 
                      ? `Aguardando: ${task.blockedBy}`
                      : `${task.sector} • ${task.estimatedTime} min`
                    }
                  </p>
                </div>
                <div className={cn(
                  "p-2 rounded-lg flex items-center gap-2",
                  config.bgColor, config.textColor
                )}>
                  <Icon className="h-4 w-4" />
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
