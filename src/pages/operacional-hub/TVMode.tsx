import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Camera,
  Users,
  Package,
  AlertOctagon,
  X,
  TrendingUp,
  Target,
  XCircle,
  CloudRain,
  Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useFrequencies } from "@/hooks/useFrequencies";

interface ProfileData {
  user_id: string;
  full_name: string;
  job_function_id: string | null;
  shift_id: string | null;
  is_active: boolean;
}

interface JobFunctionData {
  id: string;
  name: string;
  sector_id: string | null;
}

interface ShiftData {
  id: string;
  start_time: string;
  end_time: string;
  work_days: number[];
}

interface TVData {
  completedToday: number;
  pendingToday: number;
  delayedToday: number;
  inProgressToday: number;
  notDoneToday: number;
  plannedToday: number;
  photosPending: number;
  absencesToday: number;
  criticalMaterials: number;
  openIncidents: number;
  activeConditions: number;
  sectors: Array<{
    id: string;
    name: string;
    color: string;
    completed: number;
    total: number;
    planned: number;
  }>;
  topWorkers: Array<{
    name: string;
    completed: number;
    efficiency: number;
  }>;
}

export default function TVMode() {
  const [profiles, setProfiles] = useState<ProfileData[]>([]);
  const [jobFunctions, setJobFunctions] = useState<JobFunctionData[]>([]);
  const [shifts, setShifts] = useState<ShiftData[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [data, setData] = useState<TVData>({
    completedToday: 0,
    pendingToday: 0,
    delayedToday: 0,
    inProgressToday: 0,
    notDoneToday: 0,
    plannedToday: 0,
    photosPending: 0,
    absencesToday: 0,
    criticalMaterials: 0,
    openIncidents: 0,
    activeConditions: 0,
    sectors: [],
    topWorkers: [],
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [baseLoaded, setBaseLoaded] = useState(false);
  const navigate = useNavigate();
  const { data: frequenciesList = [] } = useFrequencies();

  useEffect(() => {
    fetchBaseData();
    const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    document.documentElement.requestFullscreen?.().catch(() => {});
    return () => {
      clearInterval(timeInterval);
    };
  }, []);

  useEffect(() => {
    if (baseLoaded) {
      fetchData();
      const dataInterval = setInterval(fetchData, 30000);
      return () => clearInterval(dataInterval);
    }
  }, [baseLoaded, profiles, jobFunctions, shifts, templates, frequenciesList]);

  const fetchBaseData = async () => {
    const [p, jf, s, t] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name, job_function_id, shift_id, is_active").eq("is_active", true),
      supabase.from("job_functions").select("id, name, sector_id"),
      supabase.from("shifts").select("id, start_time, end_time, work_days"),
      supabase.from("task_templates").select("id, name, estimated_time_minutes, frequency, job_function_id, default_assigned_user_id, priority, is_active, sector_id").eq("is_active", true).eq("is_irregularity_template", false),
    ]);
    setProfiles(p.data || []);
    setJobFunctions(jf.data || []);
    setShifts((s.data || []) as unknown as ShiftData[]);
    setTemplates(t.data || []);
    setBaseLoaded(true);
  };

  // Same template matching logic as ScheduleSimulation
  const getTemplatesForUser = useCallback((userId: string) => {
    const profile = profiles.find((p) => p.user_id === userId);
    const userFunction = profile?.job_function_id
      ? jobFunctions.find((jf) => jf.id === profile.job_function_id)
      : null;
    const userSectorId = userFunction ? (userFunction as any).sector_id : null;

    return templates.filter((t) => {
      if (t.default_assigned_user_id === userId) return true;
      if (!t.sector_id) return false;
      if (t.sector_id && userSectorId && t.sector_id !== userSectorId) return false;
      if (t.sector_id && !userSectorId) return false;
      if (!t.default_assigned_user_id && t.job_function_id && profile?.job_function_id === t.job_function_id) return true;
      if (!t.default_assigned_user_id && !t.job_function_id && t.sector_id && t.sector_id === userSectorId) return true;
      return false;
    });
  }, [templates, profiles, jobFunctions]);

  const shouldFreqRun = useCallback((freqName: string, date: Date) => {
    if (freqName === "daily") return true;
    if (freqName === "weekly") return date.getDay() === 1;
    if (freqName === "monthly") return date.getDate() === 1;
    if (freqName === "on_demand") return false;
    const freq = frequenciesList.find((f: any) => f.name === freqName);
    if (freq?.interval_days) {
      const ref = new Date("2024-01-01");
      const diffDays = Math.floor((date.getTime() - ref.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays % freq.interval_days === 0;
    }
    return false;
  }, [frequenciesList]);

  const fetchData = async () => {
    try {
      const today = new Date();
      const todayStr = format(today, "yyyy-MM-dd");
      const dow = today.getDay();

      const [executionsRes, materialsRes, sectorsRes, absencesRes, incidentsRes, conditionsRes] = await Promise.all([
        supabase
          .from("task_executions")
          .select(`
            id, status, photo_completion_url, time_spent_minutes, executed_by_user_id, assigned_user_id, task_template_id,
            task_templates (name, estimated_time_minutes, requires_photo, sector_id, priority)
          `)
          .eq("scheduled_date", todayStr),
        supabase.from("materials").select("*"),
        supabase.from("sectors").select("*"),
        supabase.from("absences").select("*").eq("absence_date", todayStr),
        supabase.from("incidents").select("*").eq("status", "open"),
        supabase.from("operational_conditions").select("id").eq("is_active", true),
      ]);

      const executions = executionsRes.data || [];
      const materials = materialsRes.data || [];
      const sectors = sectorsRes.data || [];
      const absencesData = absencesRes.data || [];
      const incidents = incidentsRes.data || [];
      const conditions = conditionsRes.data || [];

      // Execution stats
      const completed = executions.filter((e) => e.status === "completed").length;
      const pending = executions.filter((e) => e.status === "pending").length;
      const delayed = executions.filter((e) => e.status === "delayed").length;
      const inProgress = executions.filter((e) => e.status === "in_progress").length;
      const notDone = executions.filter((e) => e.status === "not_done").length;
      const photosPending = executions.filter(
        (e) => (e.task_templates as any)?.requires_photo && !e.photo_completion_url && e.status !== "completed"
      ).length;
      const criticalMaterials = materials.filter(
        (m) => Number(m.current_stock) <= Number(m.min_stock)
      ).length;

      // Calculate planned tasks using same logic as simulation
      let plannedToday = 0;
      const absentUserIds = new Set(absencesData.map((a) => a.user_id));

      // Per-sector planned count
      const sectorPlannedMap = new Map<string, number>();
      
      for (const profile of profiles) {
        const shift = shifts.find((s) => s.id === profile.shift_id);
        if (!shift || !shift.work_days.includes(dow)) continue;
        if (absentUserIds.has(profile.user_id)) continue;

        const userTemplates = getTemplatesForUser(profile.user_id);
        for (const tmpl of userTemplates) {
          if (shouldFreqRun(tmpl.frequency, today)) {
            plannedToday++;
            if (tmpl.sector_id) {
              sectorPlannedMap.set(tmpl.sector_id, (sectorPlannedMap.get(tmpl.sector_id) || 0) + 1);
            }
          }
        }
      }

      // Sector stats
      const sectorStats = sectors.map((sector) => {
        const sectorTasks = executions.filter(
          (e) => (e.task_templates as any)?.sector_id === sector.id
        );
        return {
          id: sector.id,
          name: sector.name,
          color: sector.color || "#3b82f6",
          total: sectorTasks.length,
          completed: sectorTasks.filter((t) => t.status === "completed").length,
          planned: sectorPlannedMap.get(sector.id) || 0,
        };
      }).filter(s => s.total > 0 || s.planned > 0);

      // Top workers
      const workerMap = new Map<string, { name: string; completed: number; totalEff: number; count: number }>();
      for (const exec of executions) {
        if (exec.status === "completed" && exec.executed_by_user_id) {
          const profile = profiles.find(p => p.user_id === exec.executed_by_user_id);
          const name = profile?.full_name || "Usuário";
          const est = (exec.task_templates as any)?.estimated_time_minutes || 30;
          const spent = exec.time_spent_minutes || est;
          const eff = Math.round((est / spent) * 100);

          const existing = workerMap.get(exec.executed_by_user_id);
          if (existing) {
            existing.completed += 1;
            existing.totalEff += eff;
            existing.count += 1;
          } else {
            workerMap.set(exec.executed_by_user_id, { name, completed: 1, totalEff: eff, count: 1 });
          }
        }
      }
      const topWorkers = Array.from(workerMap.values())
        .map(w => ({ name: w.name, completed: w.completed, efficiency: Math.round(w.totalEff / w.count) }))
        .sort((a, b) => b.completed - a.completed)
        .slice(0, 5);

      setData({
        completedToday: completed,
        pendingToday: pending,
        delayedToday: delayed,
        inProgressToday: inProgress,
        notDoneToday: notDone,
        plannedToday,
        photosPending,
        absencesToday: absencesData.length,
        criticalMaterials,
        openIncidents: incidents.length,
        activeConditions: conditions.length,
        sectors: sectorStats,
        topWorkers,
      });
    } catch (error) {
      console.error("Error fetching TV data:", error);
    }
  };

  const completionRate = data.plannedToday > 0 ? Math.round((data.completedToday / data.plannedToday) * 100) : 0;

  const exitTVMode = () => {
    document.exitFullscreen?.().catch(() => {});
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold">Centro de Controle Operacional</h1>
          <p className="text-lg text-muted-foreground">Modo TV - Atualização automática a cada 30s</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-4xl font-mono font-bold">{currentTime.toLocaleTimeString("pt-BR")}</p>
            <p className="text-muted-foreground">{currentTime.toLocaleDateString("pt-BR", { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={exitTVMode}>
            <X className="h-6 w-6" />
          </Button>
        </div>
      </div>

      {/* Main Stats - Planned vs Actual */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 lg:gap-6 mb-8">
        <StatCardTV
          title="Previstas"
          value={data.plannedToday}
          icon={<Target className="h-8 w-8" />}
          variant="primary"
          subtitle="Total planejado"
        />
        <StatCardTV
          title="Concluídas"
          value={data.completedToday}
          icon={<CheckCircle2 className="h-8 w-8" />}
          variant="success"
          subtitle={`${completionRate}% concluído`}
        />
        <StatCardTV
          title="Em Execução"
          value={data.inProgressToday}
          icon={<Clock className="h-8 w-8" />}
          variant="default"
        />
        <StatCardTV
          title="Pendentes"
          value={data.pendingToday}
          icon={<Clock className="h-8 w-8" />}
          variant="default"
        />
        <StatCardTV
          title="Atrasadas"
          value={data.delayedToday}
          icon={<AlertTriangle className="h-8 w-8" />}
          variant={data.delayedToday > 0 ? "warning" : "default"}
        />
        <StatCardTV
          title="Não Feitas"
          value={data.notDoneToday}
          icon={<XCircle className="h-8 w-8" />}
          variant={data.notDoneToday > 0 ? "critical" : "default"}
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-6 mb-8">
        <StatCardTV
          title="Fotos Pendentes"
          value={data.photosPending}
          icon={<Camera className="h-6 w-6" />}
          variant={data.photosPending > 0 ? "critical" : "default"}
          small
        />
        <StatCardTV
          title="Faltas Hoje"
          value={data.absencesToday}
          icon={<Users className="h-6 w-6" />}
          variant={data.absencesToday > 0 ? "warning" : "default"}
          small
        />
        <StatCardTV
          title="Materiais Críticos"
          value={data.criticalMaterials}
          icon={<Package className="h-6 w-6" />}
          variant={data.criticalMaterials > 0 ? "critical" : "default"}
          small
        />
        <StatCardTV
          title="Incidentes Abertos"
          value={data.openIncidents}
          icon={<AlertOctagon className="h-6 w-6" />}
          variant={data.openIncidents > 0 ? "warning" : "default"}
          small
        />
        <StatCardTV
          title="Condições Ativas"
          value={data.activeConditions}
          icon={<CloudRain className="h-6 w-6" />}
          variant={data.activeConditions > 0 ? "warning" : "default"}
          small
        />
      </div>

      {/* Progress Bar */}
      <div className="rounded-2xl border border-border bg-card p-6 mb-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-bold">Progresso do Dia</h3>
          <span className="text-2xl font-mono font-bold text-primary">{completionRate}%</span>
        </div>
        <div className="h-6 bg-muted rounded-full overflow-hidden flex">
          {data.completedToday > 0 && (
            <div
              className="h-full bg-success transition-all duration-1000 flex items-center justify-center text-[10px] font-bold text-success-foreground"
              style={{ width: `${data.plannedToday > 0 ? (data.completedToday / data.plannedToday) * 100 : 0}%` }}
            >
              {data.completedToday}
            </div>
          )}
          {data.inProgressToday > 0 && (
            <div
              className="h-full bg-primary transition-all duration-1000 flex items-center justify-center text-[10px] font-bold text-primary-foreground"
              style={{ width: `${data.plannedToday > 0 ? (data.inProgressToday / data.plannedToday) * 100 : 0}%` }}
            >
              {data.inProgressToday}
            </div>
          )}
          {data.delayedToday > 0 && (
            <div
              className="h-full bg-warning transition-all duration-1000 flex items-center justify-center text-[10px] font-bold text-warning-foreground"
              style={{ width: `${data.plannedToday > 0 ? (data.delayedToday / data.plannedToday) * 100 : 0}%` }}
            >
              {data.delayedToday}
            </div>
          )}
          {data.notDoneToday > 0 && (
            <div
              className="h-full bg-critical transition-all duration-1000 flex items-center justify-center text-[10px] font-bold text-white"
              style={{ width: `${data.plannedToday > 0 ? (data.notDoneToday / data.plannedToday) * 100 : 0}%` }}
            >
              {data.notDoneToday}
            </div>
          )}
        </div>
        <div className="flex gap-6 mt-3 text-sm">
          <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-success" /> Concluídas</span>
          <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-primary" /> Em execução</span>
          <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-warning" /> Atrasadas</span>
          <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-critical" /> Não feitas</span>
          <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-muted-foreground/30" /> Pendentes</span>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Sectors Status */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6">
          <h3 className="text-xl font-bold mb-6">Status por Setor</h3>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {data.sectors.map((sector) => {
              const ref = Math.max(sector.planned, sector.total);
              const percentage = ref > 0 ? Math.round((sector.completed / ref) * 100) : 0;
              const status = percentage === 100 ? "success" : percentage >= 50 ? "warning" : "critical";
              
              return (
                <div
                  key={sector.id}
                  className={cn(
                    "p-4 rounded-xl border-2 transition-all",
                    status === "success" && "border-success bg-success/10",
                    status === "warning" && "border-warning bg-warning/10",
                    status === "critical" && "border-critical bg-critical/10"
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="h-4 w-4 rounded-full"
                      style={{ backgroundColor: sector.color }}
                    />
                    <span className="font-semibold truncate">{sector.name}</span>
                  </div>
                  <div className="flex items-end justify-between">
                    <span className="text-3xl font-mono font-bold">{percentage}%</span>
                    <div className="text-right">
                      <span className="text-sm text-muted-foreground block">
                        {sector.completed}/{sector.total} exec
                      </span>
                      {sector.planned > 0 && sector.planned !== sector.total && (
                        <span className="text-[10px] text-muted-foreground">
                          {sector.planned} previstas
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {data.sectors.length === 0 && (
              <p className="col-span-full text-center text-muted-foreground py-8">Sem tarefas hoje</p>
            )}
          </div>
        </div>

        {/* Top Workers */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="h-6 w-6 text-primary" />
            <h3 className="text-xl font-bold">Ranking do Dia</h3>
          </div>
          <div className="space-y-4">
            {data.topWorkers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Sem dados ainda</p>
            ) : (
              data.topWorkers.map((worker, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center font-bold text-lg",
                    index === 0 && "bg-yellow-500/20 text-yellow-500",
                    index === 1 && "bg-gray-400/20 text-gray-400",
                    index === 2 && "bg-orange-600/20 text-orange-600",
                    index > 2 && "bg-muted text-muted-foreground"
                  )}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{worker.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {worker.completed} tarefas • {worker.efficiency}% eficiência
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatCardTVProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  variant: "default" | "success" | "warning" | "critical" | "primary";
  subtitle?: string;
  small?: boolean;
}

function StatCardTV({ title, value, icon, variant, subtitle, small }: StatCardTVProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border-2 p-4 lg:p-6 transition-all",
        small ? "py-4" : "py-6",
        variant === "success" && "border-success bg-success/10",
        variant === "warning" && "border-warning bg-warning/10",
        variant === "critical" && "border-critical bg-critical/10",
        variant === "primary" && "border-primary bg-primary/10",
        variant === "default" && "border-border bg-card"
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className={cn(
          "font-medium",
          small ? "text-sm" : "text-base",
          variant === "success" && "text-success",
          variant === "warning" && "text-warning",
          variant === "critical" && "text-critical",
          variant === "primary" && "text-primary",
          variant === "default" && "text-muted-foreground"
        )}>
          {title}
        </span>
        <div className={cn(
          variant === "success" && "text-success",
          variant === "warning" && "text-warning",
          variant === "critical" && "text-critical",
          variant === "primary" && "text-primary",
          variant === "default" && "text-muted-foreground"
        )}>
          {icon}
        </div>
      </div>
      <p className={cn(
        "font-mono font-bold",
        small ? "text-3xl" : "text-4xl lg:text-5xl"
      )}>
        {value}
      </p>
      {subtitle && (
        <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
      )}
    </div>
  );
}
