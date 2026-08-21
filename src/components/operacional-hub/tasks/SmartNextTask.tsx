import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Play, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle, 
  Package, 
  CloudRain,
  Clock,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/operacional-hub/useAuth";

interface SmartTask {
  id: string;
  name: string;
  sectorName: string;
  sectorColor: string;
  priority: number;
  estimatedTime: number;
  hasMaterials: boolean;
  isBlocked: boolean;
  blockReason: string | null;
}

interface ActiveCondition {
  id: string;
  name: string;
  type: string;
  severity: string;
}

export function SmartNextTask() {
  const [nextTask, setNextTask] = useState<SmartTask | null>(null);
  const [alternativeTasks, setAlternativeTasks] = useState<SmartTask[]>([]);
  const [activeConditions, setActiveConditions] = useState<ActiveCondition[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchSmartTask();
      fetchActiveConditions();
    }
  }, [user]);

  const fetchActiveConditions = async () => {
    try {
      const { data } = await supabase
        .from("op_operational_conditions")
        .select("id, name, type, severity")
        .eq("is_active", true)
        .order("severity", { ascending: false });

      if (data) setActiveConditions(data);
    } catch (error) {
      console.error("Error fetching conditions:", error);
    }
  };

  const fetchSmartTask = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];

      // Get tasks with material and condition checks
      const { data: tasks, error } = await supabase
        .from("op_task_executions")
        .select(`
          id, status, priority_score, blocked_by_condition_id,
          task_templates:op_task_templates(
            id, name, estimated_time_minutes, is_outdoor, sector_id,
            sectors:op_sectors(name, color)
          )
        `)
        .eq("scheduled_date", today)
        .in("status", ["pending", "in_progress", "delayed"])
        .or(`assigned_user_id.is.null,assigned_user_id.eq.${user?.id}`)
        .order("priority_score", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(5);

      if (error) throw error;

      if (tasks && tasks.length > 0) {
        // Check materials for each task
        const processedTasks = await Promise.all(
          tasks.map(async (task) => {
            const template = task.task_templates as any;
            
            // Check material availability
            const { data: materialsNeeded } = await supabase
              .from("op_task_template_materials")
              .select(`
                quantity_needed,
                materials:op_materials(current_stock, name)
              `)
              .eq("task_template_id", template?.id);

            const hasMaterials = !materialsNeeded || materialsNeeded.every(
              (m: any) => !m.materials || m.materials.current_stock >= (m.quantity_needed || 1)
            );

            // Check if blocked by condition
            const isBlocked = !!task.blocked_by_condition_id;
            let blockReason = null;

            if (isBlocked) {
              const { data: condition } = await supabase
                .from("op_operational_conditions")
                .select("name")
                .eq("id", task.blocked_by_condition_id)
                .single();
              blockReason = condition?.name || "Condição operacional";
            }

            return {
              id: task.id,
              name: template?.name || "Tarefa",
              sectorName: template?.sectors?.name || "Sem setor",
              sectorColor: template?.sectors?.color || "#3b82f6",
              priority: task.priority_score || 50,
              estimatedTime: template?.estimated_time_minutes || 30,
              hasMaterials,
              isBlocked,
              blockReason,
            };
          })
        );

        // Find best task (not blocked and has materials)
        const availableTasks = processedTasks.filter(t => !t.isBlocked && t.hasMaterials);
        const blockedTasks = processedTasks.filter(t => t.isBlocked || !t.hasMaterials);

        if (availableTasks.length > 0) {
          setNextTask(availableTasks[0]);
          setAlternativeTasks(availableTasks.slice(1, 3));
        } else if (blockedTasks.length > 0) {
          setNextTask(null);
          setAlternativeTasks(blockedTasks.slice(0, 3));
        }
      }
    } catch (error) {
      console.error("Error fetching smart task:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-6">
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-muted-foreground">Analisando tarefas...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Active conditions warning */}
      {activeConditions.length > 0 && (
        <div className={cn(
          "rounded-xl border p-4",
          activeConditions.some(c => c.severity === "critical") 
            ? "border-critical/50 bg-critical/5" 
            : "border-warning/50 bg-warning/5"
        )}>
          <div className="flex items-center gap-2 mb-2">
            <CloudRain className="h-5 w-5 text-warning" />
            <span className="font-medium">Condições Ativas</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {activeConditions.map(c => (
              <span 
                key={c.id} 
                className={cn(
                  "text-xs px-2 py-1 rounded-full",
                  c.severity === "critical" ? "bg-critical/20 text-critical" : "bg-warning/20 text-warning"
                )}
              >
                {c.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Next task */}
      {nextTask ? (
        <div className="rounded-xl border-2 border-primary bg-primary/5 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <p className="text-sm text-primary font-medium mb-1">PRÓXIMA TAREFA RECOMENDADA</p>
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: nextTask.sectorColor }}
                />
                <span className="text-sm text-muted-foreground">{nextTask.sectorName}</span>
              </div>
              <h3 className="text-xl font-bold">{nextTask.name}</h3>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  ~{nextTask.estimatedTime} min
                </span>
                <span className="flex items-center gap-1 text-success">
                  <Package className="h-4 w-4" />
                  Materiais OK
                </span>
              </div>
            </div>
            <Button
              size="lg"
              onClick={() => navigate(`/tasks/${nextTask.id}`)}
              className="gap-2 text-lg px-8"
            >
              <Play className="h-5 w-5" />
              Executar
            </Button>
          </div>
        </div>
      ) : alternativeTasks.length === 0 ? (
        <div className="rounded-xl border border-success/30 bg-success/5 p-6">
          <div className="flex items-center justify-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-success" />
            <div>
              <p className="font-semibold text-success">Tudo em dia!</p>
              <p className="text-sm text-muted-foreground">Não há tarefas disponíveis no momento.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-warning/30 bg-warning/5 p-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <span className="font-medium text-warning">Tarefas bloqueadas</span>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            As tarefas disponíveis estão bloqueadas por condições ou falta de materiais.
          </p>
          <div className="space-y-2">
            {alternativeTasks.map(task => (
              <div 
                key={task.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-background/50"
              >
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: task.sectorColor }}
                />
                <span className="flex-1 text-sm truncate">{task.name}</span>
                {!task.hasMaterials && (
                  <span className="text-xs text-critical flex items-center gap-1">
                    <Package className="h-3 w-3" />
                    Sem material
                  </span>
                )}
                {task.isBlocked && (
                  <span className="text-xs text-warning flex items-center gap-1">
                    <CloudRain className="h-3 w-3" />
                    {task.blockReason || "Bloqueada"}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alternative tasks */}
      {nextTask && alternativeTasks.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Outras opções:</p>
          {alternativeTasks.map(task => (
            <button
              key={task.id}
              onClick={() => navigate(`/tasks/${task.id}`)}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-accent transition-colors text-left"
            >
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: task.sectorColor }}
              />
              <span className="flex-1 font-medium truncate">{task.name}</span>
              <span className="text-xs text-muted-foreground">
                ~{task.estimatedTime} min
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
