import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Play, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/operacional-hub/useAuth";

interface NextTask {
  id: string;
  name: string;
  sectorName: string;
  sectorColor: string;
  priority: number;
}

export function NextTaskButton() {
  const [nextTask, setNextTask] = useState<NextTask | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) fetchNextTask();
  }, [user]);

  const fetchNextTask = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];

      // Get pending/in_progress tasks for today, ordered by priority
      const { data, error } = await supabase
        .from("op_task_executions")
        .select(`
          id, status, priority_score,
          task_templates:op_task_templates(
            name, priority,
            sectors:op_sectors(name, color)
          )
        `)
        .eq("scheduled_date", today)
        .in("status", ["pending", "in_progress", "delayed"])
        .or(`assigned_user_id.is.null,assigned_user_id.eq.${user?.id}`)
        .order("priority_score", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const template = data.task_templates as { name: string; priority: number; sectors: { name: string; color: string } | null } | null;
        setNextTask({
          id: data.id,
          name: template?.name || "Tarefa",
          sectorName: template?.sectors?.name || "Sem setor",
          sectorColor: template?.sectors?.color || "#3b82f6",
          priority: data.priority_score || 50,
        });
      } else {
        setNextTask(null);
      }
    } catch (error) {
      console.error("Error fetching next task:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-6">
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-muted-foreground">Carregando...</span>
        </div>
      </div>
    );
  }

  if (!nextTask) {
    return (
      <div className="rounded-xl border border-success/30 bg-success/5 p-6">
        <div className="flex items-center justify-center gap-3">
          <CheckCircle2 className="h-8 w-8 text-success" />
          <div>
            <p className="font-semibold text-success">Tudo em dia!</p>
            <p className="text-sm text-muted-foreground">Não há tarefas pendentes para você.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border-2 border-primary bg-primary/5 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <p className="text-sm text-primary font-medium mb-1">PRÓXIMA TAREFA</p>
          <div className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: nextTask.sectorColor }}
            />
            <span className="text-sm text-muted-foreground">{nextTask.sectorName}</span>
          </div>
          <h3 className="text-xl font-bold mt-1">{nextTask.name}</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Prioridade: {nextTask.priority}/100
          </p>
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
  );
}
