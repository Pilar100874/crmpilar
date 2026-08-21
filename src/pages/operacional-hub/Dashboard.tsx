import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { SectorStatus } from "@/components/dashboard/SectorStatus";
import { TaskList, TaskStatus } from "@/components/dashboard/TaskList";
import { MaterialAlert } from "@/components/dashboard/MaterialAlert";
import { ProductivityRanking } from "@/components/dashboard/ProductivityRanking";
import { NextTaskButton } from "@/components/tasks/NextTaskButton";
import { DailyMaterialsSummary } from "@/components/dashboard/DailyMaterialsSummary";
import { FunctionDepartureDialog } from "@/components/dashboard/FunctionDepartureDialog";
import { useUserRole } from "@/hooks/useUserRole";
import { useShiftStatus } from "@/hooks/useShiftStatus";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Camera,
  TrendingUp,
  Users,
  AlertOctagon,
  Play,
  ChevronDown,
  LogOut,
  Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DashboardData {
  completedToday: number;
  pendingToday: number;
  delayedToday: number;
  photosPending: number;
  tasks: Array<{
    id: string;
    name: string;
    sector: string;
    sectorColor: string;
    status: TaskStatus;
    estimatedTime: number;
  }>;
  sectors: Array<{
    id: string;
    name: string;
    completed: number;
    total: number;
    color: string;
  }>;
  materials: Array<{
    id: string;
    name: string;
    currentStock: number;
    minStock: number;
    unit: string;
  }>;
  userProductivity: Array<{
    id: string;
    name: string;
    completedTasks: number;
    avgTimeEfficiency: number;
  }>;
  absencesToday: number;
  openIncidents: number;
}

interface WorkerData {
  completedToday: number;
  pendingToday: number;
  inProgressToday: number;
  myTasks: Array<{
    id: string;
    name: string;
    sector: string;
    sectorColor: string;
    status: TaskStatus;
    estimatedTime: number;
    blockedBy?: string;
  }>;
  userName: string;
}

