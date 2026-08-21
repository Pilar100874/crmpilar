import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { X, CheckCircle2, Clock, AlertTriangle, XCircle, Pause, Play } from "lucide-react";
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
}

interface JobFunctionData {
  id: string;
  name: string;
  sector_id: string | null;
}

interface SectorData {
  id: string;
  name: string;
  color: string;
}

interface ShiftData {
  id: string;
  start_time: string;
  end_time: string;
  work_days: number[];
  lunch_start: string | null;
  lunch_end: string | null;
  day_schedules: any;
}

interface TaskRow {
  id: string;
  taskName: string;
  status: string;
  estimatedMinutes: number;
  timeSpentMinutes: number | null;
  priority: number;
  startedAt: string | null;
  completedAt: string | null;
  plannedStartTime: string | null;
}

interface UserRow {
  userId: string;
  userName: string;
  sectorId: string | null;
  sectorName: string;
  sectorColor: string;
  functionName: string;
  tasks: TaskRow[];
  completedCount: number;
  totalCount: number;
  idleMinutes: number;
  availableMinutes: number;
}

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; label: string; bg: string; text: string; border: string }> = {
  completed: {
    icon: <CheckCircle2 className="h-4 w-4" />,
    label: "Concluída",
    bg: "bg-success/15",
    text: "text-success",
    border: "border-success/40",
  },
  in_progress: {
    icon: <Play className="h-4 w-4" />,
    label: "Em execução",
    bg: "bg-primary/15",
    text: "text-primary",
    border: "border-primary/40",
  },
  delayed: {
    icon: <AlertTriangle className="h-4 w-4" />,
    label: "Atrasada",
    bg: "bg-warning/15",
    text: "text-warning",
    border: "border-warning/40",
  },
  not_done: {
    icon: <XCircle className="h-4 w-4" />,
    label: "Não feita",
    bg: "bg-critical/15",
    text: "text-critical",
    border: "border-critical/40",
  },
  pending: {
    icon: <Clock className="h-4 w-4" />,
    label: "Pendente",
    bg: "bg-muted",
    text: "text-muted-foreground",
    border: "border-border",
  },
  paused: {
    icon: <Pause className="h-4 w-4" />,
    label: "Pausada",
    bg: "bg-orange-500/15",
    text: "text-orange-500",
    border: "border-orange-500/40",
  },
};

const abbreviateSector = (name: string): string => {
  if (!name) return "";
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return name.length <= 5 ? name.toUpperCase() : name.slice(0, 4).toUpperCase();
  return words.map((w) => w[0]).join("").toUpperCase();
};

const timeToMinutes = (t: string) => {
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
};

