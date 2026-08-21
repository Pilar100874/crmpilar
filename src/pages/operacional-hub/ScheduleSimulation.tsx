import { useEffect, useState, useMemo, useCallback } from "react";
import TemplateForm from "./TemplateForm";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User,
  Clock,
  Coffee,
  UtensilsCrossed,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CalendarClock,
  Timer,
  ClipboardList,
  Users,
  Briefcase,
  UserX,
  Palmtree,
  X,
  CloudRain,
  FileDown,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, addDays, subDays, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useFrequencies } from "@/hooks/useFrequencies";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const WEEKDAYS_SHORT: Record<number, string> = {
  0: "Dom", 1: "Seg", 2: "Ter", 3: "Qua", 4: "Qui", 5: "Sex", 6: "Sáb",
};

// Color palette for multiple users
const USER_COLORS = [
  { bg: "bg-primary/20", border: "border-primary/40", text: "text-primary", dot: "bg-primary" },
  { bg: "bg-success/20", border: "border-success/40", text: "text-success", dot: "bg-success" },
  { bg: "bg-warning/20", border: "border-warning/40", text: "text-warning", dot: "bg-warning" },
  { bg: "bg-critical/20", border: "border-critical/40", text: "text-critical", dot: "bg-critical" },
  { bg: "bg-accent", border: "border-accent-foreground/20", text: "text-accent-foreground", dot: "bg-accent-foreground" },
  { bg: "bg-secondary", border: "border-secondary-foreground/20", text: "text-secondary-foreground", dot: "bg-secondary-foreground" },
];

// Priority-based colors for tasks
// Generate a stable HSL color from a string (task name)
const stringToHSL = (str: string): { h: number; s: number; l: number } => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  const h = ((hash % 360) + 360) % 360;
  return { h, s: 55, l: 65 };
};

const getTaskNameColor = (name: string) => {
  const { h, s, l } = stringToHSL(name);
  return {
    bg: `hsla(${h}, ${s}%, ${l}%, 0.18)`,
    text: `hsl(${h}, ${s + 10}%, ${Math.max(l - 25, 30)}%)`,
    textDark: `hsl(${h}, ${s}%, ${Math.min(l + 10, 85)}%)`,
    dot: `hsl(${h}, ${s}%, ${l}%)`,
  };
};

const getPriorityColor = (priority: number) => {
  if (priority >= 9) return { bg: "bg-red-500/30", border: "border-red-500/60", text: "text-red-700 dark:text-red-300", label: "Crítica", leftBorder: "border-l-red-500", dot: "bg-red-500" };
  if (priority >= 7) return { bg: "bg-orange-500/25", border: "border-orange-500/50", text: "text-orange-700 dark:text-orange-300", label: "Alta", leftBorder: "border-l-orange-500", dot: "bg-orange-500" };
  if (priority >= 4) return { bg: "bg-blue-500/20", border: "border-blue-500/40", text: "text-blue-700 dark:text-blue-300", label: "Média", leftBorder: "border-l-blue-500", dot: "bg-blue-500" };
  return { bg: "bg-emerald-500/20", border: "border-emerald-500/40", text: "text-emerald-700 dark:text-emerald-300", label: "Baixa", leftBorder: "border-l-emerald-500", dot: "bg-emerald-500" };
};

const getFrequencyColor = (freq: string, frequenciesList: any[]): { icon: string; label: string; short: string; bg: string; text: string; border: string; dot: string } => {
  if (freq === "daily") return { icon: "📅", label: "Diária", short: "D", bg: "bg-slate-500/20", text: "text-slate-700 dark:text-slate-300", border: "border-slate-500/50", dot: "bg-slate-500" };
  if (freq === "weekly") return { icon: "📆", label: "Semanal", short: "S", bg: "bg-indigo-500/20", text: "text-indigo-700 dark:text-indigo-300", border: "border-indigo-500/50", dot: "bg-indigo-500" };
  if (freq === "monthly") return { icon: "🗓️", label: "Mensal", short: "M", bg: "bg-purple-500/20", text: "text-purple-700 dark:text-purple-300", border: "border-purple-500/50", dot: "bg-purple-500" };
  if (freq === "on_demand") return { icon: "🔔", label: "Sob demanda", short: "SD", bg: "bg-amber-500/20", text: "text-amber-700 dark:text-amber-300", border: "border-amber-500/50", dot: "bg-amber-500" };
  const custom = frequenciesList.find((f: any) => f.name === freq);
  if (custom) return { icon: "🔁", label: custom.label, short: `${custom.interval_days}d`, bg: "bg-teal-500/20", text: "text-teal-700 dark:text-teal-300", border: "border-teal-500/50", dot: "bg-teal-500" };
  return { icon: "❓", label: freq, short: "?", bg: "bg-gray-500/20", text: "text-gray-700 dark:text-gray-300", border: "border-gray-500/50", dot: "bg-gray-500" };
};

const getWorkloadStatus = (utilization: number) => {
  if (utilization > 100) return { label: "Sobrecarregado", color: "text-red-500", bgColor: "bg-red-500/10 border-red-500/30", icon: "🔴" };
  if (utilization >= 85) return { label: "Carga ideal", color: "text-emerald-500", bgColor: "bg-emerald-500/10 border-emerald-500/30", icon: "🟢" };
  if (utilization >= 60) return { label: "Carga moderada", color: "text-blue-500", bgColor: "bg-blue-500/10 border-blue-500/30", icon: "🔵" };
  if (utilization >= 30) return { label: "Poucas tarefas", color: "text-orange-500", bgColor: "bg-orange-500/10 border-orange-500/30", icon: "🟡" };
  return { label: "Ocioso", color: "text-red-400", bgColor: "bg-red-400/10 border-red-400/30", icon: "⚪" };
};

interface DaySchedule {
  day: number;
  start: string;
  end: string;
  lunchStart?: string;
  lunchEnd?: string;
}

interface ShiftData {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  lunch_start: string | null;
  lunch_end: string | null;
  work_days: number[];
  day_schedules: DaySchedule[];
}

interface TaskBlock {
  name: string;
  templateId?: string;
  estimatedMinutes: number;
  restMinutesAfter: number;
  requiresRestAfter: boolean;
  priority: number;
  priorityOrder?: number | null;
  frequency: string;
  status: string;
  timeSpentMinutes: number | null;
  startOffset: number;
  userId: string;
  isOutdoor: boolean;
  isCarryOver?: boolean;
  dependsOnNames?: string[];
  lunchSplit?: {
    beforeLunchMinutes: number;
    afterLunchMinutes: number;
    afterLunchStartOffset: number;
  };
}

interface DaySimResult {
  blocks: TaskBlock[];
  shiftInfo: { start: string; end: string; lunchStart: string | null; lunchEnd: string | null } | null | undefined;
  totalTaskMin: number;
  totalRestMin: number;
  availableMin: number;
  idleMin: number;
  absent: boolean;
  rainy?: boolean;
  outdoorBlocked?: number;
  carryOverCount?: number;
  advancedCount?: number;
  noTasksAvailable?: boolean;
}

interface ProfileData {
  user_id: string;
  full_name: string;
  shift_id: string | null;
  job_function_id: string | null;
  is_on_vacation: boolean;
}

interface JobFunctionData {
  id: string;
  name: string;
  sector_id: string | null;
}

interface AbsenceData {
  user_id: string;
  absence_date: string;
}

// Simulated absence for "what-if" scenarios
interface SimulatedAbsence {
  userId: string;
  dateStr: string;
}

const timeToMinutes = (t: string) => {
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
};

const minutesToTime = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
};

