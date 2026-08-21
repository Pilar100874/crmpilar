import { useEffect, useState, useMemo, useCallback } from "react";
import { AppLayout } from "@/components/operacional-hub/layout/AppLayout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  format, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  addDays, addWeeks, subWeeks, addMonths, subMonths,
  eachDayOfInterval, subDays,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { useFrequencies } from "@/hooks/operacional-hub/useFrequencies";
import {
  ChevronLeft, ChevronRight, Clock, CheckCircle2, XCircle,
  AlertTriangle, TrendingUp, TrendingDown, Minus, Users, BarChart3,
  Timer, Target, CalendarDays, ChevronDown, ChevronUp, Camera,
  Coffee, UtensilsCrossed, MapPin, Eye, FileWarning, Briefcase,
  Pause, Wrench,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer,
  CartesianGrid, Legend, Cell, PieChart, Pie,
} from "recharts";

type Period = "daily" | "weekly" | "monthly";

interface ProfileData {
  user_id: string;
  full_name: string;
  job_function_id: string | null;
  shift_id: string | null;
}

interface ShiftData {
  id: string;
  start_time: string;
  end_time: string;
  lunch_start: string | null;
  lunch_end: string | null;
  work_days: number[];
}

interface TemplateData {
  id: string;
  name: string;
  estimated_time_minutes: number | null;
  frequency: string;
  job_function_id: string | null;
  default_assigned_user_id: string | null;
  priority: number | null;
  priority_order: number | null;
  is_active: boolean;
  sector_id: string | null;
}

interface JobFunctionData {
  id: string;
  name: string;
  sector_id: string | null;
}

const timeToMinutes = (t: string) => {
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
};