const formatIdleTime = (min: number) => {
  if (min <= 0) return "";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${m.toString().padStart(2, "0")}`;
};

export default function TVTaskTracker() {
  const [profiles, setProfiles] = useState<ProfileData[]>([]);
  const [jobFunctions, setJobFunctions] = useState<JobFunctionData[]>([]);
  const [sectors, setSectors] = useState<SectorData[]>([]);
  const [shifts, setShifts] = useState<ShiftData[]>([]);
  const [executions, setExecutions] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [absences, setAbsences] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [baseLoaded, setBaseLoaded] = useState(false);
  const navigate = useNavigate();
  const { data: frequenciesList = [] } = useFrequencies();

  useEffect(() => {
    fetchBaseData();
    const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    document.documentElement.requestFullscreen?.().catch(() => {});
    return () => clearInterval(timeInterval);
  }, []);

  useEffect(() => {
    if (baseLoaded) {
      fetchExecutions();
      const interval = setInterval(fetchExecutions, 15000);
      return () => clearInterval(interval);
    }
  }, [baseLoaded]);

  const fetchBaseData = async () => {
    const [p, jf, s, sh, t, abs] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name, job_function_id, shift_id").eq("is_active", true),
      supabase.from("job_functions").select("id, name, sector_id"),
      supabase.from("sectors").select("id, name, color"),
      supabase.from("shifts").select("id, start_time, end_time, work_days, lunch_start, lunch_end, day_schedules"),
      supabase.from("task_templates").select("id, name, estimated_time_minutes, frequency, job_function_id, default_assigned_user_id, priority, is_active, sector_id").eq("is_active", true).eq("is_irregularity_template", false),
      supabase.from("absences").select("user_id, absence_date").eq("absence_date", format(new Date(), "yyyy-MM-dd")),
    ]);
    setProfiles(p.data || []);
    setJobFunctions(jf.data || []);
    setSectors((s.data || []).map((sec: any) => ({ ...sec, color: sec.color || "#3b82f6" })));
    setShifts((sh.data || []) as unknown as ShiftData[]);
    setTemplates(t.data || []);
    setAbsences(abs.data || []);
    setBaseLoaded(true);
  };

  const fetchExecutions = async () => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const { data } = await supabase
      .from("task_executions")
      .select(`
        id, status, time_spent_minutes, assigned_user_id, executed_by_user_id, 
        started_at, completed_at, planned_start_time, priority_score, paused_at,
        task_templates (name, estimated_time_minutes, priority, sector_id)
      `)
      .eq("scheduled_date", todayStr)
      .order("planned_start_time", { ascending: true, nullsFirst: false });
    setExecutions(data || []);
  };

  const getTemplatesForUser = useCallback((userId: string) => {
    const profile = profiles.find((p) => p.user_id === userId);
    const userFunction = profile?.job_function_id ? jobFunctions.find((jf) => jf.id === profile.job_function_id) : null;
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

  // Build user rows grouped by sector
  const userRows = useMemo((): UserRow[] => {
    const today = new Date();
    const dow = today.getDay();
    const absentUserIds = new Set(absences.map((a: any) => a.user_id));
    const rows: UserRow[] = [];

    for (const profile of profiles) {
      const shift = shifts.find((s) => s.id === profile.shift_id);
      if (!shift || !shift.work_days.includes(dow)) continue;
      if (absentUserIds.has(profile.user_id)) continue;

      const jf = profile.job_function_id ? jobFunctions.find((f) => f.id === profile.job_function_id) : null;
      const sectorId = jf ? (jf as any).sector_id : null;
      const sector = sectorId ? sectors.find((s) => s.id === sectorId) : null;

      // Get executions for this user
      const userExecs = executions.filter(
        (e: any) => e.assigned_user_id === profile.user_id || e.executed_by_user_id === profile.user_id
      );

      let tasks: TaskRow[];

      if (userExecs.length > 0) {
        tasks = userExecs.map((e: any) => ({
          id: e.id,
          taskName: (e.task_templates as any)?.name || "Tarefa",
          status: e.paused_at ? "paused" : (e.status || "pending"),
          estimatedMinutes: (e.task_templates as any)?.estimated_time_minutes || 30,
          timeSpentMinutes: e.time_spent_minutes,
          priority: (e.task_templates as any)?.priority || 5,
          startedAt: e.started_at,
          completedAt: e.completed_at,
          plannedStartTime: e.planned_start_time,
        }));
      } else {
        // Use templates as planned tasks
        const userTemplates = getTemplatesForUser(profile.user_id);
        tasks = userTemplates
          .filter((t) => shouldFreqRun(t.frequency, today))
          .sort((a, b) => {
            if ((b.priority || 5) !== (a.priority || 5)) return (b.priority || 5) - (a.priority || 5);
            const aOrder = (a as any).priority_order ?? -1;
            const bOrder = (b as any).priority_order ?? -1;
            return bOrder - aOrder;
          })
          .map((t) => ({
            id: t.id,
            taskName: t.name,
            status: "pending",
            estimatedMinutes: t.estimated_time_minutes || 30,
            timeSpentMinutes: null,
            priority: t.priority || 5,
            startedAt: null,
            completedAt: null,
            plannedStartTime: null,
          }));
      }

      if (tasks.length === 0) continue;

      const completedCount = tasks.filter((t) => t.status === "completed").length;

      // Calculate idle time
      const dayOfWeek = today.getDay();
      const daySchedules = (shift.day_schedules || []) as any[];
      const daySchedule = daySchedules.find?.((ds: any) => ds.day === dayOfWeek);
      const shiftStartStr = daySchedule?.start || shift.start_time?.slice(0, 5) || "08:00";
      const shiftEndStr = daySchedule?.end || shift.end_time?.slice(0, 5) || "17:00";
      const lunchStartStr = daySchedule?.lunchStart || (shift.lunch_start ? shift.lunch_start.slice(0, 5) : null);
      const lunchEndStr = daySchedule?.lunchEnd || (shift.lunch_end ? shift.lunch_end.slice(0, 5) : null);
      const shiftStartMin = timeToMinutes(shiftStartStr);
      const shiftEndMin = timeToMinutes(shiftEndStr);
      const lunchDuration = (lunchStartStr && lunchEndStr) ? Math.max(0, timeToMinutes(lunchEndStr) - timeToMinutes(lunchStartStr)) : 0;
      const availableMinutes = (shiftEndMin - shiftStartMin) - lunchDuration;
      const totalTaskMin = tasks.reduce((sum, t) => sum + t.estimatedMinutes, 0);
      const idleMinutes = Math.max(0, availableMinutes - totalTaskMin);

      rows.push({
        userId: profile.user_id,
        userName: profile.full_name,
        sectorId: sectorId,
        sectorName: sector?.name || "Sem setor",
        sectorColor: sector?.color || "#6b7280",
        functionName: jf?.name || "",
        tasks,
        completedCount,
        totalCount: tasks.length,
        idleMinutes,
        availableMinutes,
      });
    }

    // Sort by sector, then by name
    rows.sort((a, b) => {
      if (a.sectorName !== b.sectorName) return a.sectorName.localeCompare(b.sectorName);
      return a.userName.localeCompare(b.userName);
    });

    return rows;
  }, [profiles, jobFunctions, sectors, shifts, executions, absences, templates, frequenciesList]);

  // Group rows by sector
  const sectorGroups = useMemo(() => {
    const map = new Map<string, { sectorName: string; sectorColor: string; users: UserRow[] }>();
    for (const row of userRows) {
      const key = row.sectorId || "none";
      if (!map.has(key)) {
        map.set(key, { sectorName: row.sectorName, sectorColor: row.sectorColor, users: [] });
      }
      map.get(key)!.users.push(row);
    }
    return [...map.values()];
  }, [userRows]);

  const totalUsers = userRows.length;
  const totalTasks = userRows.reduce((s, r) => s + r.totalCount, 0);
  const totalCompleted = userRows.reduce((s, r) => s + r.completedCount, 0);
  const completionPct = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;

  const exitTVMode = () => {
    document.exitFullscreen?.().catch(() => {});
    navigate("/");
  };

  // Airport-style auto-scroll
  const contentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const SCROLL_INTERVAL = 8000; // 8 seconds per page

  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const calcPages = () => {
      const containerH = container.clientHeight;
      const contentH = content.scrollHeight;
      const pages = Math.max(1, Math.ceil(contentH / containerH));
      setTotalPages(pages);
      if (pages <= 1) setCurrentPage(0);
    };

    calcPages();
    const resObs = new ResizeObserver(calcPages);
    resObs.observe(container);
    resObs.observe(content);
    return () => resObs.disconnect();
  }, [sectorGroups]);

  useEffect(() => {
    if (totalPages <= 1) return;
    const interval = setInterval(() => {
      setCurrentPage((prev) => (prev + 1) % totalPages);
    }, SCROLL_INTERVAL);
    return () => clearInterval(interval);
  }, [totalPages]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const pageH = container.clientHeight;
    container.scrollTo({ top: currentPage * pageH, behavior: "smooth" });
  }, [currentPage]);

  return (
    <div className="h-screen flex flex-col bg-background p-3 lg:p-4 overflow-hidden">
      {/* Header compact */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-foreground">Rastreamento de Tarefas</h1>
          <div className="hidden lg:flex items-center gap-4 text-xs text-muted-foreground">
            <span>{totalUsers} colab.</span>
            <span className="text-success font-bold">{totalCompleted}/{totalTasks}</span>
            <span className="font-mono font-bold text-primary">{completionPct}%</span>
          </div>
          <span className="text-muted-foreground mx-1">|</span>
          {/* Legend inline */}
          <div className="hidden lg:flex items-center gap-3 text-[10px]">
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <span key={key} className={cn("flex items-center gap-1", cfg.text)}>
                {cfg.icon} {cfg.label}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-lg font-mono font-bold">{currentTime.toLocaleTimeString("pt-BR")}</p>
            <p className="text-[10px] text-muted-foreground">{currentTime.toLocaleDateString("pt-BR", { weekday: 'short', day: 'numeric', month: 'short' })}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={exitTVMode}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content area — scrollable container */}
      <div ref={containerRef} className="flex-1 overflow-hidden relative">
        <div ref={contentRef} className="border rounded-xl overflow-hidden min-h-full flex flex-col">
          {sectorGroups.map((group, gi) => (
            <div key={gi} className="flex items-stretch flex-1">
              <div
                className="shrink-0 w-6 flex items-center justify-center"
                style={{ backgroundColor: group.sectorColor }}
              >
                <span
                  className="text-white text-[9px] font-bold uppercase tracking-wider whitespace-nowrap"
                  style={{ writingMode: "vertical-rl", textOrientation: "mixed", transform: "rotate(180deg)" }}
                >
                  {abbreviateSector(group.sectorName)}
                </span>
              </div>

              <div className="flex-1 divide-y divide-border">
                {group.users.map((userRow) => {
                  const pct = userRow.totalCount > 0 ? Math.round((userRow.completedCount / userRow.totalCount) * 100) : 0;
                  const allDone = pct === 100;
                  const hasIssue = userRow.tasks.some((t) => t.status === "delayed" || t.status === "not_done");

                  return (
                    <div
                      key={userRow.userId}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 transition-colors",
                        allDone && "bg-success/5",
                        hasIssue && !allDone && "bg-warning/5"
                      )}
                    >
                      <div className="w-32 lg:w-40 shrink-0 flex items-center gap-1.5">
                        <span
                          className={cn(
                            "shrink-0 text-[10px] font-mono font-bold w-7 text-right",
                            allDone ? "text-success" : hasIssue ? "text-warning" : "text-primary"
                          )}
                        >
                          {pct}%
                        </span>
                        <p className="font-semibold text-sm text-foreground truncate">{userRow.userName}</p>
                      </div>

                      <div className="flex-1 flex flex-wrap gap-1 min-w-0">
                        {userRow.tasks.map((task, ti) => {
                          const cfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
                          return (
                            <div
                              key={task.id + ti}
                              className={cn(
                                "flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] leading-tight transition-all",
                                task.status === "in_progress" ? "max-w-none" : "max-w-[180px]",
                                cfg.bg,
                                cfg.border,
                                cfg.text
                              )}
                              title={`${task.taskName} — ${cfg.label} — Est: ${task.estimatedMinutes}min${task.timeSpentMinutes ? ` — Real: ${task.timeSpentMinutes}min` : ""}`}
                            >
                              <span className="shrink-0">{cfg.icon}</span>
                              <span className={cn("font-medium", task.status !== "in_progress" && "truncate")}>{task.taskName}</span>
                            </div>
                          );
                        })}
                      </div>

                      <div className="shrink-0 w-16 text-right">
                        {userRow.idleMinutes >= 15 ? (
                          <div
                            className={cn(
                              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold",
                              userRow.idleMinutes >= userRow.availableMinutes * 0.5
                                ? "bg-destructive/15 text-destructive"
                                : userRow.idleMinutes >= userRow.availableMinutes * 0.25
                                ? "bg-orange-500/15 text-orange-500"
                                : "bg-warning/15 text-warning"
                            )}
                            title={`Ocioso: ${formatIdleTime(userRow.idleMinutes)} de ${formatIdleTime(userRow.availableMinutes)} disponíveis`}
                          >
                            <Clock className="h-3 w-3" />
                            {formatIdleTime(userRow.idleMinutes)}
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">—</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {sectorGroups.length === 0 && (
            <div className="text-center py-20 text-muted-foreground text-lg">
              Nenhuma tarefa encontrada para hoje
            </div>
          )}
        </div>
      </div>

      {/* Page indicator — airport style */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-1.5">
          {Array.from({ length: totalPages }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all duration-500",
                i === currentPage ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