export default function ScheduleSimulation() {
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<ProfileData[]>([]);
  const [jobFunctions, setJobFunctions] = useState<JobFunctionData[]>([]);
  const [shifts, setShifts] = useState<ShiftData[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [filterFunctionId, setFilterFunctionId] = useState<string>("");
  const [viewDays, setViewDays] = useState<number>(7);
  const [customStart, setCustomStart] = useState(() => new Date());
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [taskTemplates, setTaskTemplates] = useState<any[]>([]);
  const [taskDependencies, setTaskDependencies] = useState<{ task_template_id: string; depends_on_template_id: string }[]>([]);
  const [absences, setAbsences] = useState<AbsenceData[]>([]);
  const [simulatedAbsences, setSimulatedAbsences] = useState<SimulatedAbsence[]>([]);
  const [simulatedVacations, setSimulatedVacations] = useState<string[]>([]); // user ids on simulated vacation
  const [manualRainDays, setManualRainDays] = useState<Set<string>>(new Set()); // manually toggled rain days
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [brokenToolTemplateIds, setBrokenToolTemplateIds] = useState<Set<string>>(new Set());
  const [historicalLastExecution, setHistoricalLastExecution] = useState<Map<string, string>>(new Map());
  const { data: frequenciesList = [] } = useFrequencies();

  // Build period options from frequencies
  const periodOptions = useMemo(() => {
    const options: { label: string; days: number }[] = [
      { label: "7 dias", days: 7 },
    ];
    // Add unique interval_days from frequencies, sorted
    const freqDays = frequenciesList
      .filter((f) => f.interval_days && f.interval_days > 7)
      .map((f) => ({ label: `${f.interval_days} dias (${f.label})`, days: f.interval_days! }))
      .sort((a, b) => a.days - b.days);
    // Deduplicate by days
    const seen = new Set<number>([7]);
    for (const fd of freqDays) {
      if (!seen.has(fd.days)) {
        seen.add(fd.days);
        options.push(fd);
      }
    }
    // Always add 30 days if not present
    if (!seen.has(30)) {
      options.push({ label: "30 dias (Mensal)", days: 30 });
    }
    return options.sort((a, b) => a.days - b.days);
  }, [frequenciesList]);

  useEffect(() => {
    fetchBaseData();
  }, []);

  useEffect(() => {
    if (selectedUserIds.length > 0) fetchWeekData();
  }, [selectedUserIds, customStart, viewDays]);

  const fetchBaseData = async () => {
    const [profilesRes, functionsRes, shiftsRes] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name, shift_id, job_function_id, is_on_vacation").eq("is_active", true).order("full_name"),
      supabase.from("job_functions").select("id, name, sector_id").order("name"),
      supabase.from("shifts").select("*"),
    ]);
    setProfiles(profilesRes.data || []);
    setJobFunctions(functionsRes.data || []);
    setShifts((shiftsRes.data || []) as unknown as ShiftData[]);
    setLoading(false);
  };

  const periodRange = useMemo(() => {
    return { start: customStart, end: addDays(customStart, viewDays - 1) };
  }, [customStart, viewDays]);

  const fetchWeekData = async () => {
    setDataLoading(true);
    const startStr = format(periodRange.start, "yyyy-MM-dd");
    const endStr = format(periodRange.end, "yyyy-MM-dd");

    // Also compute a lookback date to find the last execution per template before the period
    const maxIntervalDays = Math.max(...frequenciesList.map(f => f.interval_days || 1), 90);
    const lookbackDate = format(subDays(periodRange.start, maxIntervalDays + 1), "yyyy-MM-dd");

    const userFilter = selectedUserIds.length > 0
      ? selectedUserIds.map(id => `assigned_user_id.eq.${id},executed_by_user_id.eq.${id}`).join(",")
      : "assigned_user_id.is.null";

    const [tasksRes, templatesRes, absencesRes, depsRes, ttToolsRes, brokenToolsRes, historicalTasksRes] = await Promise.all([
      supabase
        .from("task_executions")
        .select("*, task_templates(name, estimated_time_minutes, requires_rest_after, rest_minutes_after, priority, is_outdoor)")
        .or(userFilter)
        .gte("scheduled_date", startStr)
        .lte("scheduled_date", endStr)
        .order("priority_score", { ascending: false }),
      supabase
        .from("task_templates")
        .select("id, name, estimated_time_minutes, requires_rest_after, rest_minutes_after, priority, frequency, job_function_id, default_assigned_user_id, additional_assigned_user_ids, required_workers, sector_id, is_active, is_outdoor, priority_order, work_days")
        .eq("is_active", true)
        .eq("is_irregularity_template", false),
      supabase
        .from("absences")
        .select("user_id, absence_date")
        .in("user_id", selectedUserIds)
        .gte("absence_date", startStr)
        .lte("absence_date", endStr),
      supabase
        .from("task_dependencies")
        .select("task_template_id, depends_on_template_id"),
      supabase
        .from("task_template_tools")
        .select("task_template_id, tool_id"),
      supabase
        .from("tools")
        .select("id")
        .eq("needs_repair", true),
      // Fetch historical executions before the period to determine last execution dates
      supabase
        .from("task_executions")
        .select("task_template_id, assigned_user_id, executed_by_user_id, scheduled_date, status")
        .or(userFilter)
        .gte("scheduled_date", lookbackDate)
        .lt("scheduled_date", startStr)
        .in("status", ["completed", "in_progress", "pending", "delayed"])
        .order("scheduled_date", { ascending: false }),
    ]);

    // Build set of template IDs that depend on broken tools
    const brokenIds = new Set((brokenToolsRes.data || []).map((t: any) => t.id));
    const blockedTemplates = new Set<string>();
    (ttToolsRes.data || []).forEach((link: any) => {
      if (brokenIds.has(link.tool_id)) {
        blockedTemplates.add(link.task_template_id);
      }
    });
    setBrokenToolTemplateIds(blockedTemplates);

    // Build historical last execution map: `templateId|userId` -> most recent scheduled_date
    const histMap = new Map<string, string>();
    for (const t of historicalTasksRes.data || []) {
      const userId = t.assigned_user_id || t.executed_by_user_id || "";
      const key = `${t.task_template_id}|${userId}`;
      if (!histMap.has(key)) {
        histMap.set(key, t.scheduled_date);
      }
    }
    setHistoricalLastExecution(histMap);

    setAllTasks(tasksRes.data || []);
    setTaskTemplates(templatesRes.data || []);
    setAbsences(absencesRes.data || []);
    setTaskDependencies(depsRes.data || []);
    setDataLoading(false);
  };

  // Filtered profiles by function
  const filteredProfiles = useMemo(() => {
    if (!filterFunctionId) return profiles;
    return profiles.filter((p) => p.job_function_id === filterFunctionId);
  }, [profiles, filterFunctionId]);

  // Select all in function
  const selectAllInFunction = () => {
    const ids = filteredProfiles.map((p) => p.user_id);
    setSelectedUserIds(ids);
  };

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const removeUser = (userId: string) => {
    setSelectedUserIds((prev) => prev.filter((id) => id !== userId));
    setSimulatedVacations((prev) => prev.filter((id) => id !== userId));
    setSimulatedAbsences((prev) => prev.filter((a) => a.userId !== userId));
  };

  const toggleSimulatedVacation = (userId: string) => {
    setSimulatedVacations((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const toggleSimulatedAbsence = (userId: string, dateStr: string) => {
    setSimulatedAbsences((prev) => {
      const exists = prev.find((a) => a.userId === userId && a.dateStr === dateStr);
      if (exists) return prev.filter((a) => !(a.userId === userId && a.dateStr === dateStr));
      return [...prev, { userId, dateStr }];
    });
  };

  const isAbsent = (userId: string, dateStr: string) => {
    if (simulatedVacations.includes(userId)) return true;
    if (simulatedAbsences.some((a) => a.userId === userId && a.dateStr === dateStr)) return true;
    if (absences.some((a) => a.user_id === userId && a.absence_date === dateStr)) return true;
    const profile = profiles.find((p) => p.user_id === userId);
    if (profile?.is_on_vacation) return true;
    return false;
  };

  const weekDays = useMemo(() => {
    const days = eachDayOfInterval({ start: periodRange.start, end: periodRange.end });
    return days.map((date) => ({
      date,
      dayOfWeek: date.getDay(),
      dateStr: format(date, "yyyy-MM-dd"),
      label: format(date, "EEE dd/MM", { locale: ptBR }),
      shortLabel: format(date, "EEE", { locale: ptBR }),
    }));
  }, [periodRange]);

  const getUserShift = (userId: string): ShiftData | null => {
    const profile = profiles.find((p) => p.user_id === userId);
    if (!profile?.shift_id) return null;
    return shifts.find((s) => s.id === profile.shift_id) || null;
  };

  const getDayShiftInfo = (shift: ShiftData | null, dayOfWeek: number) => {
    if (!shift) return null;
    if (!shift.work_days.includes(dayOfWeek)) return null;
    const daySchedule = (shift.day_schedules || []).find((ds: DaySchedule) => ds.day === dayOfWeek);
    const start = daySchedule?.start || shift.start_time.slice(0, 5);
    const end = daySchedule?.end || shift.end_time.slice(0, 5);
    const lunchStart = daySchedule?.lunchStart || (shift.lunch_start ? shift.lunch_start.slice(0, 5) : null);
    const lunchEnd = daySchedule?.lunchEnd || (shift.lunch_end ? shift.lunch_end.slice(0, 5) : null);
    return { start, end, lunchStart, lunchEnd };
  };

  // Get templates applicable to a user based on function or direct assignment
  // Pre-compute round-robin assignments:
  // 1. High/critical unassigned sector tasks distributed among sector workers
  // 2. Tasks from unavailable users (vacation/absence) redistributed to sector colleagues
  // Map: templateId -> userId (assigned via round-robin)
  const roundRobinAssignments = useMemo(() => {
    const assignments = new Map<string, string>();

    // Build sector -> available users map from selected users
    const sectorUsersMap = new Map<string, string[]>();
    for (const userId of selectedUserIds) {
      const profile = profiles.find((p) => p.user_id === userId);
      if (!profile?.job_function_id) continue;
      if (profile.is_on_vacation) continue;
      const jf = jobFunctions.find((j) => j.id === profile.job_function_id);
      const sectorId = (jf as any)?.sector_id;
      if (!sectorId) continue;
      if (!sectorUsersMap.has(sectorId)) sectorUsersMap.set(sectorId, []);
      sectorUsersMap.get(sectorId)!.push(userId);
    }

    // Track load per user
    const userLoad = new Map<string, number>();

    // --- 1. High/critical unassigned tasks ---
    const highPriorityUnassigned = taskTemplates.filter((t) => {
      return (t.priority || 5) >= 8 && !t.default_assigned_user_id && t.sector_id;
    });

    highPriorityUnassigned.sort((a, b) => {
      if ((b.priority || 5) !== (a.priority || 5)) return (b.priority || 5) - (a.priority || 5);
      return (b.priority_order || 0) - (a.priority_order || 0);
    });

    for (const tmpl of highPriorityUnassigned) {
      const sectorWorkers = sectorUsersMap.get(tmpl.sector_id!) || [];
      if (sectorWorkers.length === 0) continue;
      sectorWorkers.sort((a, b) => (userLoad.get(a) || 0) - (userLoad.get(b) || 0));
      const assignedUser = sectorWorkers[0];
      assignments.set(tmpl.id, assignedUser);
      userLoad.set(assignedUser, (userLoad.get(assignedUser) || 0) + 1);
    }

    // --- 2. Redistribute tasks from unavailable users (vacation/simulated vacation) ---
    const unavailableUsers = selectedUserIds.filter((uid) => {
      const profile = profiles.find((p) => p.user_id === uid);
      if (profile?.is_on_vacation) return true;
      if (simulatedVacations.includes(uid)) return true;
      return false;
    });

    for (const unavailableUserId of unavailableUsers) {
      // Find templates directly assigned to this user
      const userTemplates = taskTemplates.filter((t) => t.default_assigned_user_id === unavailableUserId && t.sector_id);
      for (const tmpl of userTemplates) {
        if (assignments.has(tmpl.id)) continue; // already assigned
        const sectorWorkers = (sectorUsersMap.get(tmpl.sector_id!) || []).filter((id) => id !== unavailableUserId);
        if (sectorWorkers.length === 0) continue;
        sectorWorkers.sort((a, b) => (userLoad.get(a) || 0) - (userLoad.get(b) || 0));
        const substituteUser = sectorWorkers[0];
        assignments.set(tmpl.id, substituteUser);
        userLoad.set(substituteUser, (userLoad.get(substituteUser) || 0) + 1);
      }
    }

    return assignments;
  }, [taskTemplates, selectedUserIds, profiles, jobFunctions, simulatedVacations]);

  const getTemplatesForUser = useCallback((userId: string) => {
    const profile = profiles.find((p) => p.user_id === userId);
    // Get user's sector via job_function
    const userFunction = profile?.job_function_id
      ? jobFunctions.find((jf) => jf.id === profile.job_function_id)
      : null;
    const userSectorId = userFunction ? (userFunction as any).sector_id : null;

    return taskTemplates.filter((t) => {
      // Round-robin check: if this template was pre-assigned via round-robin
      const rrAssignedUser = roundRobinAssignments.get(t.id);
      if (rrAssignedUser !== undefined) {
        return rrAssignedUser === userId;
      }

      // Directly assigned to this user (check BEFORE sector/function filter)
      if (t.default_assigned_user_id === userId) return true;
      // Check if user is in additional_assigned_user_ids
      const additionalIds: string[] = t.additional_assigned_user_ids || [];
      if (additionalIds.includes(userId)) return true;
      // Skip templates without sector defined (except irregularity templates)
      if (!t.is_irregularity_template && !t.sector_id) return false;
      // Must match the user's sector
      if (t.sector_id && userSectorId && t.sector_id !== userSectorId) return false;
      if (t.sector_id && !userSectorId) return false;
      // Assigned by job function (and no specific user assigned)
      if (!t.default_assigned_user_id && t.job_function_id && profile?.job_function_id === t.job_function_id) return true;
      // No specific user assigned, matches sector
      if (!t.default_assigned_user_id && !t.job_function_id && t.sector_id && t.sector_id === userSectorId) return true;
      return false;
    });
  }, [taskTemplates, profiles, jobFunctions, roundRobinAssignments]);

  // Check if a template should run on a given day based on frequency
  const shouldRunOnDay = (template: any, dayOfWeek: number, dateStr: string, lastScheduledDate?: string) => {
    // Check work_days availability filter first
    const templateWorkDays: number[] = template.work_days || [1, 2, 3, 4, 5];
    if (!templateWorkDays.includes(dayOfWeek)) return false;

    if (template.frequency === "on_demand") return false;

    // Look up frequency definition from the frequencies table
    const freq = frequenciesList.find((f: any) => f.name === template.frequency);
    const intervalDays = freq?.interval_days;

    if (!intervalDays) {
      // Fallback for unknown frequencies without interval_days
      if (template.frequency === "daily") return true;
      return false;
    }

    // Daily tasks (interval_days=1) always run on work days
    if (intervalDays === 1) return true;

    // If never executed before, make it available immediately
    if (!lastScheduledDate) return true;

    // Check if enough days have passed since last execution
    const lastDate = new Date(lastScheduledDate);
    const currentDate = new Date(dateStr);
    const daysSince = Math.floor((currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysSince >= intervalDays;
  };

  // Compute which dates are rainy based on manual selection
  const rainyDates = useMemo(() => {
    return manualRainDays;
  }, [manualRainDays]);

  const isRainyDay = (dateStr: string) => rainyDates.has(dateStr);

  // Simulate ALL days for a user sequentially, carrying over tasks that don't fit
  const simulateUserPeriod = useCallback((userId: string): Map<string, DaySimResult> => {
    const results = new Map<string, DaySimResult>();
    const shift = getUserShift(userId);
    const templates = getTemplatesForUser(userId);
    const userWorkDays = shift?.work_days || [1, 2, 3, 4, 5];
    // Build set of template IDs that belong to this user
    const userTemplateIds = new Set(templates.map(t => t.id));

    // Build dependency map: templateId -> set of template ids it depends on
    const dependsOnMap = new Map<string, Set<string>>();
    for (const dep of taskDependencies) {
      if (!dependsOnMap.has(dep.task_template_id)) {
        dependsOnMap.set(dep.task_template_id, new Set());
      }
      dependsOnMap.get(dep.task_template_id)!.add(dep.depends_on_template_id);
    }

    // Build template name lookup for dependency labels
    const templateNameMap = new Map<string, string>();
    for (const t of taskTemplates) {
      templateNameMap.set(t.id, t.name);
    }

    let carryOver: TaskBlock[] = [];
    // Track which templates have been completed (fitted) across all days
    const completedTemplates = new Set<string>();

    // Track last scheduled date per template for frequency-based scheduling
    // Initialize from historical data (executions before the simulation period)
    const lastScheduledDateMap = new Map<string, string>();
    for (const [key, date] of historicalLastExecution.entries()) {
      // key format: templateId|userId
      if (key.endsWith(`|${userId}`)) {
        const templateId = key.split("|")[0];
        lastScheduledDateMap.set(templateId, date);
      }
    }
    // Also consider real executions within the period to seed last dates
    for (const t of allTasks) {
      if (!t.task_template_id) continue;
      if (t.assigned_user_id !== userId && t.executed_by_user_id !== userId) continue;
      const existing = lastScheduledDateMap.get(t.task_template_id);
      if (!existing || t.scheduled_date > existing) {
        lastScheduledDateMap.set(t.task_template_id, t.scheduled_date);
      }
    }

    for (const wd of weekDays) {
      const { dateStr, dayOfWeek } = wd;
      const shiftInfo = getDayShiftInfo(shift, dayOfWeek);
      const absent = isAbsent(userId, dateStr);
      const rainy = isRainyDay(dateStr);

      if (!shiftInfo || absent) {
        // Carry over stays for next day
        results.set(dateStr, { blocks: [], shiftInfo, totalTaskMin: 0, totalRestMin: 0, availableMin: 0, idleMin: 0, absent, rainy, carryOverCount: carryOver.length });
        continue;
      }

      const shiftStartMin = timeToMinutes(shiftInfo.start);
      const shiftEndMin = timeToMinutes(shiftInfo.end);
      const lunchStartMin = shiftInfo.lunchStart ? timeToMinutes(shiftInfo.lunchStart) : null;
      const lunchEndMin = shiftInfo.lunchEnd ? timeToMinutes(shiftInfo.lunchEnd) : null;

      // In simulation mode, always show the full shift regardless of current time
      let effectiveShiftStartMin = shiftStartMin;

      // Check for real task_executions
      const existingTasks = allTasks
        .filter((t: any) => t.scheduled_date === dateStr && (t.assigned_user_id === userId || t.executed_by_user_id === userId));

      let candidateTasks: TaskBlock[];

      // Build tasks from real executions
      const realTaskBlocks = existingTasks.map((t: any) => {
        const tmpl = taskTemplates.find((tt: any) => tt.id === t.task_template_id);
        return {
          name: (t.task_templates as any)?.name || "Tarefa",
          templateId: t.task_template_id,
          estimatedMinutes: (t.task_templates as any)?.estimated_time_minutes || 30,
          restMinutesAfter: (t.task_templates as any)?.requires_rest_after ? ((t.task_templates as any)?.rest_minutes_after || 0) : 0,
          requiresRestAfter: (t.task_templates as any)?.requires_rest_after || false,
          priority: (t.task_templates as any)?.priority || 5,
          priorityOrder: tmpl?.priority_order ?? null,
          frequency: tmpl?.frequency || "daily",
          status: t.status || "pending",
          timeSpentMinutes: t.time_spent_minutes,
          startOffset: 0,
          userId,
          isOutdoor: (t.task_templates as any)?.is_outdoor || t.is_outdoor_task || false,
        };
      });

      // Build set of template IDs that already have real executions for this day
      const existingTemplateIds = new Set(existingTasks.map((t: any) => t.task_template_id).filter(Boolean));

      // Build simulated tasks from templates (excluding ones that already have executions)
      // Use last scheduled date for frequency calculation
      const simulatedTasks = templates
        .filter((t) => shouldRunOnDay(t, dayOfWeek, dateStr, lastScheduledDateMap.get(t.id)) && !brokenToolTemplateIds.has(t.id) && !existingTemplateIds.has(t.id))
        .map((t) => {
          const depsSet = dependsOnMap.get(t.id);
          const depNames = depsSet ? [...depsSet].map(id => templateNameMap.get(id) || "").filter(Boolean) : [];
          return {
            name: t.name,
            templateId: t.id,
            estimatedMinutes: t.estimated_time_minutes || 30,
            restMinutesAfter: t.requires_rest_after ? (t.rest_minutes_after || 0) : 0,
            requiresRestAfter: t.requires_rest_after || false,
            priority: t.priority || 5,
            priorityOrder: t.priority_order ?? null,
            frequency: t.frequency || "daily",
            status: "simulated",
            timeSpentMinutes: null,
            startOffset: 0,
            userId,
            isOutdoor: t.is_outdoor || false,
            dependsOnNames: depNames.length > 0 ? depNames : undefined,
          };
        });

      // Merge: real executions + simulated tasks + carry-over
      const markedCarryOver = carryOver.map((t) => ({ ...t, isCarryOver: true, status: "carry_over" }));
      candidateTasks = [...realTaskBlocks, ...simulatedTasks, ...markedCarryOver];
      // Clear carry-over since we're merging everything now
      carryOver = [];

      // Filter outdoor on rainy days
      let outdoorBlocked = 0;
      if (rainy) {
        const before = candidateTasks.length;
        candidateTasks = candidateTasks.filter((t) => !t.isOutdoor);
        outdoorBlocked = before - candidateTasks.length;
      }

      // Dependency-aware scheduling:
      // Sort by priority first, but then use a queue that immediately schedules
      // dependent tasks right after their prerequisite is completed.
      
      // Build reverse dependency map: prerequisite -> tasks that depend on it
      const dependentsOf = new Map<string, TaskBlock[]>();
      const blockedSet = new Set<string>(); // templateIds that are blocked
      const readyQueue: TaskBlock[] = [];
      
      for (const task of candidateTasks) {
        if (task.templateId) {
          const deps = dependsOnMap.get(task.templateId);
          if (deps && deps.size > 0) {
            // Only consider dependencies that belong to this user's templates
            // Cross-user dependencies are assumed to be met (other user handles them)
            const relevantDeps = [...deps].filter((depId) => userTemplateIds.has(depId));
            const allDepsMet = relevantDeps.every((depId) => completedTemplates.has(depId));
            if (!allDepsMet) {
              // This task is blocked - register it under its dependencies
              blockedSet.add(task.templateId);
              for (const depId of relevantDeps) {
                if (!completedTemplates.has(depId)) {
                  if (!dependentsOf.has(depId)) dependentsOf.set(depId, []);
                  dependentsOf.get(depId)!.push(task);
                }
              }
              continue;
            }
          }
        }
        readyQueue.push(task);
      }
      
      // Sort ready queue by priority
      readyQueue.sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority;
        // Same priority: higher priorityOrder = more important (10 is most important)
        const aOrder = a.priorityOrder ?? -1;
        const bOrder = b.priorityOrder ?? -1;
        return bOrder - aOrder;
      });

      let currentMin = effectiveShiftStartMin;
      let totalTaskMin = 0;
      let totalRestMin = 0;
      const fittedTasks: TaskBlock[] = [];
      const overflow: TaskBlock[] = [];
      const stillBlocked: TaskBlock[] = [];

      // Helper: try to fit a task, possibly splitting across lunch
      const tryFitTask = (task: TaskBlock): { fitted: boolean; endMin: number } => {
        let candidateMin = currentMin;
        
        // If we're in the lunch window, jump to after lunch
        if (lunchStartMin && lunchEndMin && candidateMin >= lunchStartMin && candidateMin < lunchEndMin) {
          candidateMin = lunchEndMin;
        }
        
        // Check if task spans lunch - if so, split it
        if (lunchStartMin && lunchEndMin && candidateMin < lunchStartMin && candidateMin + task.estimatedMinutes > lunchStartMin) {
          const beforeLunchMinutes = lunchStartMin - candidateMin;
          const afterLunchMinutes = task.estimatedMinutes - beforeLunchMinutes;
          const afterLunchStartOffset = lunchEndMin;
          const taskEndMin = afterLunchStartOffset + afterLunchMinutes;
          
          if (taskEndMin > shiftEndMin) {
            return { fitted: false, endMin: currentMin };
          }
          
          // Split the task
          task.startOffset = candidateMin;
          task.lunchSplit = {
            beforeLunchMinutes,
            afterLunchMinutes,
            afterLunchStartOffset,
          };
          currentMin = taskEndMin;
          totalTaskMin += task.estimatedMinutes;
          if (task.requiresRestAfter && task.restMinutesAfter > 0) {
            currentMin += task.restMinutesAfter;
            totalRestMin += task.restMinutesAfter;
          }
          fittedTasks.push(task);
          return { fitted: true, endMin: currentMin };
        }
        
        const taskEndMin = candidateMin + task.estimatedMinutes;
        if (taskEndMin > shiftEndMin) {
          return { fitted: false, endMin: currentMin };
        }
        task.startOffset = candidateMin;
        currentMin = taskEndMin;
        totalTaskMin += task.estimatedMinutes;
        if (task.requiresRestAfter && task.restMinutesAfter > 0) {
          currentMin += task.restMinutesAfter;
          totalRestMin += task.restMinutesAfter;
        }
        fittedTasks.push(task);
        return { fitted: true, endMin: currentMin };
      };

      // Process ready queue - when a task is fitted, check if it unblocks dependents
      while (readyQueue.length > 0) {
        const task = readyQueue.shift()!;
        
        const { fitted } = tryFitTask(task);
        if (!fitted) {
          overflow.push({ ...task, isCarryOver: false, status: task.status === "carry_over" ? "carry_over" : "simulated" });
          continue;
        }
        
        if (task.templateId) {
          completedTemplates.add(task.templateId);
          // Update last scheduled date for frequency tracking
          lastScheduledDateMap.set(task.templateId, dateStr);
          
          // Check if this unlocks any dependent tasks - insert them at the FRONT of the queue
          const unlocked = dependentsOf.get(task.templateId) || [];
          const newlyReady: TaskBlock[] = [];
          for (const dep of unlocked) {
            if (dep.templateId && blockedSet.has(dep.templateId)) {
              const allDeps = dependsOnMap.get(dep.templateId);
              if (allDeps && [...allDeps].every((id) => completedTemplates.has(id))) {
                blockedSet.delete(dep.templateId);
                newlyReady.push(dep);
              }
            }
          }
          // Insert newly ready tasks IMMEDIATELY at the front of the queue
          // so they always execute right after their prerequisite, regardless of priority
          if (newlyReady.length > 0) {
            // Sort among themselves by priority (highest first)
            newlyReady.sort((a, b) => {
              if (b.priority !== a.priority) return b.priority - a.priority;
              return (b.priorityOrder ?? -1) - (a.priorityOrder ?? -1);
            });
            // Prepend to the front of the queue
            readyQueue.unshift(...newlyReady);
          }
        }
      }
      
      // Collect still-blocked tasks
      for (const task of candidateTasks) {
        if (task.templateId && blockedSet.has(task.templateId)) {
          stillBlocked.push(task);
        }
      }

      // Set carry-over for the next day: overflow + still-blocked tasks
      carryOver = [...overflow, ...stillBlocked.map((t) => ({ ...t, isCarryOver: false, status: "blocked" }))];

      const lunchDuration = (lunchStartMin && lunchEndMin && lunchEndMin > effectiveShiftStartMin) 
        ? Math.max(0, lunchEndMin - Math.max(lunchStartMin, effectiveShiftStartMin)) : 0;
      const availableMin = (shiftEndMin - effectiveShiftStartMin) - lunchDuration;
      const usedMin = totalTaskMin + totalRestMin;
      let idleMin = Math.max(0, availableMin - usedMin);

      // --- RULE: Advance future tasks to fill idle gaps ---
      // Collect template IDs already fitted today
      const fittedTemplateIdsToday = new Set(fittedTasks.filter(t => t.templateId).map(t => t.templateId!));
      
      let advancedCount = 0;
      let noTasksAvailable = false;

      if (idleMin >= 15) {
        // Look ahead at future days for tasks to pull forward
        // RULE: Only advance tasks that are NOT periodic (daily/weekly/monthly/custom-interval).
        // Periodic tasks must respect their natural schedule.
        // A periodic task can only be advanced if it hasn't been executed at all yet in the period.
        const isPeriodicFrequency = (freq: string) => {
          if (freq === "daily" || freq === "weekly" || freq === "monthly") return true;
          // Custom frequency with interval_days is also periodic
          const f = frequenciesList.find((fl: any) => fl.name === freq);
          return !!(f && f.interval_days);
        };

        const futureTaskBlocks: TaskBlock[] = [];
        const seenAdvancedTemplates = new Set<string>();
        for (const futureWd of weekDays) {
          if (futureWd.dateStr <= dateStr) continue;
          const futureDayTemplates = templates
            .filter((t) => {
              if (!shouldRunOnDay(t, futureWd.dayOfWeek, futureWd.dateStr, lastScheduledDateMap.get(t.id))) return false;
              if (brokenToolTemplateIds.has(t.id)) return false;
              if (fittedTemplateIdsToday.has(t.id)) return false;
              if (completedTemplates.has(t.id)) return false;
              if (seenAdvancedTemplates.has(t.id)) return false;
              if (rainy && t.is_outdoor) return false;
              
              // Block periodic tasks from being advanced
              if (isPeriodicFrequency(t.frequency)) return false;
              
              return true;
            })
            .map((t) => {
              seenAdvancedTemplates.add(t.id);
              return {
                name: t.name,
                templateId: t.id,
                estimatedMinutes: t.estimated_time_minutes || 30,
                restMinutesAfter: t.requires_rest_after ? (t.rest_minutes_after || 0) : 0,
                requiresRestAfter: t.requires_rest_after || false,
                priority: t.priority || 5,
                frequency: t.frequency || "daily",
                status: "advanced",
                timeSpentMinutes: null,
                startOffset: 0,
                userId,
                isOutdoor: t.is_outdoor || false,
                isCarryOver: true,
              };
            });
          futureTaskBlocks.push(...futureDayTemplates);
        }

        // Sort by priority and try to fit
        futureTaskBlocks.sort((a, b) => {
          if (b.priority !== a.priority) return b.priority - a.priority;
          const aOrder = a.priorityOrder ?? -1;
          const bOrder = b.priorityOrder ?? -1;
          return bOrder - aOrder;
        });

        for (const ft of futureTaskBlocks) {
          if (idleMin < 15) break;
          if (fittedTemplateIdsToday.has(ft.templateId!)) continue;

          const { fitted } = tryFitTask(ft);
          if (!fitted) continue;

          fittedTemplateIdsToday.add(ft.templateId!);
          if (ft.templateId) completedTemplates.add(ft.templateId);
          idleMin -= ft.estimatedMinutes + ft.restMinutesAfter;
          advancedCount++;
        }

        // If still idle and no tasks were advanced, mark noTasksAvailable
        if (idleMin >= 15 && advancedCount === 0) {
          noTasksAvailable = true;
        }
      }

      idleMin = Math.max(0, availableMin - totalTaskMin - totalRestMin);

      results.set(dateStr, {
        blocks: fittedTasks,
        shiftInfo,
        totalTaskMin,
        totalRestMin,
        availableMin,
        idleMin,
        absent: false,
        rainy,
        outdoorBlocked,
        carryOverCount: overflow.length,
        advancedCount,
        noTasksAvailable,
      });
    }
    return results;
  }, [weekDays, allTasks, taskTemplates, taskDependencies, shifts, simulatedAbsences, simulatedVacations, absences, profiles, frequenciesList, jobFunctions, rainyDates, getTemplatesForUser, brokenToolTemplateIds, historicalLastExecution]);

  // Memoize period results per user
  const userPeriodResults = useMemo(() => {
    const map = new Map<string, Map<string, DaySimResult>>();
    for (const userId of selectedUserIds) {
      map.set(userId, simulateUserPeriod(userId));
    }
    return map;
  }, [selectedUserIds, simulateUserPeriod]);

  // Helper to get a day result
  const getDayResult = (userId: string, dateStr: string): DaySimResult => {
    return userPeriodResults.get(userId)?.get(dateStr) || {
      blocks: [], shiftInfo: null, totalTaskMin: 0, totalRestMin: 0, availableMin: 0, idleMin: 0, absent: false,
    };
  };

  const timelineStartHour = 5;
  const timelineEndHour = 23;
  const totalTimelineMinutes = (timelineEndHour - timelineStartHour) * 60;
  const minuteToPercent = (min: number) => ((min - timelineStartHour * 60) / totalTimelineMinutes) * 100;

  // Per-user week totals
  const userWeekTotals = useMemo(() => {
    return selectedUserIds.map((userId) => {
      let totalTask = 0, totalRest = 0, totalAvailable = 0, totalIdle = 0, totalDays = 0, absentDays = 0;
      weekDays.forEach((wd) => {
        const sim = getDayResult(userId, wd.dateStr);
        if (sim.absent) { absentDays++; return; }
        if (sim.shiftInfo) {
          totalTask += sim.totalTaskMin;
          totalRest += sim.totalRestMin;
          totalAvailable += sim.availableMin;
          totalIdle += sim.idleMin;
          totalDays++;
        }
      });
      const utilization = totalAvailable > 0 ? Math.round(((totalTask + totalRest) / totalAvailable) * 100) : 0;
      const profile = profiles.find((p) => p.user_id === userId);
      return { userId, name: profile?.full_name || "—", totalTask, totalRest, totalAvailable, totalIdle, totalDays, absentDays, utilization };
    });
  }, [selectedUserIds, weekDays, userPeriodResults, profiles]);

  const generatePDF = useCallback(() => {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const dateRange = `${format(customStart, "dd/MM/yyyy")} - ${format(addDays(customStart, viewDays - 1), "dd/MM/yyyy")}`;

    // Title
    doc.setFontSize(16);
    doc.text("Relatório de Simulação de Jornada", 14, 15);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Período: ${dateRange}`, 14, 22);
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 27);
    doc.setTextColor(0);

    // Summary table
    const summaryRows = userWeekTotals.map((u) => {
      const ws = getWorkloadStatus(u.utilization);
      return [
        u.name,
        `${Math.round(u.totalAvailable / 60)}h`,
        `${Math.floor(u.totalTask / 60)}h${u.totalTask % 60 > 0 ? `${u.totalTask % 60}m` : ""}`,
        `${Math.floor(u.totalIdle / 60)}h${u.totalIdle % 60 > 0 ? `${u.totalIdle % 60}m` : ""}`,
        `${u.utilization}%`,
        `${u.absentDays} dias`,
        ws.label,
      ];
    });

    doc.setFontSize(12);
    doc.text("Resumo por Colaborador", 14, 35);

    autoTable(doc, {
      startY: 38,
      head: [["Colaborador", "Jornada", "Tarefas", "Ocioso", "Utilização", "Ausências", "Status"]],
      body: summaryRows,
      theme: "striped",
      headStyles: { fillColor: [59, 130, 246], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 50 },
        4: { halign: "center" },
        5: { halign: "center" },
      },
    });

    // Detail per user per day
    for (const userId of selectedUserIds) {
      const profile = profiles.find((p) => p.user_id === userId);
      const userName = profile?.full_name || "—";
      
      doc.addPage();
      doc.setFontSize(14);
      doc.text(`Jornada de ${userName}`, 14, 15);
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(`Período: ${dateRange}`, 14, 21);
      doc.setTextColor(0);

      const detailRows: string[][] = [];

      for (const wd of weekDays) {
        const sim = getDayResult(userId, wd.dateStr);
        const dayLabel = format(wd.date, "EEE dd/MM", { locale: ptBR });

        if (sim.absent) {
          detailRows.push([dayLabel, "AUSENTE", "—", "—", "—", "—", "—"]);
          continue;
        }
        if (!sim.shiftInfo) {
          detailRows.push([dayLabel, "FOLGA", "—", "—", "—", "—", "—"]);
          continue;
        }

        if (sim.blocks.length === 0) {
          detailRows.push([
            dayLabel,
            `${sim.shiftInfo.start} - ${sim.shiftInfo.end}`,
            "Sem tarefas",
            "—",
            "—",
            `${sim.availableMin}min`,
            `${sim.idleMin}min`,
          ]);
          continue;
        }

        sim.blocks.forEach((block, idx) => {
          const startTime = minutesToTime(block.startOffset);
          const endMin = block.lunchSplit
            ? block.lunchSplit.afterLunchStartOffset + block.lunchSplit.afterLunchMinutes
            : block.startOffset + block.estimatedMinutes;
          const endTime = minutesToTime(endMin);
          const pColor = getPriorityColor(block.priority);
          const freqInfo = getFrequencyColor(block.frequency, frequenciesList);
          const status = block.status === "advanced" ? "Adiantada" : block.isCarryOver ? "Transferida" : block.isOutdoor ? "Outdoor" : "";

          detailRows.push([
            idx === 0 ? dayLabel : "",
            `${startTime} - ${endTime}`,
            block.name,
            `P${block.priority} (${pColor.label})`,
            freqInfo.label,
            `${block.estimatedMinutes}min`,
            status,
          ]);
        });

        // Summary row for the day
        detailRows.push([
          "",
          "",
          `TOTAL DIA: ${sim.blocks.length} tarefas`,
          `Disponível: ${sim.availableMin}min`,
          `Tarefas: ${sim.totalTaskMin}min`,
          `Descanso: ${sim.totalRestMin}min`,
          `Ocioso: ${sim.idleMin}min`,
        ]);
      }

      autoTable(doc, {
        startY: 25,
        head: [["Dia", "Horário", "Tarefa", "Prioridade", "Frequência", "Duração", "Obs"]],
        body: detailRows,
        theme: "striped",
        headStyles: { fillColor: [59, 130, 246], fontSize: 7 },
        bodyStyles: { fontSize: 7 },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 25 },
          2: { cellWidth: 55 },
          3: { cellWidth: 30 },
          4: { cellWidth: 25 },
          5: { cellWidth: 22 },
        },
        didParseCell: (data: any) => {
          // Bold total rows
          if (data.row.raw && data.row.raw[2] && typeof data.row.raw[2] === "string" && data.row.raw[2].startsWith("TOTAL DIA")) {
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fillColor = [230, 240, 255];
          }
          if (data.row.raw && (data.row.raw[1] === "AUSENTE" || data.row.raw[1] === "FOLGA")) {
            data.cell.styles.fontStyle = "italic";
            data.cell.styles.textColor = [150, 150, 150];
          }
        },
      });
    }

    doc.save(`simulacao-jornada-${format(customStart, "yyyy-MM-dd")}.pdf`);
  }, [selectedUserIds, userWeekTotals, weekDays, profiles, customStart, viewDays, frequenciesList]);
  const getUserColor = (userId: string) => {
    const idx = selectedUserIds.indexOf(userId);
    return USER_COLORS[idx % USER_COLORS.length];
  };



  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
         <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">Simulação de Jornada</h1>
            <p className="text-muted-foreground">Simule a jornada de um ou mais colaboradores</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {selectedUserIds.length > 0 && !dataLoading && (
              <Button variant="outline" size="sm" className="gap-2" onClick={generatePDF}>
                <FileDown className="h-4 w-4" />
                Exportar PDF
              </Button>
            )}
            {/* Period selector */}
            <Select value={String(viewDays)} onValueChange={(v) => setViewDays(Number(v))}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                {periodOptions.map((opt) => (
                  <SelectItem key={opt.days} value={String(opt.days)}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon" onClick={() => setCustomStart((s) => subDays(s, viewDays))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[180px] text-center">
              {format(customStart, "dd/MM", { locale: ptBR })} - {format(addDays(customStart, viewDays - 1), "dd/MM/yyyy", { locale: ptBR })}
            </span>
            <Button variant="outline" size="icon" onClick={() => setCustomStart((s) => addDays(s, viewDays))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Filters & selection */}
        <div className="bg-card rounded-xl border border-border p-4 space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Filter by function */}
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
              <Button variant="ghost" size="sm" onClick={() => { setSelectedUserIds([]); setSimulatedAbsences([]); setSimulatedVacations([]); }} className="text-xs">
                Limpar seleção
              </Button>
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
                  {(p.is_on_vacation || simulatedVacations.includes(p.user_id)) && (
                    <Palmtree className="h-3.5 w-3.5 text-warning" />
                  )}
                </label>
              );
            })}
          </div>
        </div>

        {/* Selected users with simulation controls */}
        {selectedUserIds.length > 0 && (
          <Collapsible defaultOpen={false}>
            <div className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center justify-between">
                <CollapsibleTrigger asChild>
                  <button className="flex items-center gap-2 text-sm font-semibold hover:opacity-80 transition-opacity">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    Simular Ausências e Férias
                  </button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent className="space-y-3 pt-3">
                <p className="text-xs text-muted-foreground">
                  {viewDays <= 14
                    ? "Clique nos dias para simular falta. Use o botão de férias para simular o período inteiro como férias."
                    : "Use o botão de férias para simular o período inteiro como férias. Para faltas em dias específicos, use um período menor."
                  }
                </p>
                <div className="space-y-2">
                  {selectedUserIds.map((userId) => {
                    const profile = profiles.find((p) => p.user_id === userId);
                    const color = getUserColor(userId);
                    const onVacation = simulatedVacations.includes(userId) || profile?.is_on_vacation;

                    return (
                      <div key={userId} className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2 w-40 shrink-0">
                          <span className={cn("h-3 w-3 rounded-full", color.dot)} />
                          <span className="text-sm font-medium truncate">{profile?.full_name}</span>
                        </div>

                        {/* Vacation toggle */}
                        <Button
                          variant={onVacation ? "default" : "outline"}
                          size="sm"
                          className={cn("gap-1 text-xs h-7", onVacation && "bg-warning text-warning-foreground hover:bg-warning/90")}
                          onClick={() => toggleSimulatedVacation(userId)}
                          disabled={profile?.is_on_vacation}
                        >
                          <Palmtree className="h-3 w-3" />
                          {onVacation ? "Em férias" : "Férias"}
                        </Button>

                        {/* Day absence toggles - only in weekly view */}
                        {!onVacation && viewDays <= 14 && weekDays.map((wd) => {
                          const absent = isAbsent(userId, wd.dateStr);
                          const isRealAbsence = absences.some((a) => a.user_id === userId && a.absence_date === wd.dateStr);
                          const isSimulated = simulatedAbsences.some((a) => a.userId === userId && a.dateStr === wd.dateStr);

                          return (
                            <button
                              key={wd.dateStr}
                              type="button"
                              onClick={() => !isRealAbsence && toggleSimulatedAbsence(userId, wd.dateStr)}
                              className={cn(
                                "h-7 w-10 rounded text-[10px] font-medium border transition-all",
                                absent
                                  ? isRealAbsence
                                    ? "bg-critical/20 border-critical/40 text-critical cursor-not-allowed"
                                    : "bg-warning/20 border-warning/40 text-warning"
                                  : "bg-card border-border text-muted-foreground hover:border-warning/50"
                              )}
                              title={isRealAbsence ? "Falta registrada" : isSimulated ? "Falta simulada (clique para remover)" : "Clique para simular falta"}
                            >
                              {wd.shortLabel}
                            </button>
                          );
                        })}

                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeUser(userId)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        )}

        {/* Rain simulation */}
        {selectedUserIds.length > 0 && (
          <Collapsible defaultOpen={false}>
            <div className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center justify-between">
                <CollapsibleTrigger asChild>
                  <button className="flex items-center gap-2 text-sm font-semibold hover:opacity-80 transition-opacity">
                    <CloudRain className="h-4 w-4 text-blue-500" />
                    Simular Chuva
                    {manualRainDays.size > 0 && (
                      <Badge variant="secondary" className="text-[10px] h-5">{manualRainDays.size} dia{manualRainDays.size > 1 ? "s" : ""}</Badge>
                    )}
                  </button>
                </CollapsibleTrigger>
                {manualRainDays.size > 0 && (
                  <Button variant="ghost" size="sm" className="gap-1 text-xs h-7" onClick={() => setManualRainDays(new Set())}>
                    <X className="h-3 w-3" /> Limpar
                  </Button>
                )}
              </div>
              <CollapsibleContent className="space-y-3 pt-3">
                <p className="text-xs text-muted-foreground">
                  Clique nos dias para marcar como chuvoso. Tarefas externas (outdoor) serão removidas nesses dias.
                </p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {weekDays.map((wd) => {
                    const isRainy = manualRainDays.has(wd.dateStr);
                    return (
                      <button
                        key={wd.dateStr}
                        onClick={() => {
                          setManualRainDays((prev) => {
                            const next = new Set(prev);
                            if (next.has(wd.dateStr)) next.delete(wd.dateStr);
                            else next.add(wd.dateStr);
                            return next;
                          });
                        }}
                        className={cn(
                          "flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-medium transition-all",
                          isRainy
                            ? "border-blue-500 bg-blue-500/20 text-blue-700 dark:text-blue-300"
                            : "border-border bg-background text-muted-foreground hover:border-blue-500/50 hover:bg-blue-500/5"
                        )}
                      >
                        {isRainy && <CloudRain className="h-3 w-3" />}
                        {format(wd.date, "EEE dd/MM", { locale: ptBR })}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 text-xs h-7"
                    onClick={() => setManualRainDays(new Set(weekDays.map((wd) => wd.dateStr)))}
                  >
                    Todos com chuva
                  </Button>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        )}


        {selectedUserIds.length > 0 && !dataLoading && (
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(selectedUserIds.length, 4)}, 1fr)` }}>
            {userWeekTotals.map((u) => {
              const color = getUserColor(u.userId);
              return (
                <div key={u.userId} className={cn("rounded-xl border-2 p-4 space-y-2", color.border, color.bg)}>
                  <div className="flex items-center gap-2">
                    <span className={cn("h-3 w-3 rounded-full", color.dot)} />
                    <span className="text-sm font-semibold truncate">{u.name}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Jornada</p>
                      <p className="font-bold">{Math.round(u.totalAvailable / 60)}h</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Tarefas</p>
                      <p className="font-bold">{Math.round(u.totalTask / 60)}h{u.totalTask % 60 > 0 ? `${u.totalTask % 60}m` : ""}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Ocioso</p>
                      <p className={cn("font-bold", u.totalIdle > 60 ? "text-orange-500" : "text-muted-foreground")}>
                        {Math.floor(u.totalIdle / 60)}h{u.totalIdle % 60 > 0 ? `${u.totalIdle % 60}m` : ""}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Utilização</p>
                      <p className={cn("font-bold", u.utilization > 100 ? "text-red-500" : u.utilization >= 80 ? "text-emerald-500" : u.utilization >= 60 ? "text-blue-500" : "text-orange-500")}>
                        {u.utilization}%
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Ausências</p>
                      <p className={cn("font-bold", u.absentDays > 0 ? "text-warning" : "text-foreground")}>{u.absentDays} dias</p>
                    </div>
                  </div>
                  {/* Workload status badge */}
                  {(() => {
                    const ws = getWorkloadStatus(u.utilization);
                    return (
                      <div className={cn("rounded-lg border px-3 py-1.5 text-center text-xs font-semibold", ws.bgColor, ws.color)}>
                        {ws.icon} {ws.label}
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        )}

        {/* Weekly timeline - multi user */}
        {selectedUserIds.length > 0 && !dataLoading && (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            {/* Timeline header */}
            <div className="flex items-center border-b border-border bg-muted/30">
              <div className="w-36 shrink-0 p-3 text-xs font-semibold text-muted-foreground">Dia / Colab.</div>
              <div className="flex-1 relative h-8">
                {Array.from({ length: timelineEndHour - timelineStartHour + 1 }, (_, i) => timelineStartHour + i)
                  .filter((_, i) => i % 2 === 0)
                  .map((h) => (
                    <span
                      key={h}
                      className="absolute text-[10px] text-muted-foreground -translate-x-1/2 top-2"
                      style={{ left: `${((h - timelineStartHour) / (timelineEndHour - timelineStartHour)) * 100}%` }}
                    >
                      {h}h
                    </span>
                  ))}
              </div>
            </div>

            {/* Day rows with sub-rows per user */}
            {weekDays.map((wd) => {
              const isToday = wd.dateStr === format(new Date(), "yyyy-MM-dd");

              return (
                <div key={wd.dateStr} className={cn("border-b border-border last:border-b-0", isToday && "bg-primary/5")}>
                  {selectedUserIds.map((userId, userIdx) => {
                    const sim = getDayResult(userId, wd.dateStr);
                    const profile = profiles.find((p) => p.user_id === userId);
                    const color = getUserColor(userId);
                    const isWorkDay = !!sim.shiftInfo && !sim.absent;

                    return (
                      <div
                        key={userId}
                        className={cn(
                          "flex items-stretch min-h-[40px]",
                          userIdx > 0 && "border-t border-border/50",
                          sim.absent && "opacity-40"
                        )}
                      >
                        {/* Label */}
                        <div className="w-36 shrink-0 px-3 py-1 flex flex-col justify-center">
                          {userIdx === 0 && (
                            <div className="flex items-center gap-1">
                              <span className={cn("text-[10px] font-semibold", isToday && "text-primary")}>
                                {wd.label}
                              </span>
                              {isRainyDay(wd.dateStr) && (
                                <CloudRain className="h-3 w-3 text-blue-500" />
                              )}
                            </div>
                          )}
                          <div className="flex items-center gap-1.5">
                            <span className={cn("h-2 w-2 rounded-full shrink-0", color.dot)} />
                            <span className="text-[10px] text-muted-foreground truncate">{profile?.full_name}</span>
                          </div>
                          {sim.absent && (
                            <span className="text-[9px] text-warning flex items-center gap-0.5">
                              <UserX className="h-2.5 w-2.5" /> Ausente
                            </span>
                          )}
                          {!sim.absent && sim.shiftInfo && (
                            <div className="flex items-center gap-2">
                              {sim.idleMin > 0 && (
                                <span className="text-[9px] text-muted-foreground flex items-center gap-0.5" title={`Tempo ocioso: ${sim.idleMin}min`}>
                                  <Timer className="h-2.5 w-2.5" /> {sim.idleMin}min ocioso
                                </span>
                              )}
                            </div>
                          )}
                          {!sim.absent && (sim.carryOverCount || 0) > 0 && (
                            <span className="text-[9px] text-orange-500 flex items-center gap-0.5" title={`${sim.carryOverCount} tarefa(s) transferida(s) para o próximo dia`}>
                              <CalendarClock className="h-2.5 w-2.5" /> {sim.carryOverCount} p/ próx.
                            </span>
                          )}
                          {!sim.absent && (sim.advancedCount || 0) > 0 && (
                            <span className="text-[9px] text-primary flex items-center gap-0.5" title={`${sim.advancedCount} tarefa(s) adiantada(s) de dias futuros`}>
                              <CheckCircle2 className="h-2.5 w-2.5" /> +{sim.advancedCount} adiantada(s)
                            </span>
                          )}
                          {!sim.absent && sim.noTasksAvailable && (
                            <span className="text-[9px] text-destructive flex items-center gap-0.5 font-semibold" title="Sem tarefas para adiantar — ir ao Departamento Pessoal">
                              <AlertTriangle className="h-2.5 w-2.5" /> Sem tarefas — DP
                            </span>
                          )}
                          {sim.rainy && !sim.absent && (sim.outdoorBlocked || 0) > 0 && (
                            <span className="text-[9px] text-blue-500 flex items-center gap-0.5">
                              <CloudRain className="h-2.5 w-2.5" /> -{sim.outdoorBlocked} ext.
                            </span>
                          )}
                        </div>

                        {/* Timeline */}
                        <div className="flex-1 relative py-1 pr-2">
                          {isWorkDay && sim.shiftInfo && (
                            <>
                              <div
                                className={cn("absolute top-1 bottom-1 rounded-md border", color.bg, color.border)}
                                style={{
                                  left: `${minuteToPercent(timeToMinutes(sim.shiftInfo.start))}%`,
                                  width: `${minuteToPercent(timeToMinutes(sim.shiftInfo.end)) - minuteToPercent(timeToMinutes(sim.shiftInfo.start))}%`,
                                  opacity: 0.3,
                                }}
                              />

                              {sim.shiftInfo.lunchStart && sim.shiftInfo.lunchEnd && (
                                <div
                                  className="absolute top-1 bottom-1 rounded-sm bg-gray-400/20 border border-gray-400/30 flex items-center justify-center z-10"
                                  style={{
                                    left: `${minuteToPercent(timeToMinutes(sim.shiftInfo.lunchStart))}%`,
                                    width: `${minuteToPercent(timeToMinutes(sim.shiftInfo.lunchEnd)) - minuteToPercent(timeToMinutes(sim.shiftInfo.lunchStart))}%`,
                                  }}
                                >
                                  <UtensilsCrossed className="h-2.5 w-2.5 text-gray-400" />
                                </div>
                              )}

                              {sim.blocks.map((block, i) => {
                                const hasSplit = !!block.lunchSplit;
                                const freqInfo = getFrequencyColor(block.frequency, frequenciesList);
                                const blockLeft = minuteToPercent(block.startOffset);
                                const blockWidth = hasSplit
                                  ? minuteToPercent(block.startOffset + block.lunchSplit!.beforeLunchMinutes) - blockLeft
                                  : minuteToPercent(block.startOffset + block.estimatedMinutes) - blockLeft;
                                
                                // After-lunch segment for split tasks
                                const afterLeft = hasSplit ? minuteToPercent(block.lunchSplit!.afterLunchStartOffset) : 0;
                                const afterWidth = hasSplit
                                  ? minuteToPercent(block.lunchSplit!.afterLunchStartOffset + block.lunchSplit!.afterLunchMinutes) - afterLeft
                                  : 0;

                                // Rest block position (after the full task end)
                                const restStartOffset = hasSplit
                                  ? block.lunchSplit!.afterLunchStartOffset + block.lunchSplit!.afterLunchMinutes
                                  : block.startOffset + block.estimatedMinutes;
                                const restLeft = minuteToPercent(restStartOffset);
                                const restWidth = block.restMinutesAfter > 0 ? minuteToPercent(restStartOffset + block.restMinutesAfter) - restLeft : 0;

                                const pColor = getPriorityColor(block.priority);
                                const taskColor = getTaskNameColor(block.name);
                                const startTime = minutesToTime(block.startOffset);
                                const endTime = hasSplit
                                  ? minutesToTime(block.lunchSplit!.afterLunchStartOffset + block.lunchSplit!.afterLunchMinutes)
                                  : minutesToTime(block.startOffset + block.estimatedMinutes);

                                // 3-color block: task-name bg + left priority border + right frequency pill
                                const blockClasses = cn(
                                  "absolute top-1.5 bottom-1.5 rounded-md flex items-center gap-0.5 px-0.5 overflow-hidden z-20 border border-border/60 text-[9px] font-medium cursor-pointer",
                                  "border-l-[3px]", pColor.leftBorder,
                                  block.status === "advanced" && "border-dashed border-cyan-500/50",
                                  block.isCarryOver && block.status !== "advanced" && "border-dashed"
                                );
                                const blockStyle = {
                                  backgroundColor: taskColor.bg,
                                };

                                const tooltipContent = (
                                  <TooltipContent side="top" className="max-w-xs p-0 overflow-hidden rounded-xl border border-border shadow-lg">
                                    <div className="space-y-0">
                                      <div className="px-3 py-2 border-b border-border" style={{ backgroundColor: taskColor.bg }}>
                                        <div className="flex items-center gap-2">
                                          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: taskColor.dot }} />
                                          <p className="font-semibold text-sm" style={{ color: taskColor.text }}>{block.name}</p>
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                          {/* Priority badge */}
                                          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 border-l-2", pColor.border, pColor.text, pColor.leftBorder)}>
                                            <span className={cn("h-1.5 w-1.5 rounded-full mr-1", pColor.dot)} />
                                            P{block.priority} — {pColor.label}
                                          </Badge>
                                          {/* Frequency badge */}
                                          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", freqInfo.border, freqInfo.text)}>
                                            <span className={cn("h-1.5 w-1.5 rounded-full mr-1", freqInfo.dot)} />
                                            {freqInfo.icon} {freqInfo.label}
                                          </Badge>
                                          {block.isCarryOver && block.status !== "advanced" && (
                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-dashed">Transferida</Badge>
                                          )}
                                          {block.status === "advanced" && (
                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-dashed border-cyan-500/50 text-cyan-600">Adiantada</Badge>
                                          )}
                                          {block.isOutdoor && (
                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">🌿 Outdoor</Badge>
                                          )}
                                          {hasSplit && (
                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500/50 text-amber-600">
                                              🍽️ Pausa almoço
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                      <div className="px-3 py-2 space-y-1.5 text-xs bg-popover">
                                        <div className="flex items-center justify-between gap-4">
                                          <span className="text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Horário</span>
                                          <span className="font-medium text-foreground">{startTime} — {endTime}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-4">
                                          <span className="text-muted-foreground flex items-center gap-1"><Timer className="h-3 w-3" /> Duração</span>
                                          <span className="font-medium text-foreground">{block.estimatedMinutes} min</span>
                                        </div>
                                        {hasSplit && (
                                          <>
                                            <div className="flex items-center justify-between gap-4 text-amber-600">
                                              <span className="flex items-center gap-1"><UtensilsCrossed className="h-3 w-3" /> Antes do almoço</span>
                                              <span className="font-medium">{block.lunchSplit!.beforeLunchMinutes} min</span>
                                            </div>
                                            <div className="flex items-center justify-between gap-4 text-amber-600">
                                              <span className="flex items-center gap-1"><UtensilsCrossed className="h-3 w-3" /> Após o almoço</span>
                                              <span className="font-medium">{block.lunchSplit!.afterLunchMinutes} min</span>
                                            </div>
                                          </>
                                        )}
                                        {block.restMinutesAfter > 0 && (
                                          <div className="flex items-center justify-between gap-4">
                                            <span className="text-muted-foreground flex items-center gap-1"><Coffee className="h-3 w-3" /> Descanso após</span>
                                            <span className="font-medium text-foreground">{block.restMinutesAfter} min</span>
                                          </div>
                                        )}
                                        {block.dependsOnNames && block.dependsOnNames.length > 0 && (
                                          <div className="pt-1 border-t border-border">
                                            <span className="text-muted-foreground text-[10px] flex items-center gap-1 mb-1">
                                              <AlertTriangle className="h-3 w-3" /> Depende de:
                                            </span>
                                            {block.dependsOnNames.map((dep, di) => (
                                              <span key={di} className="block text-foreground font-medium pl-4">• {dep}</span>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </TooltipContent>
                                );

                                return (
                                  <div key={i}>
                                    {/* Pre-lunch (or full) block */}
                                    <TooltipProvider delayDuration={100}>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div
                                            className={blockClasses}
                                            style={{ left: `${blockLeft}%`, width: `${Math.max(blockWidth, 0.8)}%`, ...blockStyle }}
                                            onClick={() => block.templateId && setEditingTemplateId(block.templateId)}
                                          >
                                            <span className="truncate" style={{ color: taskColor.text }}>{block.name}</span>
                                            <span className={cn("ml-auto shrink-0 rounded-sm px-0.5 text-[7px] font-bold leading-tight", freqInfo.bg, freqInfo.text)}>
                                              {freqInfo.short}
                                            </span>
                                          </div>
                                        </TooltipTrigger>
                                        {tooltipContent}
                                      </Tooltip>
                                    </TooltipProvider>

                                    {/* After-lunch block (split tasks) */}
                                    {hasSplit && (
                                      <TooltipProvider delayDuration={100}>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <div
                                              className={cn(blockClasses, "border-l-[3px] border-l-amber-500")}
                                              style={{ left: `${afterLeft}%`, width: `${Math.max(afterWidth, 0.8)}%`, ...blockStyle }}
                                              onClick={() => block.templateId && setEditingTemplateId(block.templateId)}
                                            >
                                              <span className="truncate" style={{ color: taskColor.text }}>{block.name} (cont.)</span>
                                              <span className={cn("ml-auto shrink-0 rounded-sm px-0.5 text-[7px] font-bold leading-tight", freqInfo.bg, freqInfo.text)}>
                                                {freqInfo.short}
                                              </span>
                                            </div>
                                          </TooltipTrigger>
                                          {tooltipContent}
                                        </Tooltip>
                                      </TooltipProvider>
                                    )}

                                    {/* Rest block */}
                                    {block.restMinutesAfter > 0 && (
                                      <div
                                        className="absolute top-2 bottom-2 rounded-sm bg-violet-500/15 border border-violet-500/25 flex items-center justify-center z-20"
                                        style={{ left: `${restLeft}%`, width: `${Math.max(restWidth, 0.4)}%` }}
                                        title={`Descanso: ${block.restMinutesAfter}min`}
                                      >
                                        <Coffee className="h-2 w-2 text-violet-500" />
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </>
                          )}

                          {sim.absent && !sim.shiftInfo && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-[10px] text-muted-foreground">Folga</span>
                            </div>
                          )}
                          {sim.absent && sim.shiftInfo === undefined && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-[10px] text-warning">Ausente</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {/* Legend */}
        {selectedUserIds.length > 0 && (
          <div className="bg-card rounded-xl border border-border p-4 space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground">🎨 Como ler os blocos</h4>
            <div className="flex items-center gap-3 text-xs mb-2">
              <div className="flex items-center gap-1 bg-card border border-border rounded-md px-2 py-1.5 border-l-[3px] border-l-orange-500">
                <span className="text-foreground font-medium">Nome da tarefa</span>
                <span className="ml-1 rounded-sm px-1 text-[8px] font-bold bg-indigo-500/20 text-indigo-600">S</span>
              </div>
              <span className="text-muted-foreground">←</span>
              <div className="space-y-0.5">
                <p><strong className="text-orange-500">Borda esquerda</strong> = Prioridade</p>
                <p><strong className="text-foreground">Centro</strong> = Nome da tarefa</p>
                <p><strong className="text-indigo-600">Pill direito</strong> = Frequência</p>
              </div>
            </div>

            <h4 className="text-xs font-semibold text-muted-foreground mt-2">Prioridade (borda esquerda)</h4>
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="h-4 w-1.5 rounded-sm bg-red-500" /> Crítica (9-10)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-4 w-1.5 rounded-sm bg-orange-500" /> Alta (7-8)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-4 w-1.5 rounded-sm bg-blue-500" /> Média (4-6)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-4 w-1.5 rounded-sm bg-emerald-500" /> Baixa (1-3)
              </span>
            </div>

            <h4 className="text-xs font-semibold text-muted-foreground mt-2">Frequência (pill no bloco)</h4>
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="rounded-sm px-1 py-0.5 text-[8px] font-bold bg-slate-500/20 text-slate-600">D</span> Diária
              </span>
              <span className="flex items-center gap-1.5">
                <span className="rounded-sm px-1 py-0.5 text-[8px] font-bold bg-indigo-500/20 text-indigo-600">S</span> Semanal
              </span>
              <span className="flex items-center gap-1.5">
                <span className="rounded-sm px-1 py-0.5 text-[8px] font-bold bg-purple-500/20 text-purple-600">M</span> Mensal
              </span>
              <span className="flex items-center gap-1.5">
                <span className="rounded-sm px-1 py-0.5 text-[8px] font-bold bg-amber-500/20 text-amber-600">SD</span> Sob demanda
              </span>
              <span className="flex items-center gap-1.5">
                <span className="rounded-sm px-1 py-0.5 text-[8px] font-bold bg-teal-500/20 text-teal-600">Xd</span> Personalizada
              </span>
            </div>

            <h4 className="text-xs font-semibold text-muted-foreground mt-2">Outros indicadores</h4>
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <UtensilsCrossed className="h-3 w-3 text-gray-400" /> Almoço
              </span>
              <span className="flex items-center gap-1.5">
                <Coffee className="h-3 w-3 text-violet-500" /> Descanso
              </span>
              <span className="flex items-center gap-1.5">
                <UserX className="h-3 w-3 text-warning" /> Ausente
              </span>
              <span className="flex items-center gap-1.5">
                <CloudRain className="h-3 w-3 text-blue-500" /> Chuva
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-6 rounded bg-card border border-border border-dashed border-l-[3px] border-l-cyan-500" /> Adiantada
              </span>
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="h-3 w-3 text-destructive" /> Sem tarefas — DP
              </span>
            </div>

            <h4 className="text-xs font-semibold text-muted-foreground mt-2">Carga de Trabalho</h4>
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <span>🔴 Sobrecarregado (&gt;100%)</span>
              <span>🟢 Ideal (85-100%)</span>
              <span>🔵 Moderada (60-84%)</span>
              <span>🟡 Poucas tarefas (30-59%)</span>
              <span>⚪ Ocioso (&lt;30%)</span>
            </div>
          </div>
        )}

        {/* Empty state */}
        {selectedUserIds.length === 0 && !loading && (
          <div className="bg-muted/30 rounded-xl border border-border p-12 text-center">
            <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium text-muted-foreground">Selecione colaboradores</p>
            <p className="text-sm text-muted-foreground mt-1">
              Filtre por função e selecione um ou mais colaboradores para simular a jornada de {viewDays} dias
            </p>
          </div>
        )}

        {(loading || dataLoading) && (
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
          </div>
        )}
      </div>

      <Sheet open={!!editingTemplateId} onOpenChange={(open) => !open && setEditingTemplateId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto p-0">
          <SheetHeader className="px-6 pt-6 pb-2">
            <SheetTitle>Editar Template</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-6">
            {editingTemplateId && (
              <TemplateForm
                templateId={editingTemplateId}
                isDialog
                onSaved={() => {
                  setEditingTemplateId(null);
                  fetchWeekData();
                }}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