export default function PlannedVsActual() {
  const [period, setPeriod] = useState<Period>("daily");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [filterFunctionId, setFilterFunctionId] = useState<string>("");
  const [profiles, setProfiles] = useState<ProfileData[]>([]);
  const [jobFunctions, setJobFunctions] = useState<JobFunctionData[]>([]);
  const [shifts, setShifts] = useState<ShiftData[]>([]);
  const [templates, setTemplates] = useState<TemplateData[]>([]);
  const [executions, setExecutions] = useState<any[]>([]);
  const [absences, setAbsences] = useState<any[]>([]);
  const [taskDependencies, setTaskDependencies] = useState<{ task_template_id: string; depends_on_template_id: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"charts" | "taskmap">("taskmap");
  const [toolsByTemplate, setToolsByTemplate] = useState<Record<string, string[]>>({});
  const { data: frequenciesList = [] } = useFrequencies();

  const shouldFreqRun = (freqName: string, date: Date) => {
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
  };

  useEffect(() => {
    fetchBaseData();
  }, []);

  useEffect(() => {
    if (profiles.length > 0) fetchPeriodData();
  }, [selectedDate, period, profiles]);

  const fetchBaseData = async () => {
    const [p, s, t, d, jf, ttTools, toolsRes] = await Promise.all([
      supabase.from("op_profiles").select("user_id, full_name, job_function_id, shift_id").eq("is_active", true).order("full_name"),
      supabase.from("op_shifts").select("id, start_time, end_time, lunch_start, lunch_end, work_days"),
      supabase.from("op_task_templates").select("id, name, estimated_time_minutes, frequency, job_function_id, default_assigned_user_id, priority, priority_order, is_active, sector_id").eq("is_active", true).eq("is_irregularity_template", false),
      supabase.from("op_task_dependencies").select("task_template_id, depends_on_template_id"),
      supabase.from("op_job_functions").select("id, name, sector_id").order("name"),
      supabase.from("op_task_template_tools").select("task_template_id, tool_id"),
      supabase.from("op_tools").select("id, name"),
    ]);
    setProfiles(p.data || []);
    setShifts((s.data || []) as unknown as ShiftData[]);
    setTemplates(t.data || []);
    setTaskDependencies(d.data || []);
    setJobFunctions(jf.data || []);

    // Build tool names by template
    const toolMap: Record<string, string> = {};
    (toolsRes.data || []).forEach((tool: any) => { toolMap[tool.id] = tool.name; });
    const byTemplate: Record<string, string[]> = {};
    (ttTools.data || []).forEach((link: any) => {
      if (!byTemplate[link.task_template_id]) byTemplate[link.task_template_id] = [];
      const name = toolMap[link.tool_id];
      if (name) byTemplate[link.task_template_id].push(name);
    });
    setToolsByTemplate(byTemplate);

    setLoading(false);
  };

  const dateRange = useMemo(() => {
    if (period === "daily") return { start: selectedDate, end: selectedDate };
    if (period === "weekly") return { start: startOfWeek(selectedDate, { weekStartsOn: 1 }), end: endOfWeek(selectedDate, { weekStartsOn: 1 }) };
    return { start: startOfMonth(selectedDate), end: endOfMonth(selectedDate) };
  }, [selectedDate, period]);

  const fetchPeriodData = async () => {
    if (profiles.length === 0) return;
    setLoading(true);
    const startStr = format(dateRange.start, "yyyy-MM-dd");
    const endStr = format(dateRange.end, "yyyy-MM-dd");

    const [exec, abs] = await Promise.all([
      supabase
        .from("op_task_executions")
        .select("id, assigned_user_id, executed_by_user_id, scheduled_date, status, time_spent_minutes, started_at, completed_at, task_template_id, observations, quality_score, is_suspicious, suspicious_reason, was_redistributed, pause_count, total_pause_minutes, pause_reason, planned_start_time, actual_start_time, task_templates:op_task_templates(name, estimated_time_minutes, priority, frequency, is_irregularity_template)")
        .gte("scheduled_date", startStr)
        .lte("scheduled_date", endStr),
      supabase
        .from("op_absences")
        .select("user_id, absence_date")
        .gte("absence_date", startStr)
        .lte("absence_date", endStr),
    ]);
    setExecutions(exec.data || []);
    setAbsences(abs.data || []);
    setLoading(false);
  };

  const navigate = (dir: number) => {
    if (period === "daily") setSelectedDate((d) => addDays(d, dir));
    else if (period === "weekly") setSelectedDate((d) => dir > 0 ? addWeeks(d, 1) : subWeeks(d, 1));
    else setSelectedDate((d) => dir > 0 ? addMonths(d, 1) : subMonths(d, 1));
  };

  const periodLabel = useMemo(() => {
    if (period === "daily") return format(selectedDate, "EEEE, dd/MM/yyyy", { locale: ptBR });
    if (period === "weekly") return `${format(dateRange.start, "dd/MM")} - ${format(dateRange.end, "dd/MM/yyyy", { locale: ptBR })}`;
    return format(selectedDate, "MMMM yyyy", { locale: ptBR });
  }, [selectedDate, period, dateRange]);

  // Filtered profiles by function
  const filteredProfiles = useMemo(() => {
    if (!filterFunctionId) return profiles;
    return profiles.filter((p) => p.job_function_id === filterFunctionId);
  }, [profiles, filterFunctionId]);

  const selectAllInFunction = () => {
    const ids = filteredProfiles.map((p) => p.user_id);
    setSelectedUserIds(ids);
  };

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  // Same template matching as ScheduleSimulation
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

  const activeUsers = useMemo(() => {
    if (selectedUserIds.length === 0) return profiles;
    return profiles.filter((p) => selectedUserIds.includes(p.user_id));
  }, [selectedUserIds, profiles]);

  // Count planned tasks for a user in a date range
  const getPlannedForUser = (userId: string) => {
    const profile = profiles.find((p) => p.user_id === userId);
    const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });

    let planned = 0;
    let plannedMinutes = 0;

    for (const day of days) {
      const dow = day.getDay();
      const shift = shifts.find((s) => s.id === profile?.shift_id);
      if (!shift || !shift.work_days.includes(dow)) continue;
      if (absences.some((a) => a.user_id === userId && a.absence_date === format(day, "yyyy-MM-dd"))) continue;

      const userTemplates = getTemplatesForUser(userId);

      for (const tmpl of userTemplates) {
        if (shouldFreqRun(tmpl.frequency, day)) { planned++; plannedMinutes += tmpl.estimated_time_minutes || 30; }
      }
    }
    return { planned, plannedMinutes };
  };

  // Build per-user stats
  const userStats = useMemo(() => {
    return activeUsers.map((profile) => {
      const userId = profile.user_id;
      const userExec = executions.filter((e) => e.assigned_user_id === userId || e.executed_by_user_id === userId);
      const { planned, plannedMinutes } = getPlannedForUser(userId);

      const completed = userExec.filter((e) => e.status === "completed").length;
      const notDone = userExec.filter((e) => e.status === "not_done").length;
      const delayed = userExec.filter((e) => e.status === "delayed").length;
      const inProgress = userExec.filter((e) => e.status === "in_progress").length;
      const pending = userExec.filter((e) => e.status === "pending").length;
      const total = userExec.length;

      const actualMinutes = userExec
        .filter((e) => e.status === "completed" && e.time_spent_minutes)
        .reduce((sum: number, e: any) => sum + (e.time_spent_minutes || 0), 0);

      const estimatedForCompleted = userExec
        .filter((e) => e.status === "completed")
        .reduce((sum: number, e: any) => sum + ((e.task_templates as any)?.estimated_time_minutes || 30), 0);

      const completionRate = planned > 0 ? Math.round((completed / planned) * 100) : 0;
      const efficiency = estimatedForCompleted > 0 ? Math.round((estimatedForCompleted / Math.max(actualMinutes, 1)) * 100) : 0;

      return {
        userId, name: profile.full_name,
        planned, plannedMinutes,
        completed, notDone, delayed, inProgress, pending, total,
        actualMinutes, estimatedForCompleted,
        completionRate, efficiency,
      };
    });
  }, [activeUsers, executions, templates, shifts, absences, dateRange, jobFunctions]);

  // Aggregate totals
  const totals = useMemo(() => {
    const t = userStats.reduce((acc, u) => ({
      planned: acc.planned + u.planned,
      completed: acc.completed + u.completed,
      notDone: acc.notDone + u.notDone,
      delayed: acc.delayed + u.delayed,
      plannedMinutes: acc.plannedMinutes + u.plannedMinutes,
      actualMinutes: acc.actualMinutes + u.actualMinutes,
      estimatedForCompleted: acc.estimatedForCompleted + u.estimatedForCompleted,
    }), { planned: 0, completed: 0, notDone: 0, delayed: 0, plannedMinutes: 0, actualMinutes: 0, estimatedForCompleted: 0 });
    return {
      ...t,
      completionRate: t.planned > 0 ? Math.round((t.completed / t.planned) * 100) : 0,
      efficiency: t.estimatedForCompleted > 0 ? Math.round((t.estimatedForCompleted / Math.max(t.actualMinutes, 1)) * 100) : 0,
    };
  }, [userStats]);

  // Chart data: planned vs completed by day
  const chartData = useMemo(() => {
    const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    return days.map((day) => {
      const dateStr = format(day, "yyyy-MM-dd");
      const dayExec = executions.filter((e) => {
        if (selectedUserIds.length > 0 && !selectedUserIds.includes(e.assigned_user_id) && !selectedUserIds.includes(e.executed_by_user_id)) return false;
        return e.scheduled_date === dateStr;
      });
      const completed = dayExec.filter((e) => e.status === "completed").length;
      const notDone = dayExec.filter((e) => e.status === "not_done").length;
      const delayed = dayExec.filter((e) => e.status === "delayed").length;
      const pending = dayExec.filter((e) => e.status === "pending" || e.status === "in_progress").length;

      let planned = 0;
      const dow = day.getDay();
      for (const profile of activeUsers) {
        const shift = shifts.find((s) => s.id === profile.shift_id);
        if (!shift || !shift.work_days.includes(dow)) continue;
        if (absences.some((a) => a.user_id === profile.user_id && a.absence_date === dateStr)) continue;
        const userTemplates = getTemplatesForUser(profile.user_id);
        for (const tmpl of userTemplates) {
          if (shouldFreqRun(tmpl.frequency, day)) planned++;
        }
      }

      return {
        date: format(day, period === "monthly" ? "dd" : "EEE dd", { locale: ptBR }),
        Previstas: planned,
        Concluídas: completed,
        "Não feitas": notDone,
        Atrasadas: delayed,
        Pendentes: pending,
      };
    });
  }, [executions, dateRange, activeUsers, templates, shifts, absences, selectedUserIds, period, jobFunctions]);

  // Time chart: estimated vs actual
  const timeChartData = useMemo(() => {
    const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    return days.map((day) => {
      const dateStr = format(day, "yyyy-MM-dd");
      const dayExec = executions.filter((e) => {
        if (selectedUserIds.length > 0 && !selectedUserIds.includes(e.assigned_user_id) && !selectedUserIds.includes(e.executed_by_user_id)) return false;
        return e.scheduled_date === dateStr && e.status === "completed";
      });
      const estimated = dayExec.reduce((s: number, e: any) => s + ((e.task_templates as any)?.estimated_time_minutes || 30), 0);
      const actual = dayExec.reduce((s: number, e: any) => s + (e.time_spent_minutes || 0), 0);

      return {
        date: format(day, period === "monthly" ? "dd" : "EEE dd", { locale: ptBR }),
        "Estimado (min)": estimated,
        "Real (min)": actual,
      };
    });
  }, [executions, dateRange, selectedUserIds, period]);

  // Status distribution pie
  const statusPie = useMemo(() => {
    const data = [
      { name: "Concluídas", value: totals.completed, color: "#22c55e" },
      { name: "Não feitas", value: totals.notDone, color: "#ef4444" },
      { name: "Atrasadas", value: totals.delayed, color: "#f97316" },
      { name: "Não geradas", value: Math.max(totals.planned - totals.completed - totals.notDone - totals.delayed, 0), color: "#94a3b8" },
    ].filter((d) => d.value > 0);
    return data;
  }, [totals]);

  const formatMinutes = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (h === 0) return `${m}min`;
    return m > 0 ? `${h}h${m}min` : `${h}h`;
  };

  const minutesToTime = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  };

  const statusConfig: Record<string, { label: string; color: string; bg: string; border: string; icon: any }> = {
    completed: { label: "Concluída", color: "text-emerald-600", bg: "bg-emerald-500/15", border: "border-emerald-500/40", icon: CheckCircle2 },
    not_done: { label: "Não feita", color: "text-red-500", bg: "bg-red-500/15", border: "border-red-500/40", icon: XCircle },
    delayed: { label: "Atrasada", color: "text-orange-500", bg: "bg-orange-500/15", border: "border-orange-500/40", icon: AlertTriangle },
    in_progress: { label: "Em andamento", color: "text-blue-500", bg: "bg-blue-500/15", border: "border-blue-500/40", icon: Clock },
    pending: { label: "Pendente", color: "text-muted-foreground", bg: "bg-muted/30", border: "border-border", icon: Clock },
    planned: { label: "Prevista (não gerada)", color: "text-muted-foreground", bg: "bg-muted/20", border: "border-dashed border-border", icon: Target },
  };

  // Build task map: merge planned templates with actual executions per day/user
  const taskMapData = useMemo(() => {
    const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });

    return days.map((day) => {
      const dateStr = format(day, "yyyy-MM-dd");
      const dow = day.getDay();

      const userRows = activeUsers.map((profile) => {
        const userId = profile.user_id;
        const shift = shifts.find((s) => s.id === profile.shift_id);
        const isWorkDay = shift && shift.work_days.includes(dow);
        const isAbsent = absences.some((a) => a.user_id === userId && a.absence_date === dateStr);

        // Get actual executions for this user/day
        const dayExec = executions.filter(
          (e) => e.scheduled_date === dateStr && (e.assigned_user_id === userId || e.executed_by_user_id === userId)
        );

        // Get planned templates for this user (same logic as simulation)
        const userTemplates = isWorkDay && !isAbsent ? getTemplatesForUser(userId).filter((t) => shouldFreqRun(t.frequency, day)) : [];

        // Build unified task list: match executions to templates, flag extras
        const matchedTemplateIds = new Set<string>();
        const tasks: Array<{
          id: string;
          name: string;
          templateId: string | null;
          estimatedMinutes: number;
          actualMinutes: number | null;
          status: string;
          priority: number;
          priorityOrder: number | null;
          isIrregularity: boolean;
          isExtra: boolean;
          startedAt: string | null;
          completedAt: string | null;
          observations: string | null;
          qualityScore: number | null;
          isSuspicious: boolean;
          suspiciousReason: string | null;
          wasRedistributed: boolean;
          pauseCount: number;
          totalPauseMinutes: number;
          pauseReason: string | null;
          plannedStartTime: string | null;
          actualStartTime: string | null;
          tools: string[];
        }> = [];

        // First add actual executions
        for (const exec of dayExec) {
          const tmpl = exec.task_templates as any;
          const templateId = exec.task_template_id;
          matchedTemplateIds.add(templateId);
          const isIrreg = tmpl?.is_irregularity_template || false;
          const isPlanned = userTemplates.some((t) => t.id === templateId);

          tasks.push({
            id: exec.id,
            name: tmpl?.name || "Tarefa",
            templateId,
            estimatedMinutes: tmpl?.estimated_time_minutes || 30,
            actualMinutes: exec.time_spent_minutes,
            status: exec.status || "pending",
            priority: tmpl?.priority || 5,
            priorityOrder: tmpl?.priority_order ?? null,
            isIrregularity: isIrreg,
            isExtra: !isPlanned || isIrreg,
            startedAt: exec.started_at,
            completedAt: exec.completed_at,
            observations: exec.observations,
            qualityScore: exec.quality_score,
            isSuspicious: exec.is_suspicious || false,
            suspiciousReason: exec.suspicious_reason,
            wasRedistributed: exec.was_redistributed || false,
            pauseCount: exec.pause_count || 0,
            totalPauseMinutes: exec.total_pause_minutes || 0,
            pauseReason: exec.pause_reason,
            plannedStartTime: exec.planned_start_time,
            actualStartTime: exec.actual_start_time,
            tools: toolsByTemplate[templateId] || [],
          });
        }

        // Then add planned templates that weren't executed
        for (const tmpl of userTemplates) {
          if (!matchedTemplateIds.has(tmpl.id)) {
            tasks.push({
              id: `planned-${tmpl.id}`,
              name: tmpl.name,
              templateId: tmpl.id,
              estimatedMinutes: tmpl.estimated_time_minutes || 30,
              actualMinutes: null,
              status: "planned",
              priority: tmpl.priority || 5,
              priorityOrder: tmpl.priority_order ?? null,
              isIrregularity: false,
              isExtra: false,
              startedAt: null,
              completedAt: null,
              observations: null,
              qualityScore: null,
              isSuspicious: false,
              suspiciousReason: null,
              wasRedistributed: false,
              pauseCount: 0,
              totalPauseMinutes: 0,
              pauseReason: null,
              plannedStartTime: null,
              actualStartTime: null,
              tools: toolsByTemplate[tmpl.id] || [],
            });
          }
        }

        // Dependency-aware ordering (same logic as ScheduleSimulation)
        const dependsOnMap = new Map<string, Set<string>>();
        for (const dep of taskDependencies) {
          if (!dependsOnMap.has(dep.task_template_id)) {
            dependsOnMap.set(dep.task_template_id, new Set());
          }
          dependsOnMap.get(dep.task_template_id)!.add(dep.depends_on_template_id);
        }

        const irregTasks = tasks.filter((t) => t.isIrregularity);
        const regularTasks = tasks.filter((t) => !t.isIrregularity);

        const taskTemplateIds = new Set(regularTasks.map((t) => t.templateId).filter(Boolean));
        const dependentsOf = new Map<string, typeof regularTasks>();
        const blockedSet = new Set<string>();
        const readyQueue: typeof regularTasks = [];

        for (const task of regularTasks) {
          if (task.templateId) {
            const deps = dependsOnMap.get(task.templateId);
            if (deps && deps.size > 0) {
              const relevantDeps = [...deps].filter((depId) => taskTemplateIds.has(depId));
              if (relevantDeps.length > 0) {
                blockedSet.add(task.templateId);
                for (const depId of relevantDeps) {
                  if (!dependentsOf.has(depId)) dependentsOf.set(depId, []);
                  dependentsOf.get(depId)!.push(task);
                }
                continue;
              }
            }
          }
          readyQueue.push(task);
        }

        readyQueue.sort((a, b) => {
          if (b.priority !== a.priority) return b.priority - a.priority;
          const aOrder = (a as any).priorityOrder ?? -1;
          const bOrder = (b as any).priorityOrder ?? -1;
          return bOrder - aOrder;
        });

        const orderedTasks: typeof regularTasks = [];
        const completedTemplates = new Set<string>();

        while (readyQueue.length > 0) {
          const task = readyQueue.shift()!;
          orderedTasks.push(task);

          if (task.templateId) {
            completedTemplates.add(task.templateId);
            const unlocked = dependentsOf.get(task.templateId) || [];
            const newlyReady: typeof regularTasks = [];
            for (const dep of unlocked) {
              if (dep.templateId && blockedSet.has(dep.templateId)) {
                const allDeps = dependsOnMap.get(dep.templateId);
                if (allDeps && [...allDeps].filter((id) => taskTemplateIds.has(id)).every((id) => completedTemplates.has(id))) {
                  blockedSet.delete(dep.templateId);
                  newlyReady.push(dep);
                }
              }
            }
            if (newlyReady.length > 0) {
              // Prepend dependents immediately after their prerequisite
              newlyReady.sort((a, b) => {
                if (b.priority !== a.priority) return b.priority - a.priority;
                return (b.priorityOrder ?? -1) - (a.priorityOrder ?? -1);
              });
              readyQueue.unshift(...newlyReady);
            }
          }
        }

        for (const task of regularTasks) {
          if (task.templateId && blockedSet.has(task.templateId)) {
            orderedTasks.push(task);
          }
        }

        tasks.length = 0;
        tasks.push(...orderedTasks, ...irregTasks);

        return { userId, name: profile.full_name, tasks, isWorkDay: !!isWorkDay, isAbsent };
      });

      return {
        date: day,
        dateStr,
        label: format(day, "EEEE dd/MM", { locale: ptBR }),
        shortLabel: format(day, "EEE dd/MM", { locale: ptBR }),
        userRows,
      };
    });
  }, [dateRange, activeUsers, executions, templates, shifts, absences, taskDependencies, jobFunctions, toolsByTemplate]);

  // User colors for multi-select
  const USER_COLORS = [
    { bg: "bg-primary/20", border: "border-primary/40", dot: "bg-primary" },
    { bg: "bg-success/20", border: "border-success/40", dot: "bg-success" },
    { bg: "bg-warning/20", border: "border-warning/40", dot: "bg-warning" },
    { bg: "bg-critical/20", border: "border-critical/40", dot: "bg-critical" },
    { bg: "bg-accent", border: "border-accent-foreground/20", dot: "bg-accent-foreground" },
    { bg: "bg-secondary", border: "border-secondary-foreground/20", dot: "bg-secondary-foreground" },
  ];

  const getUserColor = (userId: string) => {
    const idx = selectedUserIds.indexOf(userId);
    return USER_COLORS[idx >= 0 ? idx % USER_COLORS.length : 0];
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-2">
              <BarChart3 className="h-7 w-7 text-primary" />
              Previsto x Realizado
            </h1>
            <p className="text-muted-foreground">Compare o planejamento com a execução real</p>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-card rounded-xl border border-border p-4 flex flex-wrap items-center gap-4">
          {/* Period selector */}
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Diário</SelectItem>
                <SelectItem value="weekly">Semanal</SelectItem>
                <SelectItem value="monthly">Mensal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date navigation */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[200px] text-center capitalize">{periodLabel}</span>
            <Button variant="outline" size="icon" onClick={() => navigate(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date())}>Hoje</Button>

          {/* View toggle */}
          <div className="flex items-center gap-1 ml-auto bg-muted rounded-lg p-1">
            <Button
              variant={viewMode === "taskmap" ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setViewMode("taskmap")}
            >
              <MapPin className="h-3 w-3 mr-1" /> Mapa de Tarefas
            </Button>
            <Button
              variant={viewMode === "charts" ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setViewMode("charts")}
            >
              <BarChart3 className="h-3 w-3 mr-1" /> Gráficos
            </Button>
          </div>
        </div>

        {/* Filters & user selection (same as Simulation) */}
        <div className="bg-card rounded-xl border border-border p-4 space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Função</span>
            </div>
            <Select value={filterFunctionId || "all"} onValueChange={(v) => setFilterFunctionId(v === "all" ? "" : v)}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Todas as funções" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as funções</SelectItem>
                {jobFunctions.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={selectAllInFunction} className="gap-1">
              <Users className="h-4 w-4" />
              Selecionar todos
            </Button>
            {selectedUserIds.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setSelectedUserIds([])} className="text-xs">
                Limpar seleção
              </Button>
            )}
            {selectedUserIds.length === 0 && (
              <span className="text-xs text-muted-foreground">Nenhum filtro = todos os colaboradores</span>
            )}
          </div>

          {/* User checkboxes */}
          <div className="flex flex-wrap gap-2">
            {filteredProfiles.map((p) => {
              const selected = selectedUserIds.includes(p.user_id);
              const color = selected ? getUserColor(p.user_id) : null;
              return (
                <label
                  key={p.user_id}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg border-2 cursor-pointer text-sm transition-all",
                    selected
                      ? `${color?.bg} ${color?.border} font-medium`
                      : "border-border bg-card hover:border-primary/30"
                  )}
                >
                  <Checkbox
                    checked={selected}
                    onCheckedChange={() => toggleUser(p.user_id)}
                    className="sr-only"
                  />
                  <span className={cn("h-2.5 w-2.5 rounded-full", selected ? color?.dot : "bg-muted-foreground/30")} />
                  {p.full_name}
                </label>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <KpiCard icon={Target} label="Previstas" value={totals.planned} color="text-blue-500" />
              <KpiCard icon={CheckCircle2} label="Concluídas" value={totals.completed} color="text-emerald-500" />
              <KpiCard icon={XCircle} label="Não feitas" value={totals.notDone} color="text-red-500" />
              <KpiCard
                icon={totals.completionRate >= 80 ? TrendingUp : totals.completionRate >= 50 ? Minus : TrendingDown}
                label="Taxa Conclusão"
                value={`${totals.completionRate}%`}
                color={totals.completionRate >= 80 ? "text-emerald-500" : totals.completionRate >= 50 ? "text-orange-500" : "text-red-500"}
              />
              <KpiCard icon={Timer} label="Tempo Previsto" value={formatMinutes(totals.plannedMinutes)} color="text-blue-500" />
              <KpiCard
                icon={Clock}
                label="Eficiência"
                value={`${totals.efficiency}%`}
                color={totals.efficiency >= 90 ? "text-emerald-500" : totals.efficiency >= 70 ? "text-orange-500" : "text-red-500"}
                subtitle={totals.efficiency > 100 ? "Mais rápido que o previsto" : totals.efficiency < 80 ? "Mais lento que o previsto" : "Dentro do esperado"}
              />
            </div>

            {viewMode === "charts" && (
              <>
                {/* Charts row */}
                <div className="grid lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2 bg-card rounded-xl border border-border p-4">
                    <h3 className="text-sm font-semibold mb-4">Tarefas: Previstas vs Concluídas</h3>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <ReTooltip />
                        <Legend />
                        <Bar dataKey="Previstas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Concluídas" fill="#22c55e" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Não feitas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="bg-card rounded-xl border border-border p-4">
                    <h3 className="text-sm font-semibold mb-4">Distribuição de Status</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={statusPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                          {statusPie.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <ReTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap gap-3 justify-center mt-2">
                      {statusPie.map((s) => (
                        <span key={s.name} className="flex items-center gap-1.5 text-xs">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                          {s.name}: {s.value}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Time chart */}
                <div className="bg-card rounded-xl border border-border p-4">
                  <h3 className="text-sm font-semibold mb-4">Tempo: Estimado vs Real (tarefas concluídas)</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={timeChartData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <ReTooltip />
                      <Legend />
                      <Bar dataKey="Estimado (min)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Real (min)" fill="#f97316" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Per-user table */}
                {userStats.length > 1 && (
                  <div className="bg-card rounded-xl border border-border overflow-hidden">
                    <div className="p-4 border-b border-border">
                      <h3 className="text-sm font-semibold flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        Produtividade por Colaborador
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-muted/30">
                            <th className="text-left px-4 py-2 font-medium">Colaborador</th>
                            <th className="text-center px-3 py-2 font-medium">Previstas</th>
                            <th className="text-center px-3 py-2 font-medium">Concluídas</th>
                            <th className="text-center px-3 py-2 font-medium">Não feitas</th>
                            <th className="text-center px-3 py-2 font-medium">Conclusão</th>
                            <th className="text-center px-3 py-2 font-medium">Tempo Previsto</th>
                            <th className="text-center px-3 py-2 font-medium">Tempo Real</th>
                            <th className="text-center px-3 py-2 font-medium">Eficiência</th>
                          </tr>
                        </thead>
                        <tbody>
                          {userStats
                            .sort((a, b) => b.completionRate - a.completionRate)
                            .map((u) => (
                              <tr key={u.userId} className="border-b border-border/50 hover:bg-muted/20">
                                <td className="px-4 py-2.5 font-medium">{u.name}</td>
                                <td className="text-center px-3 py-2.5">{u.planned}</td>
                                <td className="text-center px-3 py-2.5 text-emerald-600 font-medium">{u.completed}</td>
                                <td className="text-center px-3 py-2.5 text-red-500 font-medium">{u.notDone}</td>
                                <td className="text-center px-3 py-2.5">
                                  <Badge variant="outline" className={cn(
                                    "text-xs",
                                    u.completionRate >= 80 ? "border-emerald-500/50 text-emerald-600 bg-emerald-500/10" :
                                    u.completionRate >= 50 ? "border-orange-500/50 text-orange-600 bg-orange-500/10" :
                                    "border-red-500/50 text-red-600 bg-red-500/10"
                                  )}>
                                    {u.completionRate}%
                                  </Badge>
                                </td>
                                <td className="text-center px-3 py-2.5 text-muted-foreground">{formatMinutes(u.estimatedForCompleted)}</td>
                                <td className="text-center px-3 py-2.5">{formatMinutes(u.actualMinutes)}</td>
                                <td className="text-center px-3 py-2.5">
                                  <Badge variant="outline" className={cn(
                                    "text-xs",
                                    u.efficiency >= 90 ? "border-emerald-500/50 text-emerald-600 bg-emerald-500/10" :
                                    u.efficiency >= 70 ? "border-orange-500/50 text-orange-600 bg-orange-500/10" :
                                    "border-red-500/50 text-red-600 bg-red-500/10"
                                  )}>
                                    {u.efficiency}%
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* TASK MAP VIEW */}
            {viewMode === "taskmap" && (
              <div className="space-y-4">
                {taskMapData.map((dayData) => (
                  <div key={dayData.dateStr} className="bg-card rounded-xl border border-border overflow-hidden">
                    {/* Day header */}
                    <div className="px-4 py-2.5 bg-muted/30 border-b border-border flex items-center justify-between">
                      <span className="text-sm font-semibold capitalize">{dayData.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {dayData.userRows.reduce((s, u) => s + u.tasks.length, 0)} tarefas
                      </span>
                    </div>

                    {dayData.userRows.map((userRow) => {
                      if (!userRow.isWorkDay && !userRow.isAbsent && userRow.tasks.length === 0) return null;

                      return (
                        <div key={userRow.userId} className="border-b border-border/50 last:border-b-0">
                          {/* User sub-header */}
                          {activeUsers.length > 1 && (
                            <div className="px-4 py-1.5 bg-muted/10 border-b border-border/30 flex items-center gap-2">
                              <Users className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs font-medium">{userRow.name}</span>
                              {userRow.isAbsent && (
                                <Badge variant="outline" className="text-[10px] h-4 border-orange-500/50 text-orange-600 bg-orange-500/10">Ausente</Badge>
                              )}
                              {!userRow.isWorkDay && (
                                <Badge variant="outline" className="text-[10px] h-4">Folga</Badge>
                              )}
                            </div>
                          )}

                          {userRow.isAbsent || !userRow.isWorkDay ? (
                            <div className="px-4 py-3 text-xs text-muted-foreground italic">
                              {userRow.isAbsent ? "Colaborador ausente neste dia" : "Dia de folga"}
                            </div>
                          ) : userRow.tasks.length === 0 ? (
                            <div className="px-4 py-3 text-xs text-muted-foreground italic">
                              Nenhuma tarefa prevista ou executada
                            </div>
                          ) : (
                            <div className="divide-y divide-border/30">
                              {userRow.tasks.map((task) => {
                                const sc = statusConfig[task.status] || statusConfig.pending;
                                const StatusIcon = sc.icon;
                                const isExpanded = expandedTaskId === task.id;
                                const timeDiff = task.actualMinutes != null ? task.actualMinutes - task.estimatedMinutes : null;
                                const activeMinutes = task.actualMinutes != null ? Math.max(0, task.actualMinutes - task.totalPauseMinutes) : null;

                                return (
                                  <div key={task.id}>
                                    {/* Task row */}
                                    <button
                                      type="button"
                                      className={cn(
                                        "w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-muted/20 transition-colors",
                                        task.status === "planned" && "opacity-50"
                                      )}
                                      onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                                    >
                                      {/* Status icon */}
                                      <div className={cn("shrink-0 h-7 w-7 rounded-lg flex items-center justify-center", sc.bg, sc.border, "border")}>
                                        <StatusIcon className={cn("h-3.5 w-3.5", sc.color)} />
                                      </div>

                                      {/* Task name & badges */}
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm font-medium truncate">{task.name}</span>
                                          {task.isIrregularity && (
                                            <Badge variant="outline" className="text-[10px] h-4 border-purple-500/50 text-purple-600 bg-purple-500/10 shrink-0">
                                              <FileWarning className="h-2.5 w-2.5 mr-0.5" /> Irregularidade
                                            </Badge>
                                          )}
                                          {task.isExtra && !task.isIrregularity && (
                                            <Badge variant="outline" className="text-[10px] h-4 border-blue-500/50 text-blue-600 bg-blue-500/10 shrink-0">
                                              Extra
                                            </Badge>
                                          )}
                                          {task.wasRedistributed && (
                                            <Badge variant="outline" className="text-[10px] h-4 border-orange-500/50 text-orange-600 bg-orange-500/10 shrink-0">
                                              Redistribuída
                                            </Badge>
                                          )}
                                          {task.isSuspicious && (
                                            <Badge variant="outline" className="text-[10px] h-4 border-red-500/50 text-red-500 bg-red-500/10 shrink-0">
                                              ⚠️ Suspeita
                                            </Badge>
                                          )}
                                          {task.pauseCount > 0 && (
                                            <Badge variant="outline" className="text-[10px] h-4 border-violet-500/50 text-violet-600 bg-violet-500/10 shrink-0">
                                              <Pause className="h-2.5 w-2.5 mr-0.5" /> {task.pauseCount}x pausa
                                            </Badge>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
                                          <span>P{task.priority}</span>
                                          <span>Previsto: {formatMinutes(task.estimatedMinutes)}</span>
                                          {task.actualMinutes != null && (
                                            <span className={cn(
                                              "font-medium",
                                              timeDiff != null && timeDiff > 0 ? "text-orange-500" : "text-emerald-500"
                                            )}>
                                              Real: {formatMinutes(task.actualMinutes)}
                                              {timeDiff != null && timeDiff !== 0 && (
                                                <span className="ml-1">({timeDiff > 0 ? "+" : ""}{timeDiff}min)</span>
                                              )}
                                            </span>
                                          )}
                                          {activeMinutes != null && task.totalPauseMinutes > 0 && (
                                            <span className="text-violet-500">
                                              Ativo: {formatMinutes(activeMinutes)}
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      {/* Status badge */}
                                      <Badge variant="outline" className={cn("text-[10px] h-5 shrink-0", sc.bg, sc.border, sc.color)}>
                                        {sc.label}
                                      </Badge>

                                      {/* Expand arrow */}
                                      {task.status !== "planned" && (
                                        isExpanded
                                          ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                                          : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                                      )}
                                    </button>

                                    {/* Expanded detail */}
                                    {isExpanded && task.status !== "planned" && (
                                      <div className="px-4 pb-3 pt-1 ml-10 space-y-2 bg-muted/10 border-t border-border/30">
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                          <div>
                                            <p className="text-muted-foreground">Início Planejado</p>
                                            <p className="font-medium">
                                              {task.plannedStartTime ? task.plannedStartTime.slice(0, 5) : "—"}
                                            </p>
                                          </div>
                                          <div>
                                            <p className="text-muted-foreground">Início Real</p>
                                            <p className={cn("font-medium",
                                              task.actualStartTime && task.plannedStartTime
                                                ? "text-foreground"
                                                : ""
                                            )}>
                                              {task.actualStartTime ? format(new Date(task.actualStartTime), "HH:mm", { locale: ptBR }) :
                                               task.startedAt ? format(new Date(task.startedAt), "HH:mm", { locale: ptBR }) : "—"}
                                            </p>
                                          </div>
                                          <div>
                                            <p className="text-muted-foreground">Conclusão</p>
                                            <p className="font-medium">
                                              {task.completedAt ? format(new Date(task.completedAt), "HH:mm", { locale: ptBR }) : "—"}
                                            </p>
                                          </div>
                                          <div>
                                            <p className="text-muted-foreground">Qualidade</p>
                                            <p className="font-medium">
                                              {task.qualityScore != null ? `${task.qualityScore}/10` : "—"}
                                            </p>
                                          </div>
                                        </div>

                                        {/* Pause metrics row */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                          <div>
                                            <p className="text-muted-foreground flex items-center gap-1"><Pause className="h-3 w-3" /> Pausas</p>
                                            <p className="font-medium">{task.pauseCount > 0 ? `${task.pauseCount}x` : "Nenhuma"}</p>
                                          </div>
                                          <div>
                                            <p className="text-muted-foreground">Tempo pausado</p>
                                            <p className={cn("font-medium", task.totalPauseMinutes > 0 ? "text-violet-500" : "")}>
                                              {task.totalPauseMinutes > 0 ? formatMinutes(task.totalPauseMinutes) : "—"}
                                            </p>
                                          </div>
                                          <div>
                                            <p className="text-muted-foreground">Tempo ativo</p>
                                            <p className="font-medium text-emerald-500">
                                              {activeMinutes != null ? formatMinutes(activeMinutes) : "—"}
                                            </p>
                                          </div>
                                          <div>
                                            <p className="text-muted-foreground">Diferença</p>
                                            <p className={cn("font-medium",
                                              timeDiff != null && timeDiff > 5 ? "text-orange-500" :
                                              timeDiff != null && timeDiff < -5 ? "text-emerald-500" : ""
                                            )}>
                                              {timeDiff != null ? `${timeDiff > 0 ? "+" : ""}${timeDiff}min` : "—"}
                                            </p>
                                          </div>
                                        </div>

                                        {/* Pause reason */}
                                        {task.pauseReason && (
                                          <div className="text-xs">
                                            <p className="text-muted-foreground mb-0.5 flex items-center gap-1"><Pause className="h-3 w-3" /> Motivo da pausa</p>
                                            <p className="bg-violet-500/5 rounded border border-violet-500/20 p-2 text-violet-600">{task.pauseReason}</p>
                                          </div>
                                        )}

                                        {/* Tools */}
                                        {task.tools.length > 0 && (
                                          <div className="text-xs">
                                            <p className="text-muted-foreground mb-1 flex items-center gap-1"><Wrench className="h-3 w-3" /> Ferramentas</p>
                                            <div className="flex flex-wrap gap-1">
                                              {task.tools.map((tool, i) => (
                                                <Badge key={i} variant="outline" className="text-[10px] h-5">
                                                  <Wrench className="h-2.5 w-2.5 mr-0.5" /> {tool}
                                                </Badge>
                                              ))}
                                            </div>
                                          </div>
                                        )}

                                        {task.observations && (
                                          <div className="text-xs">
                                            <p className="text-muted-foreground mb-0.5">Observações</p>
                                            <p className="bg-card rounded border border-border p-2">{task.observations}</p>
                                          </div>
                                        )}
                                        {task.isSuspicious && task.suspiciousReason && (
                                          <div className="text-xs">
                                            <p className="text-red-500 mb-0.5 font-medium">⚠️ Motivo da suspeita</p>
                                            <p className="bg-red-500/5 rounded border border-red-500/20 p-2 text-red-600">{task.suspiciousReason}</p>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}

                {/* Legend */}
                <div className="bg-card rounded-xl border border-border p-4">
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2">Legenda</h4>
                  <div className="flex flex-wrap gap-4 text-xs">
                    {Object.entries(statusConfig).map(([key, sc]) => {
                      const Icon = sc.icon;
                      return (
                        <span key={key} className="flex items-center gap-1.5">
                          <span className={cn("h-5 w-5 rounded flex items-center justify-center border", sc.bg, sc.border)}>
                            <Icon className={cn("h-3 w-3", sc.color)} />
                          </span>
                          {sc.label}
                        </span>
                      );
                    })}
                    <span className="text-muted-foreground/50">|</span>
                    <span className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px] h-4 border-purple-500/50 text-purple-600 bg-purple-500/10">
                        <FileWarning className="h-2.5 w-2.5 mr-0.5" /> Irregularidade
                      </Badge>
                      Tarefa de irregularidade (fora do plano)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px] h-4 border-violet-500/50 text-violet-600 bg-violet-500/10">
                        <Pause className="h-2.5 w-2.5 mr-0.5" /> Pausa
                      </Badge>
                      Tarefa com pausas
                    </span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}

function KpiCard({ icon: Icon, label, value, color, subtitle }: { icon: any; label: string; value: string | number; color: string; subtitle?: string }) {
  return (
    <div className="bg-card rounded-xl border border-border p-4 space-y-1">
      <div className="flex items-center gap-2">
        <Icon className={cn("h-4 w-4", color)} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className={cn("text-xl font-bold", color)}>{value}</p>
      {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
    </div>
  );
}