export default function Dashboard() {
  const { isAdminOrManager, loading: roleLoading } = useUserRole();
  const { user } = useAuth();
  const { isCheckedIn, checkInTime, loading: shiftLoading, checkIn, checkOut, refresh: refreshShift } = useShiftStatus();
  const { toast } = useToast();
  
  const [data, setData] = useState<DashboardData>({
    completedToday: 0,
    pendingToday: 0,
    delayedToday: 0,
    photosPending: 0,
    tasks: [],
    sectors: [],
    materials: [],
    userProductivity: [],
    absencesToday: 0,
    openIncidents: 0,
  });
  
  const [workerData, setWorkerData] = useState<WorkerData>({
    completedToday: 0,
    pendingToday: 0,
    inProgressToday: 0,
    myTasks: [],
    userName: "",
  });
  
  const [loading, setLoading] = useState(true);
  const [shiftActionLoading, setShiftActionLoading] = useState(false);

  useEffect(() => {
    if (roleLoading || shiftLoading) return;
    
    if (isAdminOrManager) {
      fetchDashboardData();
    } else if (isCheckedIn) {
      fetchWorkerData();
    } else {
      // Fetch just the user name for the pre-check-in screen
      fetchWorkerName();
      setLoading(false);
    }
  }, [isAdminOrManager, roleLoading, user, isCheckedIn, shiftLoading]);

  const fetchWorkerName = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) {
      setWorkerData(prev => ({ ...prev, userName: data.full_name }));
    }
  };

  const fetchWorkerData = async () => {
    if (!user) return;
    
    try {
      const today = new Date().toISOString().split("T")[0];

      // First get user profile with job function and its sector
      const profileRes = await supabase
        .from("profiles")
        .select(`
          full_name, 
          job_function_id,
          job_functions (
            id,
            sector_id
          )
        `)
        .eq("user_id", user.id)
        .maybeSingle();

      const userName = profileRes.data?.full_name || "Colaborador";
      const jobFunctionId = profileRes.data?.job_function_id;
      const sectorId = (profileRes.data as any)?.job_functions?.sector_id;

      // Fetch tasks: assigned to user OR from their sector (unassigned)
      const [myTasksRes, sectorTasksRes, dependenciesRes, allExecutionsRes] = await Promise.all([
        // Tasks directly assigned to me
        supabase
          .from("task_executions")
          .select(`
            id,
            status,
            assigned_user_id,
            task_template_id,
            task_templates (
              name,
              estimated_time_minutes,
              job_function_id,
              sector_id,
              sectors (
                id,
                name,
                color
              )
            )
          `)
          .eq("scheduled_date", today)
          .eq("assigned_user_id", user.id),
        // Tasks from my sector (unassigned)
        sectorId ? supabase
          .from("task_executions")
          .select(`
            id,
            status,
            assigned_user_id,
            task_template_id,
            task_templates!inner (
              name,
              estimated_time_minutes,
              job_function_id,
              sector_id,
              sectors (
                id,
                name,
                color
              )
            )
          `)
          .eq("scheduled_date", today)
          .eq("task_templates.sector_id", sectorId)
          .is("assigned_user_id", null) : Promise.resolve({ data: [] }),
        // Get all dependencies
        supabase.from("task_dependencies").select("task_template_id, depends_on_template_id"),
        // Get all executions for today to check dependencies
        supabase
          .from("task_executions")
          .select("id, status, task_template_id")
          .eq("scheduled_date", today),
      ]);

      const myTasks = myTasksRes.data || [];
      const sectorTasks = sectorTasksRes.data || [];
      const dependencies = dependenciesRes.data || [];
      const allExecutions = allExecutionsRes.data || [];
      
      // Build dependencies map: templateId -> [dependsOnTemplateIds]
      const dependenciesMap = new Map<string, string[]>();
      dependencies.forEach((d: any) => {
        const existing = dependenciesMap.get(d.task_template_id) || [];
        existing.push(d.depends_on_template_id);
        dependenciesMap.set(d.task_template_id, existing);
      });

      // Build template execution status map
      const templateStatusMap = new Map<string, { status: string; name: string }>();
      allExecutions.forEach((e: any) => {
        templateStatusMap.set(e.task_template_id, { status: e.status, name: "" });
      });
      
      // Combine and deduplicate
      const allTasksMap = new Map();
      [...myTasks, ...sectorTasks].forEach((t: any) => {
        if (!allTasksMap.has(t.id)) {
          allTasksMap.set(t.id, t);
        }
      });
      const executions = Array.from(allTasksMap.values());

      // Build template name map for blocking messages
      const templateNameMap = new Map<string, string>();
      executions.forEach((e: any) => {
        templateNameMap.set(e.task_template_id, e.task_templates?.name || "");
      });
      allExecutions.forEach((e: any) => {
        const exec = executions.find((ex: any) => ex.task_template_id === e.task_template_id);
        if (exec) {
          templateNameMap.set(e.task_template_id, exec.task_templates?.name || "");
        }
      });

      const completed = executions.filter((e: any) => e.status === "completed").length;
      const pending = executions.filter((e: any) => e.status === "pending").length;
      const inProgress = executions.filter((e: any) => e.status === "in_progress").length;

      // Check if task is blocked by uncompleted dependencies
      const isTaskBlocked = (templateId: string): { blocked: boolean; blockedBy: string | null } => {
        const deps = dependenciesMap.get(templateId) || [];
        for (const depTemplateId of deps) {
          const depExecution = allExecutions.find((e: any) => e.task_template_id === depTemplateId);
          if (!depExecution || depExecution.status !== "completed") {
            // Find the name of the blocking task
            const blockingExec = executions.find((e: any) => e.task_template_id === depTemplateId);
            const blockingName = blockingExec?.task_templates?.name || templateNameMap.get(depTemplateId) || "outra tarefa";
            return { blocked: true, blockedBy: blockingName };
          }
        }
        return { blocked: false, blockedBy: null };
      };

      const mappedTasks = executions
        .filter((e: any) => e.status !== "completed")
        .map((e: any) => {
          const blockInfo = isTaskBlocked(e.task_template_id);
          return {
            id: e.id,
            name: e.task_templates?.name || "Sem nome",
            sector: e.task_templates?.sectors?.name || "Sem setor",
            sectorColor: e.task_templates?.sectors?.color || "#3b82f6",
            status: blockInfo.blocked ? "blocked" as TaskStatus : e.status as TaskStatus,
            estimatedTime: e.task_templates?.estimated_time_minutes || 30,
            isUnassigned: !e.assigned_user_id,
            blockedBy: blockInfo.blockedBy || undefined,
          };
        });

      setWorkerData({
        completedToday: completed,
        pendingToday: pending,
        inProgressToday: inProgress,
        myTasks: mappedTasks,
        userName,
      });
    } catch (error) {
      console.error("Error fetching worker data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];

      // Fetch all data in parallel
      const [executionsRes, materialsRes, sectorsRes, profilesRes, absencesRes, incidentsRes] = await Promise.all([
        supabase
          .from("task_executions")
          .select(`
            id,
            status,
            photo_completion_url,
            time_spent_minutes,
            executed_by_user_id,
            task_templates (
              name,
              estimated_time_minutes,
              requires_photo,
              sectors (
                id,
                name,
                color
              )
            )
          `)
          .eq("scheduled_date", today),
        supabase.from("materials").select("*").order("name"),
        supabase.from("sectors").select("*").order("name"),
        supabase.from("profiles").select("id, user_id, full_name"),
        supabase.from("absences").select("id").eq("absence_date", today),
        supabase.from("incidents").select("id").eq("status", "open"),
      ]);

      const executions = executionsRes.data || [];
      const materials = materialsRes.data || [];
      const sectors = sectorsRes.data || [];
      const profiles = profilesRes.data || [];
      const absences = absencesRes.data || [];
      const incidents = incidentsRes.data || [];

      // Calculate stats
      const completed = executions.filter((e) => e.status === "completed").length;
      const pending = executions.filter((e) => e.status === "pending").length;
      const delayed = executions.filter((e) => e.status === "delayed").length;
      const photosPending = executions.filter(
        (e) => 
          e.task_templates?.requires_photo && 
          !e.photo_completion_url && 
          e.status !== "completed"
      ).length;

      // Map tasks for TaskList
      const mappedTasks = executions.map((e) => ({
        id: e.id,
        name: e.task_templates?.name || "Sem nome",
        sector: e.task_templates?.sectors?.name || "Sem setor",
        sectorColor: e.task_templates?.sectors?.color || "#3b82f6",
        status: e.status as TaskStatus,
        estimatedTime: e.task_templates?.estimated_time_minutes || 30,
      }));

      // Calculate sector stats
      const sectorStats = sectors.map((sector) => {
        const sectorTasks = executions.filter(
          (e) => e.task_templates?.sectors?.id === sector.id
        );
        return {
          id: sector.id,
          name: sector.name,
          color: sector.color || "#3b82f6",
          total: sectorTasks.length,
          completed: sectorTasks.filter((t) => t.status === "completed").length,
        };
      }).filter(s => s.total > 0);

      // Map materials
      const mappedMaterials = materials.map((m) => ({
        id: m.id,
        name: m.name,
        currentStock: Number(m.current_stock),
        minStock: Number(m.min_stock),
        unit: m.unit,
      }));

      // Calculate user productivity
      const userProductivityMap = new Map<string, { 
        completed: number; 
        totalEfficiency: number; 
        count: number;
        name: string;
      }>();

      for (const exec of executions) {
        if (exec.status === "completed" && exec.executed_by_user_id) {
          const userId = exec.executed_by_user_id;
          const profile = profiles.find(p => p.user_id === userId);
          const name = profile?.full_name || "Usuário";
          const estimatedTime = exec.task_templates?.estimated_time_minutes || 30;
          const timeSpent = exec.time_spent_minutes || estimatedTime;
          const efficiency = Math.round((estimatedTime / timeSpent) * 100);

          const existing = userProductivityMap.get(userId);
          if (existing) {
            existing.completed += 1;
            existing.totalEfficiency += efficiency;
            existing.count += 1;
          } else {
            userProductivityMap.set(userId, {
              completed: 1,
              totalEfficiency: efficiency,
              count: 1,
              name,
            });
          }
        }
      }

      const userProductivity = Array.from(userProductivityMap.entries()).map(([id, data]) => ({
        id,
        name: data.name,
        completedTasks: data.completed,
        avgTimeEfficiency: Math.round(data.totalEfficiency / data.count),
      }));

      setData({
        completedToday: completed,
        pendingToday: pending,
        delayedToday: delayed,
        photosPending,
        tasks: mappedTasks,
        sectors: sectorStats,
        materials: mappedMaterials,
        userProductivity,
        absencesToday: absences.length,
        openIncidents: incidents.length,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    setShiftActionLoading(true);
    const { error } = await checkIn();
    if (error) {
      toast({ title: "Erro", description: error, variant: "destructive" });
      setShiftActionLoading(false);
      return;
    }
    toast({ title: "Turno iniciado!", description: "Gerando suas tarefas..." });
    
    // Generate daily tasks after check-in
    try {
      await supabase.functions.invoke("generate-daily-tasks");
    } catch (e) {
      console.error("Error generating tasks:", e);
    }
    
    await refreshShift();
    setShiftActionLoading(false);
  };

  const handleCheckOut = async () => {
    setShiftActionLoading(true);
    const { error } = await checkOut();
    setShiftActionLoading(false);
    if (error) {
      toast({ title: "Erro", description: error, variant: "destructive" });
    } else {
      toast({ title: "Turno encerrado", description: "Até a próxima!" });
    }
  };

  // Worker Dashboard - Simplified & Compact
  if (!isAdminOrManager && !roleLoading) {
    // Not checked in - show big "Iniciar Turno" button
    if (!isCheckedIn && !shiftLoading) {
      return (
        <AppLayout>
          <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-6 px-4">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold text-foreground">
                Olá, {workerData.userName || "Colaborador"}! 👋
              </h1>
              <p className="text-muted-foreground">
                {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
              </p>
            </div>
            <Button
              size="lg"
              onClick={handleCheckIn}
              disabled={shiftActionLoading}
              className="gap-3 h-16 px-10 text-lg rounded-2xl bg-success hover:bg-success/90 text-success-foreground shadow-lg"
            >
              {shiftActionLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <Play className="h-6 w-6" />
              )}
              Iniciar Turno
            </Button>
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              Ao iniciar o turno, suas tarefas do dia serão geradas automaticamente.
            </p>
          </div>
        </AppLayout>
      );
    }

    const totalTasks = workerData.completedToday + workerData.pendingToday + workerData.inProgressToday;
    const completionPercent = totalTasks > 0 ? Math.round((workerData.completedToday / totalTasks) * 100) : 0;
    
    return (
      <AppLayout>
        <div className="space-y-4">
          {/* Greeting + Progress in one row */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground">
                Olá, {workerData.userName.split(" ")[0]}! 👋
              </h1>
              <p className="text-sm text-muted-foreground">
                {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {totalTasks > 0 && (
                <div className="flex flex-col items-center">
                  <div className="relative h-14 w-14">
                    <svg className="h-14 w-14 -rotate-90" viewBox="0 0 56 56">
                      <circle cx="28" cy="28" r="24" fill="none" strokeWidth="5" className="stroke-muted" />
                      <circle 
                        cx="28" cy="28" r="24" fill="none" strokeWidth="5" 
                        className="stroke-success" 
                        strokeLinecap="round"
                        strokeDasharray={`${completionPercent * 1.508} 150.8`}
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-foreground">
                      {completionPercent}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Shift info bar */}
          <div className="flex items-center justify-between px-4 py-2 rounded-xl bg-success/10 border border-success/30">
            <p className="text-sm font-medium text-success">
              Turno iniciado às{" "}
              {checkInTime && format(new Date(checkInTime), "HH:mm", { locale: ptBR })}
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCheckOut}
              disabled={shiftActionLoading}
              className="gap-1"
            >
              {shiftActionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
              Encerrar
            </Button>
          </div>

          {/* Compact Stats Row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col items-center py-3 rounded-xl bg-muted/40 border border-border">
              <span className="text-2xl font-bold text-foreground">{workerData.pendingToday}</span>
              <span className="text-xs text-muted-foreground font-medium">A Fazer</span>
            </div>
            <div className="flex flex-col items-center py-3 rounded-xl bg-primary/10 border border-primary/20">
              <span className="text-2xl font-bold text-primary">{workerData.inProgressToday}</span>
              <span className="text-xs text-primary font-medium">Fazendo</span>
            </div>
            <div className="flex flex-col items-center py-3 rounded-xl bg-success/10 border border-success/20">
              <span className="text-2xl font-bold text-success">{workerData.completedToday}</span>
              <span className="text-xs text-success font-medium">Feitas</span>
            </div>
          </div>

          {/* Next Task - Prominent CTA */}
          <NextTaskButton />

          {/* Task List - takes remaining space */}
          <TaskList tasks={workerData.myTasks} title="Suas Tarefas" />

          {/* Secondary actions - collapsed */}
          <details className="group">
            <summary className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
              <span>Mais opções</span>
              <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
            </summary>
            <div className="space-y-3 pt-3">
              <FunctionDepartureDialog onDepartureConfirmed={() => fetchWorkerData()} />
            </div>
          </details>
        </div>
      </AppLayout>
    );
  }

  // Admin/Manager Dashboard - Compact
  const totalTasks = data.completedToday + data.pendingToday + data.delayedToday;
  const completionRate = totalTasks > 0 
    ? Math.round((data.completedToday / totalTasks) * 100) 
    : 0;

  const lowStockMaterials = data.materials.filter(m => m.currentStock <= m.minStock);

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Header Row */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Painel de Controle</h1>
            <p className="text-sm text-muted-foreground">
              {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>
          {/* Circular progress */}
          <div className="flex flex-col items-center">
            <div className="relative h-14 w-14">
              <svg className="h-14 w-14 -rotate-90" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="24" fill="none" strokeWidth="5" className="stroke-muted" />
                <circle 
                  cx="28" cy="28" r="24" fill="none" strokeWidth="5" 
                  className="stroke-success" 
                  strokeLinecap="round"
                  strokeDasharray={`${completionRate * 1.508} 150.8`}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-foreground">
                {completionRate}%
              </span>
            </div>
          </div>
        </div>

        {/* Shift Control */}
        {!isCheckedIn && !shiftLoading ? (
          <Button
            size="lg"
            onClick={handleCheckIn}
            disabled={shiftActionLoading}
            className="w-full gap-3 h-14 text-lg rounded-2xl bg-success hover:bg-success/90 text-success-foreground shadow-lg"
          >
            {shiftActionLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <Play className="h-6 w-6" />
            )}
            Iniciar Turno
          </Button>
        ) : isCheckedIn ? (
          <div className="flex items-center justify-between px-4 py-2 rounded-xl bg-success/10 border border-success/30">
            <p className="text-sm font-medium text-success">
              Turno iniciado às{" "}
              {checkInTime && format(new Date(checkInTime), "HH:mm", { locale: ptBR })}
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCheckOut}
              disabled={shiftActionLoading}
              className="gap-1"
            >
              {shiftActionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
              Encerrar
            </Button>
          </div>
        ) : null}

        {/* Key Stats - 4 in a row, compact */}
        <div className="grid grid-cols-4 gap-2">
          <div className="flex flex-col items-center py-2.5 rounded-xl bg-success/10 border border-success/20">
            <span className="text-xl font-bold text-success">{data.completedToday}</span>
            <span className="text-[10px] text-success font-medium leading-tight">Feitas</span>
          </div>
          <div className="flex flex-col items-center py-2.5 rounded-xl bg-muted/40 border border-border">
            <span className="text-xl font-bold text-foreground">{data.pendingToday}</span>
            <span className="text-[10px] text-muted-foreground font-medium leading-tight">Pendentes</span>
          </div>
          <div className={cn(
            "flex flex-col items-center py-2.5 rounded-xl border",
            data.delayedToday > 0 ? "bg-warning/10 border-warning/20" : "bg-muted/40 border-border"
          )}>
            <span className={cn("text-xl font-bold", data.delayedToday > 0 ? "text-warning" : "text-foreground")}>{data.delayedToday}</span>
            <span className={cn("text-[10px] font-medium leading-tight", data.delayedToday > 0 ? "text-warning" : "text-muted-foreground")}>Atrasadas</span>
          </div>
          <div className={cn(
            "flex flex-col items-center py-2.5 rounded-xl border",
            data.photosPending > 0 ? "bg-critical/10 border-critical/20" : "bg-muted/40 border-border"
          )}>
            <span className={cn("text-xl font-bold", data.photosPending > 0 ? "text-critical" : "text-foreground")}>{data.photosPending}</span>
            <span className={cn("text-[10px] font-medium leading-tight", data.photosPending > 0 ? "text-critical" : "text-muted-foreground")}>Fotos</span>
          </div>
        </div>

        {/* Alerts row - only show if there are issues */}
        {(data.absencesToday > 0 || data.openIncidents > 0 || lowStockMaterials.length > 0) && (
          <div className="flex flex-wrap gap-2">
            {data.absencesToday > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-warning/10 border border-warning/20 text-sm">
                <Users className="h-3.5 w-3.5 text-warning" />
                <span className="text-warning font-medium">{data.absencesToday} falta{data.absencesToday !== 1 ? "s" : ""}</span>
              </div>
            )}
            {data.openIncidents > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-critical/10 border border-critical/20 text-sm">
                <AlertOctagon className="h-3.5 w-3.5 text-critical" />
                <span className="text-critical font-medium">{data.openIncidents} incidente{data.openIncidents !== 1 ? "s" : ""}</span>
              </div>
            )}
            {lowStockMaterials.length > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-warning/10 border border-warning/20 text-sm">
                <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                <span className="text-warning font-medium">{lowStockMaterials.length} material em baixa</span>
              </div>
            )}
          </div>
        )}

        {/* Next Task */}
        <NextTaskButton />

        {/* Sector progress - compact inline */}
        {data.sectors.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Setores</h3>
            <div className="space-y-2">
              {data.sectors.map((sector) => {
                const pct = sector.total > 0 ? Math.round((sector.completed / sector.total) * 100) : 0;
                return (
                  <div key={sector.id} className="flex items-center gap-3">
                    <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: sector.color }} />
                    <span className="text-sm text-foreground flex-1 truncate">{sector.name}</span>
                    <span className="text-xs text-muted-foreground">{sector.completed}/{sector.total}</span>
                    <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-success transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Materiais do Dia */}
        <DailyMaterialsSummary />

        {/* Task List */}
        <TaskList tasks={data.tasks} title="Tarefas de Hoje" />

        {/* Secondary info collapsed */}
        <details className="group">
          <summary className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
            <span>Produtividade e ranking</span>
            <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
          </summary>
          <div className="space-y-4 pt-3">
            <ProductivityRanking users={data.userProductivity} loading={loading} />
          </div>
        </details>
      </div>
    </AppLayout>
  );
}
