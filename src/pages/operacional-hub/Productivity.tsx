import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  User,
  Award,
  AlertTriangle,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Timer,
  CalendarClock,
  UtensilsCrossed,
  Pause,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfWeek } from "date-fns";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface TaskDetail {
  taskName: string;
  estimatedMinutes: number;
  actualMinutes: number;
  restMinutes: number;
  pauseCount: number;
  totalPauseMinutes: number;
  pauseReason: string | null;
  activeMinutes: number;
  status: string;
  scheduledDate: string;
  skippedByTool: boolean;
}

interface UserProductivity {
  userId: string;
  userName: string;
  tasksCompleted: number;
  tasksNotDone: number;
  tasksSkippedByTool: number;
  totalTasks: number;
  completionRate: number;
  avgTimeMinutes: number;
  onTimeRate: number;
  shiftName: string | null;
  shiftHoursPerDay: number;
  totalShiftMinutes: number;
  totalTaskMinutes: number;
  totalRestMinutes: number;
  totalPauseMinutes: number;
  totalActiveMinutes: number;
  utilizationRate: number;
  tasks: TaskDetail[];
}

interface DailyStat {
  date: string;
  completed: number;
  notDone: number;
  pending: number;
}

export default function Productivity() {
  const [users, setUsers] = useState<UserProductivity[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("week");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const endDate = new Date();
      let startDate: Date;

      switch (period) {
        case "today":
          startDate = new Date();
          break;
        case "week":
          startDate = startOfWeek(new Date(), { weekStartsOn: 1 });
          break;
        case "month":
          startDate = subDays(new Date(), 30);
          break;
        default:
          startDate = subDays(new Date(), 7);
      }

      const startStr = format(startDate, "yyyy-MM-dd");
      const endStr = format(endDate, "yyyy-MM-dd");

      const [execResult, profileResult, shiftResult] = await Promise.all([
        supabase
          .from("task_executions")
          .select(`
            id, status, time_spent_minutes, scheduled_date, executed_by_user_id, assigned_user_id,
            pause_count, total_pause_minutes, pause_reason, observations,
            task_templates (name, estimated_time_minutes, requires_rest_after, rest_minutes_after)
          `)
          .gte("scheduled_date", startStr)
          .lte("scheduled_date", endStr),
        supabase
          .from("profiles")
          .select("user_id, full_name, shift_id"),
        supabase
          .from("shifts")
          .select("id, name, start_time, end_time, lunch_start, lunch_end, day_schedules"),
      ]);

      const executions = execResult.data || [];
      const profiles = profileResult.data || [];
      const shifts = shiftResult.data || [];

      const profileMap = new Map(profiles.map((p) => [p.user_id, p]));
      const shiftMap = new Map(shifts.map((s) => [s.id, s]));

      const getShiftHours = (shiftId: string | null): { name: string | null; hoursPerDay: number; lunchMinutes: number } => {
        if (!shiftId) return { name: null, hoursPerDay: 8, lunchMinutes: 60 };
        const shift = shiftMap.get(shiftId);
        if (!shift) return { name: null, hoursPerDay: 8, lunchMinutes: 60 };

        const [sh, sm] = (shift.start_time as string).slice(0, 5).split(":").map(Number);
        const [eh, em] = (shift.end_time as string).slice(0, 5).split(":").map(Number);
        const totalMin = (eh * 60 + em) - (sh * 60 + sm);

        let lunchMin = 0;
        if (shift.lunch_start && shift.lunch_end) {
          const [lsh, lsm] = (shift.lunch_start as string).slice(0, 5).split(":").map(Number);
          const [leh, lem] = (shift.lunch_end as string).slice(0, 5).split(":").map(Number);
          lunchMin = (leh * 60 + lem) - (lsh * 60 + lsm);
        }

        return {
          name: shift.name,
          hoursPerDay: (totalMin - lunchMin) / 60,
          lunchMinutes: lunchMin,
        };
      };

      const workDaysInPeriod = (() => {
        let count = 0;
        const d = new Date(startDate);
        while (d <= endDate) {
          const dow = d.getDay();
          if (dow >= 1 && dow <= 5) count++;
          d.setDate(d.getDate() + 1);
        }
        return Math.max(count, 1);
      })();

      const userStats: Record<string, UserProductivity> = {};
      const dailyStatsMap: Record<string, DailyStat> = {};

      executions.forEach((exec) => {
        const userId = exec.executed_by_user_id || exec.assigned_user_id;

        const dateKey = exec.scheduled_date;
        if (!dailyStatsMap[dateKey]) {
          dailyStatsMap[dateKey] = { date: dateKey, completed: 0, notDone: 0, pending: 0 };
        }
        if (exec.status === "completed") dailyStatsMap[dateKey].completed++;
        else if (exec.status === "not_done") dailyStatsMap[dateKey].notDone++;
        else dailyStatsMap[dateKey].pending++;

        if (!userId) return;

        const profile = profileMap.get(userId);
        const shiftInfo = getShiftHours(profile?.shift_id || null);

        if (!userStats[userId]) {
          userStats[userId] = {
            userId,
            userName: profile?.full_name || "Usuário",
            tasksCompleted: 0,
            tasksNotDone: 0,
            tasksSkippedByTool: 0,
            totalTasks: 0,
            completionRate: 0,
            avgTimeMinutes: 0,
            onTimeRate: 0,
            shiftName: shiftInfo.name,
            shiftHoursPerDay: shiftInfo.hoursPerDay,
            totalShiftMinutes: shiftInfo.hoursPerDay * 60 * workDaysInPeriod,
            totalTaskMinutes: 0,
            totalRestMinutes: 0,
            totalPauseMinutes: 0,
            totalActiveMinutes: 0,
            utilizationRate: 0,
            tasks: [],
          };
        }

        const stats = userStats[userId];
        stats.totalTasks++;

        const template = exec.task_templates as any;
        const estimated = template?.estimated_time_minutes || 30;
        const timeSpent = exec.time_spent_minutes || 0;
        const restMinutes = (template?.requires_rest_after && template?.rest_minutes_after) ? template.rest_minutes_after : 0;
        const pauseCount = exec.pause_count || 0;
        const totalPauseMin = exec.total_pause_minutes || 0;
        const activeMin = Math.max(0, timeSpent - totalPauseMin);

        // Check if task was skipped due to tool unavailability
        const obs = exec.observations || "";
        const skippedByTool = exec.status === "not_done" && obs.toLowerCase().includes("ferramenta");

        stats.tasks.push({
          taskName: template?.name || "Tarefa",
          estimatedMinutes: estimated,
          actualMinutes: timeSpent,
          restMinutes,
          pauseCount,
          totalPauseMinutes: totalPauseMin,
          pauseReason: exec.pause_reason,
          activeMinutes: activeMin,
          status: exec.status || "pending",
          scheduledDate: exec.scheduled_date,
          skippedByTool,
        });

        if (exec.status === "completed") {
          stats.tasksCompleted++;
          stats.avgTimeMinutes += timeSpent;
          stats.totalTaskMinutes += activeMin; // Use active time, not total
          stats.totalPauseMinutes += totalPauseMin;
          stats.totalActiveMinutes += activeMin;
          stats.totalRestMinutes += restMinutes;
          if (timeSpent <= estimated * 1.2) stats.onTimeRate++;
        } else if (exec.status === "not_done") {
          stats.tasksNotDone++;
          if (skippedByTool) stats.tasksSkippedByTool++;
        }
      });

      const processedUsers = Object.values(userStats)
        .map((user) => ({
          ...user,
          completionRate: user.totalTasks > 0
            ? Math.round((user.tasksCompleted / user.totalTasks) * 100)
            : 0,
          avgTimeMinutes: user.tasksCompleted > 0
            ? Math.round(user.avgTimeMinutes / user.tasksCompleted)
            : 0,
          onTimeRate: user.tasksCompleted > 0
            ? Math.round((user.onTimeRate / user.tasksCompleted) * 100)
            : 0,
          utilizationRate: user.totalShiftMinutes > 0
            ? Math.round(((user.totalActiveMinutes + user.totalRestMinutes) / user.totalShiftMinutes) * 100)
            : 0,
        }))
        .sort((a, b) => b.completionRate - a.completionRate);

      const sortedDailyStats = Object.values(dailyStatsMap).sort((a, b) =>
        a.date.localeCompare(b.date)
      );

      setUsers(processedUsers);
      setDailyStats(sortedDailyStats);
    } catch (error) {
      console.error("Error fetching productivity data:", error);
    } finally {
      setLoading(false);
    }
  };

  const totalCompleted = users.reduce((sum, u) => sum + u.tasksCompleted, 0);
  const totalNotDone = users.reduce((sum, u) => sum + u.tasksNotDone, 0);
  const totalTasks = users.reduce((sum, u) => sum + u.totalTasks, 0);
  const totalSkippedByTool = users.reduce((sum, u) => sum + u.tasksSkippedByTool, 0);
  const overallRate = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;

  const formatMinutes = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (h === 0) return `${m}min`;
    return m > 0 ? `${h}h${m}min` : `${h}h`;
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Produtividade</h1>
            <p className="text-muted-foreground">
              Acompanhe o desempenho da equipe e métricas de qualidade
            </p>
          </div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="week">Esta semana</SelectItem>
              <SelectItem value="month">Últimos 30 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total de Tarefas</span>
            </div>
            <p className="text-3xl font-bold">{totalTasks}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <span className="text-sm text-muted-foreground">Concluídas</span>
            </div>
            <p className="text-3xl font-bold text-success">{totalCompleted}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="h-5 w-5 text-critical" />
              <span className="text-sm text-muted-foreground">Não Realizadas</span>
            </div>
            <p className="text-3xl font-bold text-critical">{totalNotDone}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">Taxa de Conclusão</span>
            </div>
            <p
              className={cn(
                "text-3xl font-bold",
                overallRate >= 80 ? "text-success" : overallRate >= 50 ? "text-warning" : "text-critical"
              )}
            >
              {overallRate}%
            </p>
          </div>
          {totalSkippedByTool > 0 && (
            <div className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 mb-2">
                <Wrench className="h-5 w-5 text-warning" />
                <span className="text-sm text-muted-foreground">Puladas (Ferramenta)</span>
              </div>
              <p className="text-3xl font-bold text-warning">{totalSkippedByTool}</p>
            </div>
          )}
        </div>

        {/* Daily chart visual */}
        {dailyStats.length > 1 && (
          <div className="bg-card rounded-xl border border-border p-6">
            <h2 className="font-semibold mb-4">Tarefas por Dia</h2>
            <div className="flex items-end gap-2 h-32">
              {dailyStats.map((stat) => {
                const total = stat.completed + stat.notDone + stat.pending;
                const maxTotal = Math.max(
                  ...dailyStats.map((s) => s.completed + s.notDone + s.pending)
                );
                const height = maxTotal > 0 ? (total / maxTotal) * 100 : 0;

                return (
                  <div key={stat.date} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-muted rounded-t relative overflow-hidden"
                      style={{ height: `${height}%`, minHeight: "4px" }}
                    >
                      <div
                        className="absolute bottom-0 w-full bg-success"
                        style={{
                          height: `${total > 0 ? (stat.completed / total) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(stat.date), "dd/MM")}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-center gap-6 mt-4 text-xs">
              <span className="flex items-center gap-1">
                <div className="h-3 w-3 rounded bg-success" /> Concluídas
              </span>
              <span className="flex items-center gap-1">
                <div className="h-3 w-3 rounded bg-muted" /> Pendentes/Não realizadas
              </span>
            </div>
          </div>
        )}

        {/* User ranking with efficiency */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Eficiência por Colaborador
          </h2>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum dado de produtividade para o período selecionado
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((user, index) => {
                const isExpanded = expandedUser === user.userId;
                return (
                  <div key={user.userId} className="rounded-xl border overflow-hidden">
                    {/* Summary row */}
                    <div
                      className={cn(
                        "flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/20 transition-colors",
                        index === 0 && "border-primary bg-primary/5"
                      )}
                      onClick={() => setExpandedUser(isExpanded ? null : user.userId)}
                    >
                      <div
                        className={cn(
                          "h-10 w-10 rounded-full flex items-center justify-center font-bold text-lg shrink-0",
                          index === 0
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground"
                        )}
                      >
                        {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium truncate">{user.userName}</span>
                          {user.shiftName && (
                            <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                              {user.shiftName}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1 flex-wrap">
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-success" />
                            {user.tasksCompleted}/{user.totalTasks}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            ~{user.avgTimeMinutes}min/tarefa
                          </span>
                          <span className="flex items-center gap-1">
                            <CalendarClock className="h-3 w-3" />
                            {Math.round(user.totalActiveMinutes / 60)}h/{Math.round(user.totalShiftMinutes / 60)}h jornada
                          </span>
                          {user.totalPauseMinutes > 0 && (
                            <span className="flex items-center gap-1 text-violet-500">
                              <Pause className="h-3 w-3" />
                              {formatMinutes(user.totalPauseMinutes)} pausas
                            </span>
                          )}
                          {user.tasksSkippedByTool > 0 && (
                            <span className="flex items-center gap-1 text-warning">
                              <Wrench className="h-3 w-3" />
                              {user.tasksSkippedByTool} por ferramenta
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p
                          className={cn(
                            "text-2xl font-bold",
                            user.completionRate >= 80
                              ? "text-success"
                              : user.completionRate >= 50
                              ? "text-warning"
                              : "text-critical"
                          )}
                        >
                          {user.completionRate}%
                        </p>
                        <p className="text-xs text-muted-foreground">conclusão</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div
                          className={cn(
                            "flex items-center gap-1 px-2 py-1 rounded-full text-xs",
                            user.onTimeRate >= 80
                              ? "bg-success/10 text-success"
                              : user.onTimeRate >= 50
                              ? "bg-warning/10 text-warning"
                              : "bg-critical/10 text-critical"
                          )}
                        >
                          {user.onTimeRate >= 80 ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          {user.onTimeRate}% no prazo
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="border-t border-border bg-muted/10 p-4 space-y-4">
                        {/* Utilization bar */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2 font-medium">
                              <Timer className="h-4 w-4 text-primary" />
                              Utilização da Jornada
                            </span>
                            <span className={cn(
                              "font-bold",
                              user.utilizationRate >= 80 ? "text-success" :
                              user.utilizationRate >= 50 ? "text-warning" : "text-critical"
                            )}>
                              {user.utilizationRate}%
                            </span>
                          </div>
                          <Progress
                            value={Math.min(user.utilizationRate, 100)}
                            className="h-3"
                          />
                          <div className="flex justify-between text-xs text-muted-foreground flex-wrap gap-1">
                            <span>Tempo ativo: {formatMinutes(user.totalActiveMinutes)}</span>
                            {user.totalPauseMinutes > 0 && (
                              <span className="text-violet-500">⏸ Pausas: {formatMinutes(user.totalPauseMinutes)}</span>
                            )}
                            {user.totalRestMinutes > 0 && (
                              <span>☕ Descanso: {Math.round(user.totalRestMinutes)}min</span>
                            )}
                            <span>Jornada: {Math.round(user.totalShiftMinutes)}min</span>
                          </div>
                        </div>

                        {/* Task detail table */}
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-primary" />
                            Detalhamento de Tarefas
                          </h4>
                          <div className="rounded-lg border border-border overflow-hidden">
                            <div className="grid grid-cols-[1fr_60px_60px_60px_50px_60px] gap-2 p-2 bg-muted/30 text-xs font-medium text-muted-foreground">
                              <span>Tarefa</span>
                              <span className="text-center">Estimado</span>
                              <span className="text-center">Real</span>
                              <span className="text-center">Ativo</span>
                              <span className="text-center">⏸</span>
                              <span className="text-center">Eficiência</span>
                            </div>
                            {user.tasks
                              .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
                              .map((task, i) => {
                                const efficiency = task.estimatedMinutes > 0 && task.activeMinutes > 0
                                  ? Math.round((task.estimatedMinutes / task.activeMinutes) * 100)
                                  : null;
                                const isOver = task.activeMinutes > task.estimatedMinutes * 1.2;
                                const isFast = task.activeMinutes > 0 && task.activeMinutes < task.estimatedMinutes * 0.5;

                                return (
                                  <div
                                    key={i}
                                    className={cn(
                                      "grid grid-cols-[1fr_60px_60px_60px_50px_60px] gap-2 p-2 text-sm items-center border-t border-border",
                                      task.status === "not_done" && "opacity-50"
                                    )}
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      {task.status === "completed" ? (
                                        <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                                      ) : task.status === "not_done" ? (
                                        <XCircle className="h-3.5 w-3.5 text-critical shrink-0" />
                                      ) : (
                                        <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                      )}
                                      <span className="truncate">{task.taskName}</span>
                                      {task.skippedByTool && (
                                        <Badge variant="outline" className="text-[9px] h-4 border-warning/50 text-warning bg-warning/10 shrink-0">
                                          <Wrench className="h-2 w-2 mr-0.5" /> Ferramenta
                                        </Badge>
                                      )}
                                    </div>
                                    <span className="text-center text-muted-foreground text-xs">
                                      {task.estimatedMinutes}min
                                    </span>
                                    <span className="text-center text-xs">
                                      {task.status === "completed" ? `${task.actualMinutes}min` : "—"}
                                    </span>
                                    <span className={cn(
                                      "text-center text-xs font-medium",
                                      isOver ? "text-critical" : isFast ? "text-warning" : "text-foreground"
                                    )}>
                                      {task.status === "completed" ? `${task.activeMinutes}min` : "—"}
                                    </span>
                                    <span className="text-center text-xs text-violet-500">
                                      {task.totalPauseMinutes > 0 ? `${task.totalPauseMinutes}m` : "—"}
                                    </span>
                                    <span className="text-center">
                                      {task.status === "completed" && efficiency !== null ? (
                                        <span className={cn(
                                          "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium",
                                          efficiency >= 100 ? "bg-success/10 text-success" :
                                          efficiency >= 70 ? "bg-warning/10 text-warning" :
                                          "bg-critical/10 text-critical"
                                        )}>
                                          {efficiency}%
                                        </span>
                                      ) : "—"}
                                    </span>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Alerts section */}
        {users.some((u) => u.completionRate < 50) && (
          <div className="bg-warning/10 border border-warning/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <span className="font-medium text-warning">Atenção</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {users.filter((u) => u.completionRate < 50).length} funcionário(s) com taxa de conclusão
              abaixo de 50%. Considere verificar carga de trabalho ou necessidade de treinamento.
            </p>
          </div>
        )}

        {users.some((u) => u.utilizationRate > 100) && (
          <div className="bg-critical/10 border border-critical/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-critical" />
              <span className="font-medium text-critical">Sobrecarga</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {users.filter((u) => u.utilizationRate > 100).length} funcionário(s) com tempo em tarefas
              excedendo a jornada disponível. Revise a distribuição de carga.
            </p>
          </div>
        )}

        {totalSkippedByTool > 0 && (
          <div className="bg-warning/10 border border-warning/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Wrench className="h-5 w-5 text-warning" />
              <span className="font-medium text-warning">Ferramentas Indisponíveis</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {totalSkippedByTool} tarefa(s) não foram realizadas por falta de ferramentas.
              Verifique a manutenção das ferramentas na página de Ferramentas.
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
