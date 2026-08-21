import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/operacional-hub/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Play,
  Search,
  CalendarDays,
  CalendarIcon,
  Lock,
  Eye,
  Users,
  CloudRain,
  Camera,
  ArrowRight,
  Timer,
  TrendingUp,
  AlertOctagon,
  Package,
  UserX,
  ChevronDown,
  LogOut,
  Loader2,
  Plus,
  Pause,
  Square,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { DailyMaterialsSummary } from "@/components/operacional-hub/dashboard/DailyMaterialsSummary";
import { StatCard } from "@/components/operacional-hub/dashboard/StatCard";
import { SectorStatus } from "@/components/operacional-hub/dashboard/SectorStatus";
import { MaterialAlert } from "@/components/operacional-hub/dashboard/MaterialAlert";
import { ProductivityRanking } from "@/components/operacional-hub/dashboard/ProductivityRanking";
import { useShiftStatus } from "@/hooks/operacional-hub/useShiftStatus";
import { FunctionDepartureDialog } from "@/components/operacional-hub/dashboard/FunctionDepartureDialog";
import { useUserRole } from "@/hooks/operacional-hub/useUserRole";
import { useAuth } from "@/hooks/operacional-hub/useAuth";
import { useEstablishment } from "@/hooks/operacional-hub/useEstablishment";
import { useFrequencies } from "@/hooks/operacional-hub/useFrequencies";
import { useWeatherCondition } from "@/hooks/operacional-hub/useWeatherCondition";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useOfflineTaskCache } from "@/hooks/operacional-hub/useOfflineTaskCache";
import { useOnlineStatus } from "@/hooks/operacional-hub/useOfflineSync";

type TaskStatus = "pending" | "in_progress" | "completed" | "delayed" | "not_done" | "blocked" | "blocked_weather";

interface Task {
  id: string;
  name: string;
  description?: string;
  sector: string;
  sectorColor: string;
  status: TaskStatus;
  estimatedTime: number;
  scheduledDate: string;
  templateId?: string;
  blockedByName?: string;
  assignedUserId?: string | null;
  jobFunctionId?: string | null;
  isVirtual?: boolean;
  isOutdoor?: boolean;
  requiresPhoto?: boolean;
  priority?: number;
  priorityOrder?: number | null;
  requiredWorkers?: number;
}

interface Profile {
  user_id: string;
  full_name: string;
  job_function_id: string | null;
  is_active: boolean | null;
  shift_id: string | null;
}

interface ShiftInfo {
  start_time: string;
  end_time: string;
  lunch_start: string | null;
  lunch_end: string | null;
}

const statusConfig = {
  pending: { icon: Clock, label: "Pendente", bgColor: "bg-muted", textColor: "text-muted-foreground" },
  in_progress: { icon: Play, label: "Em Execução", bgColor: "bg-primary/10", textColor: "text-primary" },
  completed: { icon: CheckCircle2, label: "Concluída", bgColor: "bg-success/10", textColor: "text-success" },
  delayed: { icon: AlertTriangle, label: "Atrasada", bgColor: "bg-warning/10", textColor: "text-warning" },
  not_done: { icon: XCircle, label: "Não Realizada", bgColor: "bg-critical/10", textColor: "text-critical" },
  blocked: { icon: Lock, label: "Bloqueada", bgColor: "bg-muted", textColor: "text-muted-foreground" },
  blocked_weather: { icon: CloudRain, label: "Bloq. Chuva", bgColor: "bg-blue-500/10", textColor: "text-blue-600 dark:text-blue-400" },
};

export default function Tasks() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { establishmentId } = useEstablishment();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { isAdminOrManager } = useUserRole();
  const [simulatedUserId, setSimulatedUserId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [taskTemplates, setTaskTemplates] = useState<any[]>([]);
  const [jobFunctions, setJobFunctions] = useState<any[]>([]);
  const [todayExecutions, setTodayExecutions] = useState<any[]>([]);
  const [dependencies, setDependencies] = useState<any[]>([]);
  const [brokenToolTemplateIds, setBrokenToolTemplateIds] = useState<Set<string>>(new Set());
  const [shiftInfo, setShiftInfo] = useState<ShiftInfo | null>(null);
  const [creatingExecution, setCreatingExecution] = useState<string | null>(null);
  const { data: frequenciesList } = useFrequencies();
  const { isRaining } = useWeatherCondition();
  const { isCheckedIn, hasCheckedOutToday, checkInTime, loading: shiftLoading, checkIn, checkOut, refresh: refreshShift } = useShiftStatus();
  const [shiftActionLoading, setShiftActionLoading] = useState(false);
  const isOnline = useOnlineStatus();
  useOfflineTaskCache(user?.id, establishmentId);

  // Admin dashboard extra data
  const [adminStats, setAdminStats] = useState({
    photosPending: 0,
    absencesToday: 0,
    openIncidents: 0,
    sectors: [] as Array<{ id: string; name: string; completed: number; total: number; color: string }>,
    materials: [] as Array<{ id: string; name: string; currentStock: number; minStock: number; unit: string }>,
    userProductivity: [] as Array<{ id: string; name: string; completedTasks: number; avgTimeEfficiency: number }>,
  });

  // Early checkout dialog
  const [earlyCheckoutOpen, setEarlyCheckoutOpen] = useState(false);
  const [earlyCheckoutReason, setEarlyCheckoutReason] = useState("");
  const [earlyCheckoutDetail, setEarlyCheckoutDetail] = useState("");

  // Ad-hoc task state
  const [adHocActive, setAdHocActive] = useState(false);
  const adHocTitle = "Tarefa Criada pelo Usuário";
  const [adHocDescription, setAdHocDescription] = useState("");
  const [adHocStartedAt, setAdHocStartedAt] = useState<Date | null>(null);
  const [adHocElapsed, setAdHocElapsed] = useState(0);
  const [adHocPhoto, setAdHocPhoto] = useState<File | null>(null);
  const [adHocPhotoPreview, setAdHocPhotoPreview] = useState<string | null>(null);
  const [adHocSaving, setAdHocSaving] = useState(false);
  const [adHocPaused, setAdHocPaused] = useState(false);
  const [adHocPausedAt, setAdHocPausedAt] = useState<number | null>(null);
  const [adHocTotalPauseMs, setAdHocTotalPauseMs] = useState(0);
  const adHocFileRef = useRef<HTMLInputElement>(null);

  const effectiveUserId = simulatedUserId || user?.id || null;
  const isSimulating = !!simulatedUserId;
  const isViewingOtherDate = isAdminOrManager && format(selectedDate, "yyyy-MM-dd") !== format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    fetchAllData();
  }, [isAdminOrManager, user?.id, selectedDate]);

  useEffect(() => {
    if (effectiveUserId && profiles.length > 0) {
      fetchShiftInfo();
    }
  }, [effectiveUserId, profiles]);

  const fetchShiftInfo = async () => {
    const profile = profiles.find(p => p.user_id === effectiveUserId);
    if (!profile?.shift_id) { setShiftInfo(null); return; }
    const { data } = await supabase
      .from("op_shifts")
      .select("start_time, end_time, lunch_start, lunch_end")
      .eq("id", profile.shift_id)
      .single();
    setShiftInfo(data || null);
  };

  const fetchAllData = async () => {
    if (!user?.id) return;
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const queries: any[] = [
        supabase
          .from("op_task_executions")
          .select(`id, status, scheduled_date, task_template_id, assigned_user_id, executed_by_user_id, time_spent_minutes, photo_completion_url,
            task_templates (name, description, estimated_time_minutes, job_function_id, sector_id, priority, requires_photo, is_outdoor, sectors (id, name, color))`)
          .eq("scheduled_date", dateStr)
          .order("created_at", { ascending: false }),
        supabase.from("op_task_dependencies").select("task_template_id, depends_on_template_id"),
        supabase
          .from("op_task_templates")
          .select("id, name, description, estimated_time_minutes, frequency, is_active, is_outdoor, priority, priority_order, work_days, is_irregularity_template, sector_id, job_function_id, default_assigned_user_id, requires_photo, required_workers, additional_assigned_user_ids, sectors(id, name, color), job_functions(id, name)")
          .eq("is_active", true)
          .order("priority", { ascending: false }),
        supabase.from("op_job_functions").select("id, name, sector_id").order("name"),
        supabase.from("op_profiles").select("user_id, full_name, job_function_id, is_active, shift_id").eq("is_active", true).order("full_name"),
        supabase.from("op_task_template_tools").select("task_template_id, tool_id"),
        supabase.from("op_tools").select("id").eq("needs_repair", true),
      ];

      // Admin extra queries
      if (isAdminOrManager) {
        queries.push(
          supabase.from("op_materials").select("*").order("name"),
          supabase.from("op_sectors").select("*").order("name"),
          supabase.from("op_absences").select("id").eq("absence_date", dateStr),
          supabase.from("op_incidents").select("id").eq("status", "open"),
        );
      }

      const results = await Promise.all(queries);
      const [execRes, depsRes, tmplRes, jfRes, profRes, ttToolsRes, brokenToolsRes] = results;

      setTodayExecutions(execRes.data || []);
      setDependencies(depsRes.data || []);
      setTaskTemplates(tmplRes.data || []);
      setJobFunctions(jfRes.data || []);
      setProfiles(profRes.data || []);

      // Compute broken tool template IDs
      const brokenIds = new Set((brokenToolsRes.data || []).map((t: any) => t.id));
      const brokenTemplates = new Set<string>();
      for (const ttTool of (ttToolsRes.data || [])) {
        if (brokenIds.has(ttTool.tool_id)) {
          brokenTemplates.add(ttTool.task_template_id);
        }
      }
      setBrokenToolTemplateIds(brokenTemplates);

      // Process admin stats
      if (isAdminOrManager && results.length > 7) {
        const executions = execRes.data || [];
        const materials = results[7].data || [];
        const sectors = results[8].data || [];
        const absences = results[9].data || [];
        const incidents = results[10].data || [];

        const photosPending = executions.filter(
          (e: any) => e.task_templates?.requires_photo && !e.photo_completion_url && e.status !== "completed"
        ).length;

        const sectorStats = sectors.map((sector: any) => {
          const sectorTasks = executions.filter((e: any) => e.task_templates?.sectors?.id === sector.id);
          return {
            id: sector.id, name: sector.name, color: sector.color || "#3b82f6",
            total: sectorTasks.length,
            completed: sectorTasks.filter((t: any) => t.status === "completed").length,
          };
        }).filter((s: any) => s.total > 0);

        const mappedMaterials = materials.map((m: any) => ({
          id: m.id, name: m.name, currentStock: Number(m.current_stock), minStock: Number(m.min_stock), unit: m.unit,
        }));

        const userProductivityMap = new Map<string, { completed: number; totalEfficiency: number; count: number; name: string }>();
        const allProfiles = profRes.data || [];
        for (const exec of executions) {
          if (exec.status === "completed" && exec.executed_by_user_id) {
            const userId = exec.executed_by_user_id;
            const profile = allProfiles.find((p: any) => p.user_id === userId);
            const name = profile?.full_name || "Usuário";
            const estimatedTime = exec.task_templates?.estimated_time_minutes || 30;
            const timeSpent = exec.time_spent_minutes || estimatedTime;
            const efficiency = Math.round((estimatedTime / timeSpent) * 100);
            const existing = userProductivityMap.get(userId);
            if (existing) { existing.completed += 1; existing.totalEfficiency += efficiency; existing.count += 1; }
            else { userProductivityMap.set(userId, { completed: 1, totalEfficiency: efficiency, count: 1, name }); }
          }
        }

        setAdminStats({
          photosPending,
          absencesToday: absences.length,
          openIncidents: incidents.length,
          sectors: sectorStats,
          materials: mappedMaterials,
          userProductivity: Array.from(userProductivityMap.entries()).map(([id, d]) => ({
            id, name: d.name, completedTasks: d.completed, avgTimeEfficiency: Math.round(d.totalEfficiency / d.count),
          })),
        });
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTemplatesForUser = useCallback((userId: string) => {
    const profile = profiles.find((p) => p.user_id === userId);
    const userFunction = profile?.job_function_id
      ? jobFunctions.find((jf: any) => jf.id === profile.job_function_id)
      : null;
    const userSectorId = userFunction ? (userFunction as any).sector_id : null;
    return taskTemplates.filter((t: any) => {
      if (!t.is_irregularity_template && !t.sector_id) return false;
      if (t.default_assigned_user_id === userId) return true;
      // Check if user is in additional_assigned_user_ids
      const additionalIds: string[] = t.additional_assigned_user_ids || [];
      if (additionalIds.includes(userId)) return true;
      if (t.sector_id && userSectorId && t.sector_id !== userSectorId) return false;
      if (t.sector_id && !userSectorId) return false;
      // If template has no function, anyone in the sector can do it
      if (!t.default_assigned_user_id && !t.job_function_id && t.sector_id === userSectorId) return true;
      // If template has a function, only matching users
      if (!t.default_assigned_user_id && t.job_function_id && profile?.job_function_id === t.job_function_id) return true;
      return false;
    });
  }, [taskTemplates, profiles, jobFunctions]);

  const visibleTasks = useMemo(() => {
    if (!effectiveUserId || !frequenciesList) return [];
    const viewDate = isAdminOrManager ? selectedDate : new Date();
    const viewDateStr = format(viewDate, "yyyy-MM-dd");
    const userTemplates = getTemplatesForUser(effectiveUserId);
    const effectiveProfile = profiles.find((p) => p.user_id === effectiveUserId);
    const effectiveJobFunctionId = effectiveProfile?.job_function_id ?? null;

    // --- Shift time calculation (matching simulation's effectiveShiftStartMin logic) ---
    const timeToMin = (t: string) => {
      const [h, m] = t.slice(0, 5).split(":").map(Number);
      return h * 60 + m;
    };

    let shiftStartMin = 0;
    let shiftEndMin = 24 * 60;
    let lunchStartMin: number | null = null;
    let lunchEndMin: number | null = null;
    let effectiveShiftStartMin = 0;

    if (shiftInfo) {
      shiftStartMin = timeToMin(shiftInfo.start_time);
      shiftEndMin = timeToMin(shiftInfo.end_time);
      if (shiftInfo.lunch_start) lunchStartMin = timeToMin(shiftInfo.lunch_start);
      if (shiftInfo.lunch_end) lunchEndMin = timeToMin(shiftInfo.lunch_end);

      // On current day, adjust start to current time (matching simulation)
      const isToday = viewDateStr === format(new Date(), "yyyy-MM-dd");
      effectiveShiftStartMin = shiftStartMin;
      if (isToday) {
        const now = new Date();
        const currentMin = now.getHours() * 60 + now.getMinutes();
        if (currentMin > shiftStartMin && currentMin < shiftEndMin) {
          effectiveShiftStartMin = currentMin;
        } else if (currentMin >= shiftEndMin) {
          effectiveShiftStartMin = shiftEndMin;
        }
      }
    }

    const isExecutionVisible = (exec: any) => {
      if (exec.assigned_user_id === effectiveUserId) return true;
      if (exec.assigned_user_id) return false;
      const execJobFunctionId = (exec.task_templates as any)?.job_function_id ?? null;
      const execSectorId = (exec.task_templates as any)?.sector_id ?? null;
      if (execJobFunctionId === null) {
        const userFunc = effectiveJobFunctionId ? jobFunctions.find((jf: any) => jf.id === effectiveJobFunctionId) : null;
        const userSectorId = userFunc ? (userFunc as any).sector_id : null;
        return execSectorId && userSectorId && execSectorId === userSectorId;
      }
      return execJobFunctionId === effectiveJobFunctionId;
    };

    const executedTemplateIds = new Set(
      todayExecutions.filter(isExecutionVisible).map((e) => e.task_template_id)
    );

    // Build dependency map
    const dependsOnMap = new Map<string, Set<string>>();
    for (const d of dependencies) {
      if (!dependsOnMap.has(d.task_template_id)) dependsOnMap.set(d.task_template_id, new Set());
      dependsOnMap.get(d.task_template_id)!.add(d.depends_on_template_id);
    }

    // Build set of user's template IDs for cross-user dependency resolution
    const userTemplateIds = new Set(userTemplates.map(t => t.id));

    const completedTemplateIds = new Set(
      todayExecutions.filter((t) => t.status === "completed").map((t) => t.task_template_id)
    );

    // shouldRunOnDay from simulation: daily=true, weekly=Monday, monthly=day1, on_demand=false
    const shouldRunOnDay = (tmpl: any, date: Date): boolean => {
      const templateWorkDays: number[] = tmpl.work_days || [1, 2, 3, 4, 5];
      const dow = date.getDay();
      if (!templateWorkDays.includes(dow)) return false;
      const freq = tmpl.frequency;
      if (freq === "daily") return true;
      if (freq === "weekly") return dow === 1;
      if (freq === "monthly") return date.getDate() === 1;
      if (freq === "on_demand") return false;
      const customFreq = frequenciesList.find((f: any) => f.name === freq);
      if (customFreq?.interval_days) {
        const ref = new Date("2024-01-01");
        const diffDays = Math.floor((date.getTime() - ref.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays % customFreq.interval_days === 0;
      }
      return false;
    };

    // --- Build candidate task list (real executions + virtual from templates) ---
    // This mirrors the simulation's merge logic exactly
    interface CandidateTask {
      id: string;
      name: string;
      description: string;
      sector: string;
      sectorColor: string;
      estimatedTime: number;
      scheduledDate: string;
      templateId?: string;
      assignedUserId?: string | null;
      jobFunctionId?: string | null;
      isVirtual?: boolean;
      isOutdoor?: boolean;
      requiresPhoto?: boolean;
      priority: number;
      priorityOrder: number | null;
      requiredWorkers: number;
      realStatus?: string; // original status from execution
      restMinutesAfter: number;
      requiresRestAfter: boolean;
    }

    const candidates: CandidateTask[] = [];

    // Real executions
    for (const exec of todayExecutions) {
      if (!isExecutionVisible(exec)) continue;
      const templateId = exec.task_template_id;
      const tmplData = taskTemplates.find((t: any) => t.id === templateId);
      candidates.push({
        id: exec.id,
        name: exec.task_templates?.name || "Sem nome",
        description: tmplData?.description || "",
        sector: exec.task_templates?.sectors?.name || "Sem setor",
        sectorColor: exec.task_templates?.sectors?.color || "#3b82f6",
        estimatedTime: exec.task_templates?.estimated_time_minutes || 0,
        scheduledDate: exec.scheduled_date,
        templateId,
        assignedUserId: exec.assigned_user_id,
        jobFunctionId: (exec.task_templates as any)?.job_function_id || null,
        isOutdoor: tmplData?.is_outdoor || false,
        requiresPhoto: tmplData?.requires_photo || false,
        priority: tmplData?.priority || 5,
        priorityOrder: tmplData?.priority_order ?? null,
        requiredWorkers: tmplData?.required_workers || 1,
        realStatus: exec.status,
        restMinutesAfter: tmplData?.requires_rest_after ? (tmplData?.rest_minutes_after || 0) : 0,
        requiresRestAfter: tmplData?.requires_rest_after || false,
      });
    }

    // Virtual tasks from templates (not yet executed)
    const filteredTemplates = userTemplates.filter(tmpl =>
      !executedTemplateIds.has(tmpl.id) &&
      shouldRunOnDay(tmpl, viewDate) &&
      !brokenToolTemplateIds.has(tmpl.id)
    );

    for (const tmpl of filteredTemplates) {
      // Filter outdoor tasks on rainy days (matching simulation)
      if (isRaining && tmpl.is_outdoor) continue;

      candidates.push({
        id: `virtual-${tmpl.id}`,
        name: tmpl.name,
        description: tmpl.description || "",
        sector: tmpl.sectors?.name || "Sem setor",
        sectorColor: tmpl.sectors?.color || "#3b82f6",
        estimatedTime: tmpl.estimated_time_minutes || 0,
        scheduledDate: viewDateStr,
        templateId: tmpl.id,
        assignedUserId: effectiveUserId,
        jobFunctionId: tmpl.job_function_id,
        isVirtual: true,
        isOutdoor: tmpl.is_outdoor || false,
        requiresPhoto: tmpl.requires_photo || false,
        priority: tmpl.priority || 5,
        priorityOrder: tmpl.priority_order ?? null,
        requiredWorkers: tmpl.required_workers || 1,
        realStatus: undefined,
        restMinutesAfter: tmpl.requires_rest_after ? (tmpl.rest_minutes_after || 0) : 0,
        requiresRestAfter: tmpl.requires_rest_after || false,
      });
    }

    // Also filter out outdoor real tasks that are pending on rainy days
    // (matching simulation behavior)

    // --- Separate fixed tasks (completed, in_progress, not_done) from schedulable ---
    const fixedTasks: Task[] = [];
    const schedulableCandidates: CandidateTask[] = [];

    for (const c of candidates) {
      if (c.realStatus === "completed" || c.realStatus === "in_progress" || c.realStatus === "not_done") {
        let status = c.realStatus as TaskStatus;
        fixedTasks.push({
          id: c.id, name: c.name, description: c.description,
          sector: c.sector, sectorColor: c.sectorColor,
          status, estimatedTime: c.estimatedTime,
          scheduledDate: c.scheduledDate, templateId: c.templateId,
          assignedUserId: c.assignedUserId, jobFunctionId: c.jobFunctionId,
          isVirtual: c.isVirtual, isOutdoor: c.isOutdoor,
          requiresPhoto: c.requiresPhoto, priority: c.priority,
          priorityOrder: c.priorityOrder, requiredWorkers: c.requiredWorkers,
        });
      } else {
        schedulableCandidates.push(c);
      }
    }

    // --- Dependency-aware ready queue scheduling (matching simulation exactly) ---
    const completedTemplates = new Set(completedTemplateIds);
    const dependentsOf = new Map<string, CandidateTask[]>();
    const blockedSet = new Set<string>();
    const readyQueue: CandidateTask[] = [];

    for (const task of schedulableCandidates) {
      if (task.templateId) {
        const deps = dependsOnMap.get(task.templateId);
        if (deps && deps.size > 0) {
          // Cross-user dependencies are assumed satisfied (matching simulation)
          const relevantDeps = [...deps].filter((depId) => userTemplateIds.has(depId));
          const allDepsMet = relevantDeps.every((depId) => completedTemplates.has(depId));
          if (!allDepsMet) {
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

    // Sort ready queue by priority (matching simulation)
    readyQueue.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      const aOrder = a.priorityOrder ?? -1;
      const bOrder = b.priorityOrder ?? -1;
      return bOrder - aOrder;
    });

    // --- Time-fitting with lunch split (matching simulation) ---
    let currentMin = effectiveShiftStartMin;
    const fittedTasks: Task[] = [];

    // Account for time already used by in-progress/completed tasks
    const inProgressTime = fixedTasks
      .filter(t => t.status === "in_progress")
      .reduce((sum, t) => sum + t.estimatedTime, 0);
    currentMin += inProgressTime;

    const tryFitTask = (task: CandidateTask): boolean => {
      if (!shiftInfo) {
        // No shift info = show all tasks
        return true;
      }
      let candidateMin = currentMin;

      // If in lunch window, jump to after lunch
      if (lunchStartMin !== null && lunchEndMin !== null && candidateMin >= lunchStartMin && candidateMin < lunchEndMin) {
        candidateMin = lunchEndMin;
      }

      // Check if task spans lunch - split it
      if (lunchStartMin !== null && lunchEndMin !== null && candidateMin < lunchStartMin && candidateMin + task.estimatedTime > lunchStartMin) {
        const afterLunchMinutes = task.estimatedTime - (lunchStartMin - candidateMin);
        const taskEndMin = lunchEndMin + afterLunchMinutes;
        if (taskEndMin > shiftEndMin) return false;
        currentMin = taskEndMin;
        if (task.requiresRestAfter && task.restMinutesAfter > 0) {
          currentMin += task.restMinutesAfter;
        }
        return true;
      }

      const taskEndMin = candidateMin + task.estimatedTime;
      if (taskEndMin > shiftEndMin) return false;
      currentMin = taskEndMin;
      if (task.requiresRestAfter && task.restMinutesAfter > 0) {
        currentMin += task.restMinutesAfter;
      }
      return true;
    };

    // Process ready queue with dependency unlocking (matching simulation)
    while (readyQueue.length > 0) {
      const task = readyQueue.shift()!;
      const fitted = tryFitTask(task);
      if (!fitted) continue; // Doesn't fit in shift

      // Determine status
      let status: TaskStatus = task.realStatus as TaskStatus || "pending";
      let blockedByName: string | undefined;

      if (isRaining && task.isOutdoor && (!task.realStatus || task.realStatus === "pending")) {
        status = "blocked_weather";
        blockedByName = "Chuva";
      }

      fittedTasks.push({
        id: task.id, name: task.name, description: task.description,
        sector: task.sector, sectorColor: task.sectorColor,
        status, estimatedTime: task.estimatedTime,
        scheduledDate: task.scheduledDate, templateId: task.templateId,
        blockedByName, assignedUserId: task.assignedUserId,
        jobFunctionId: task.jobFunctionId, isVirtual: task.isVirtual,
        isOutdoor: task.isOutdoor, requiresPhoto: task.requiresPhoto,
        priority: task.priority, priorityOrder: task.priorityOrder,
        requiredWorkers: task.requiredWorkers,
      });

      // Unlock dependents (matching simulation)
      if (task.templateId) {
        completedTemplates.add(task.templateId);
        const unlocked = dependentsOf.get(task.templateId) || [];
        const newlyReady: CandidateTask[] = [];
        for (const dep of unlocked) {
          if (dep.templateId && blockedSet.has(dep.templateId)) {
            const allDeps = dependsOnMap.get(dep.templateId);
            if (allDeps && [...allDeps].filter(id => userTemplateIds.has(id)).every(id => completedTemplates.has(id))) {
              blockedSet.delete(dep.templateId);
              newlyReady.push(dep);
            }
          }
        }
        // Insert newly ready tasks maintaining priority order
        for (const nr of newlyReady) {
          let insertIdx = readyQueue.findIndex((q) => {
            if (q.priority < nr.priority) return true;
            if (q.priority === nr.priority) return (q.priorityOrder ?? -1) < (nr.priorityOrder ?? -1);
            return false;
          });
          if (insertIdx === -1) insertIdx = readyQueue.length;
          readyQueue.splice(insertIdx, 0, nr);
        }
      }
    }

    return [...fixedTasks, ...fittedTasks];
  }, [effectiveUserId, frequenciesList, getTemplatesForUser, todayExecutions, dependencies, taskTemplates, profiles, selectedDate, isAdminOrManager, isRaining, shiftInfo, brokenToolTemplateIds, jobFunctions]);

  const sortedTasks = useMemo(() => {
    let tasks = visibleTasks;
    if (search || statusFilter !== "all") {
      tasks = tasks.filter((task) => {
        const matchesSearch = !search || task.name.toLowerCase().includes(search.toLowerCase()) || task.sector.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === "all" || task.status === statusFilter;
        return matchesSearch && matchesStatus;
      });
    }
    // Maintain the order from visibleTasks (which already matches simulation),
    // but put in_progress first
    return [...tasks].sort((a, b) => {
      const aInProgress = a.status === "in_progress" ? 0 : 1;
      const bInProgress = b.status === "in_progress" ? 0 : 1;
      return aInProgress - bInProgress;
    });
  }, [visibleTasks, search, statusFilter]);

  const workCycleInfo = useMemo(() => {
    const totalEstimated = visibleTasks
      .filter(t => t.status !== "completed" && t.status !== "not_done")
      .reduce((sum, t) => sum + t.estimatedTime, 0);
    const completedTime = visibleTasks
      .filter(t => t.status === "completed")
      .reduce((sum, t) => sum + t.estimatedTime, 0);
    const totalTasks = visibleTasks.length;
    const doneTasks = visibleTasks.filter(t => t.status === "completed").length;

    let availableMinutes = 0;
    if (shiftInfo) {
      const [sh, sm] = shiftInfo.start_time.split(":").map(Number);
      const [eh, em] = shiftInfo.end_time.split(":").map(Number);
      availableMinutes = (eh * 60 + em) - (sh * 60 + sm);
      if (shiftInfo.lunch_start && shiftInfo.lunch_end) {
        const [lsh, lsm] = shiftInfo.lunch_start.split(":").map(Number);
        const [leh, lem] = shiftInfo.lunch_end.split(":").map(Number);
        availableMinutes -= (leh * 60 + lem) - (lsh * 60 + lsm);
      }
      if (availableMinutes < 0) availableMinutes += 24 * 60;
    }

    return { totalEstimated, completedTime, totalTasks, doneTasks, availableMinutes };
  }, [visibleTasks, shiftInfo]);

  const nextTask = useMemo(() => {
    return sortedTasks.find(t => t.status === "in_progress") || sortedTasks.find(t => t.status === "pending");
  }, [sortedTasks]);

  const getExpectedEndTime = useCallback((task: Task) => {
    const now = new Date();
    const endTime = new Date(now.getTime() + task.estimatedTime * 60000);
    return format(endTime, "HH:mm");
  }, []);

  const handleStartVirtualTask = async (task: Task) => {
    if (!task.templateId || !effectiveUserId) return;
    setCreatingExecution(task.id);
    try {
      const dateStr = format(isAdminOrManager ? selectedDate : new Date(), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("op_task_executions")
        .insert({
          task_template_id: task.templateId,
          assigned_user_id: effectiveUserId,
          scheduled_date: dateStr,
          status: "pending",
        })
        .select("id")
        .single();

      if (error) throw error;
      navigate(`/tasks/${data.id}`);
    } catch (error) {
      console.error("Error creating execution:", error);
      toast({ title: "Erro", description: "Não foi possível criar a tarefa", variant: "destructive" });
    } finally {
      setCreatingExecution(null);
    }
  };

  const handleTaskClick = (task: Task) => {
    if (task.status === "blocked" || task.status === "blocked_weather") return;
    // Block interaction if shift not started (unless simulating)
    if (!isCheckedIn && !isSimulating) {
      toast({ title: "Turno não iniciado", description: "Inicie o turno antes de executar tarefas.", variant: "destructive" });
      return;
    }
    // Enforce sequential execution: only allow interacting with the next task or tasks already in progress
    if (!isAdminOrManager && task.status === "pending" && nextTask && task.id !== nextTask.id) {
      toast({ title: "Sequência obrigatória", description: "Finalize a tarefa atual antes de iniciar outra.", variant: "destructive" });
      return;
    }
    if (task.isVirtual) {
      handleStartVirtualTask(task);
    } else {
      navigate(`/tasks/${task.id}`);
    }
  };

  const pendingCount = visibleTasks.filter(t => t.status === "pending").length;
  const inProgressCount = visibleTasks.filter(t => t.status === "in_progress").length;
  const completedCount = visibleTasks.filter(t => t.status === "completed").length;
  const delayedCount = visibleTasks.filter(t => t.status === "delayed").length;
  const weatherBlockedCount = visibleTasks.filter(t => t.status === "blocked_weather").length;
  const simulatedUserName = simulatedUserId ? profiles.find(p => p.user_id === simulatedUserId)?.full_name : null;
  const totalAllTasks = todayExecutions.length;
  const completedAllTasks = todayExecutions.filter((e: any) => e.status === "completed").length;
  const completionRate = totalAllTasks > 0 ? Math.round((completedAllTasks / totalAllTasks) * 100) : 0;

  const handleShiftCheckIn = async () => {
    setShiftActionLoading(true);
    const isReopening = hasCheckedOutToday;
    const { error } = await checkIn();
    if (error) {
      toast({ title: "Erro", description: error, variant: "destructive" });
      setShiftActionLoading(false);
      return;
    }
    toast({ title: isReopening ? "Turno reaberto!" : "Turno iniciado!", description: "Reprogramando suas tarefas..." });
    try {
      await supabase.functions.invoke("generate-daily-tasks", {
        body: {
          user_id: user?.id,
          establishment_id: establishmentId,
          check_in_time: new Date().toISOString(),
          reopen: isReopening,
        },
      });
    } catch (e) {
      console.error("Error generating tasks:", e);
    }
    await refreshShift();
    await fetchAllData();
    setShiftActionLoading(false);
  };

  const isShiftOver = useMemo(() => {
    if (!shiftInfo) return true; // No shift info, allow checkout
    const now = new Date();
    const [eh, em] = shiftInfo.end_time.split(":").map(Number);
    const endToday = new Date();
    endToday.setHours(eh, em, 0, 0);
    return now >= endToday;
  }, [shiftInfo]);

  const handleShiftCheckOut = async () => {
    if (!isShiftOver) {
      setEarlyCheckoutOpen(true);
      return;
    }
    await doCheckOut();
  };

  const doCheckOut = async (reason?: string) => {
    setShiftActionLoading(true);
    const { error } = await checkOut();
    if (error) {
      toast({ title: "Erro", description: error, variant: "destructive" });
    } else {
      if (reason) {
        // Log early departure
        try {
          await supabase.from("op_function_departures").insert({
            user_id: user!.id,
            reason: `Saída antecipada: ${reason}`,
            observations: earlyCheckoutDetail || null,
            establishment_id: establishmentId,
          });
        } catch (e) {
          console.error("Error logging early departure:", e);
        }
      }
      setEarlyCheckoutOpen(false);
      setEarlyCheckoutReason("");
      setEarlyCheckoutDetail("");
      toast({ title: "Turno encerrado", description: "Até a próxima!" });
    }
    setShiftActionLoading(false);
  };

  // Ad-hoc task timer
  useEffect(() => {
    if (!adHocStartedAt || adHocPaused) return;
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - adHocStartedAt.getTime() - adHocTotalPauseMs) / 1000);
      setAdHocElapsed(Math.max(0, elapsed));
    }, 1000);
    return () => clearInterval(interval);
  }, [adHocStartedAt, adHocPaused, adHocTotalPauseMs]);

  const handleAdHocStart = () => {
    setAdHocStartedAt(new Date());
    setAdHocElapsed(0);
    setAdHocPaused(false);
    setAdHocTotalPauseMs(0);
  };

  const handleAdHocPause = () => {
    setAdHocPaused(true);
    setAdHocPausedAt(Date.now());
  };

  const handleAdHocResume = () => {
    if (adHocPausedAt) {
      setAdHocTotalPauseMs(prev => prev + (Date.now() - adHocPausedAt));
    }
    setAdHocPaused(false);
    setAdHocPausedAt(null);
  };

  const handleAdHocPhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAdHocPhoto(file);
      const reader = new FileReader();
      reader.onload = () => setAdHocPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleAdHocFinish = async () => {
    if (!adHocTitle.trim()) {
      toast({ title: "Informe o título da atividade", variant: "destructive" });
      return;
    }
    if (!adHocPhoto && !adHocDescription.trim()) {
      toast({ title: "Tire uma foto ou descreva o que foi feito", variant: "destructive" });
      return;
    }

    setAdHocSaving(true);
    try {
      let photoUrl: string | null = null;
      if (adHocPhoto) {
        const fileName = `adhoc/${user!.id}/${Date.now()}.jpg`;
        const { error: upErr } = await supabase.storage.from("task-photos").upload(fileName, adHocPhoto);
        if (!upErr) {
          const { data: { publicUrl } } = supabase.storage.from("task-photos").getPublicUrl(fileName);
          photoUrl = publicUrl;
        }
      }

      const timeSpent = Math.floor(adHocElapsed / 60);

      // Create a task_template for the ad-hoc task
      const { data: template, error: tErr } = await supabase
        .from("op_task_templates")
        .insert({
          name: adHocTitle,
          description: adHocDescription || "Atividade avulsa",
          frequency: "on_demand",
          is_active: false,
          requires_photo: false,
          estimated_time_minutes: Math.max(timeSpent, 1),
          required_workers: 1,
        })
        .select("id")
        .single();

      if (tErr) throw tErr;

      // Create the execution
      const { error: eErr } = await supabase
        .from("op_task_executions")
        .insert({
          task_template_id: template.id,
          assigned_user_id: user!.id,
          executed_by_user_id: user!.id,
          scheduled_date: format(new Date(), "yyyy-MM-dd"),
          status: "completed",
          started_at: adHocStartedAt!.toISOString(),
          completed_at: new Date().toISOString(),
          time_spent_minutes: timeSpent,
          observations: adHocDescription || null,
          photo_completion_url: photoUrl,
        });

      if (eErr) throw eErr;

      toast({ title: "Atividade registrada! ✅" });
      setAdHocActive(false);
      // adHocTitle is a constant
      setAdHocDescription("");
      setAdHocStartedAt(null);
      setAdHocElapsed(0);
      setAdHocPhoto(null);
      setAdHocPhotoPreview(null);
      await fetchAllData();
    } catch (error) {
      console.error("Error saving ad-hoc task:", error);
      toast({ title: "Erro", description: "Não foi possível salvar", variant: "destructive" });
    } finally {
      setAdHocSaving(false);
    }
  };

  const formatAdHocTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const allTasksDone = visibleTasks.length > 0 && pendingCount === 0 && inProgressCount === 0;

  // If worker hasn't started shift yet or has checked out, show start/reopen button
  if (!isAdminOrManager && !shiftLoading && !isCheckedIn) {
    const isReopen = hasCheckedOutToday;
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-6 px-4">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-foreground">
              {isReopen ? "Turno encerrado" : "Olá! 👋"}
            </h1>
            <p className="text-muted-foreground">
              {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
            </p>
            {isReopen && (
              <p className="text-sm text-muted-foreground">
                Você encerrou seu turno. Deseja reabrir e reprogramar suas tarefas?
              </p>
            )}
          </div>
          <Button
            size="lg"
            onClick={handleShiftCheckIn}
            disabled={shiftActionLoading}
            className="gap-3 h-16 px-10 text-lg rounded-2xl bg-success hover:bg-success/90 text-success-foreground shadow-lg"
          >
            {shiftActionLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <Play className="h-6 w-6" />
            )}
            {isReopen ? "Reabrir Turno" : "Iniciar Turno"}
          </Button>
          <p className="text-sm text-muted-foreground text-center max-w-xs">
            {isReopen
              ? "Suas tarefas pendentes serão reprogramadas a partir do horário atual."
              : "Ao iniciar o turno, suas tarefas do dia serão geradas automaticamente."}
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-3 max-w-4xl mx-auto">
        {/* Header - compact */}
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground">
              {isAdminOrManager ? "Painel de Controle" : "Minhas Tarefas"}
            </h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <CalendarDays className="h-3 w-3" />
              {format(isAdminOrManager ? selectedDate : new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Function Departure - prominent */}
            {!isAdminOrManager && <FunctionDepartureDialog onDepartureConfirmed={() => fetchAllData()} />}
            {/* Circular progress */}
            {visibleTasks.length > 0 && (
              <div className="relative h-12 w-12">
                <svg className="h-12 w-12 -rotate-90" viewBox="0 0 48 48">
                  <circle cx="24" cy="24" r="20" fill="none" strokeWidth="4" className="stroke-muted" />
                  <circle cx="24" cy="24" r="20" fill="none" strokeWidth="4" className="stroke-success" strokeLinecap="round"
                    strokeDasharray={`${(visibleTasks.length > 0 ? (completedCount / visibleTasks.length) * 100 : 0) * 1.257} 125.7`} />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-foreground">
                  {visibleTasks.length > 0 ? Math.round((completedCount / visibleTasks.length) * 100) : 0}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Compact Stats Row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col items-center py-2.5 rounded-xl bg-muted/40 border border-border">
            <span className="text-2xl font-bold text-foreground">{pendingCount}</span>
            <span className="text-[10px] text-muted-foreground font-medium">A Fazer</span>
          </div>
          <div className="flex flex-col items-center py-2.5 rounded-xl bg-primary/10 border border-primary/20">
            <span className="text-2xl font-bold text-primary">{inProgressCount}</span>
            <span className="text-[10px] text-primary font-medium">Fazendo</span>
          </div>
          <div className="flex flex-col items-center py-2.5 rounded-xl bg-success/10 border border-success/20">
            <span className="text-2xl font-bold text-success">{completedCount}</span>
            <span className="text-[10px] text-success font-medium">Feitas</span>
          </div>
        </div>

        {/* Shift Control - prominent */}
        {!isCheckedIn && !shiftLoading ? (
          <Button
            size="lg"
            onClick={handleShiftCheckIn}
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
              onClick={handleShiftCheckOut}
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

        {/* Alert pills - only show when there's something important */}
        {(delayedCount > 0 || (isRaining && weatherBlockedCount > 0) || (isAdminOrManager && !isSimulating && (adminStats.absencesToday > 0 || adminStats.openIncidents > 0 || adminStats.photosPending > 0))) && (
          <div className="flex flex-wrap gap-1.5">
            {delayedCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-warning/10 border border-warning/20 text-xs font-medium text-warning">
                <AlertTriangle className="h-3 w-3" />{delayedCount} atrasada{delayedCount !== 1 ? "s" : ""}
              </span>
            )}
            {isRaining && weatherBlockedCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-medium text-blue-600 dark:text-blue-400">
                <CloudRain className="h-3 w-3" />{weatherBlockedCount} bloqueada{weatherBlockedCount !== 1 ? "s" : ""} (chuva)
              </span>
            )}
            {isAdminOrManager && !isSimulating && adminStats.photosPending > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-critical/10 border border-critical/20 text-xs font-medium text-critical">
                <Camera className="h-3 w-3" />{adminStats.photosPending} foto{adminStats.photosPending !== 1 ? "s" : ""}
              </span>
            )}
            {isAdminOrManager && !isSimulating && adminStats.absencesToday > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-warning/10 border border-warning/20 text-xs font-medium text-warning">
                <UserX className="h-3 w-3" />{adminStats.absencesToday} falta{adminStats.absencesToday !== 1 ? "s" : ""}
              </span>
            )}
            {isAdminOrManager && !isSimulating && adminStats.openIncidents > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-critical/10 border border-critical/20 text-xs font-medium text-critical">
                <AlertOctagon className="h-3 w-3" />{adminStats.openIncidents} incidente{adminStats.openIncidents !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        )}

        {/* Admin Simulation Panel - compact */}
        {isAdminOrManager && (
          <div className="bg-card rounded-xl border border-border p-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={simulatedUserId || "none"} onValueChange={(v) => setSimulatedUserId(v === "none" ? null : v)}>
                <SelectTrigger className="flex-1 h-9 rounded-lg bg-background border-border text-sm">
                  <SelectValue placeholder="Selecione um colaborador" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="none"><span className="flex items-center gap-2"><Users className="h-3.5 w-3.5" /> Minha visão</span></SelectItem>
                  {profiles.map((p) => (<SelectItem key={p.user_id} value={p.user_id}>{p.full_name}</SelectItem>))}
                </SelectContent>
              </Select>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("h-9 rounded-lg gap-1.5", isViewingOtherDate && "border-warning/50 text-warning")}>
                    <CalendarIcon className="h-3.5 w-3.5" />{format(selectedDate, "dd/MM/yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={selectedDate} onSelect={(d) => d && setSelectedDate(d)} locale={ptBR} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
              {(simulatedUserId || isViewingOtherDate) && (
                <Button variant="ghost" size="sm" onClick={() => { setSimulatedUserId(null); setSelectedDate(new Date()); }} className="h-9 gap-1 text-xs">
                  <XCircle className="h-3.5 w-3.5" />Limpar
                </Button>
              )}
            </div>
            {(simulatedUserId || isViewingOtherDate) && (
              <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                {simulatedUserId && <Badge variant="secondary" className="gap-1 text-xs"><Eye className="h-3 w-3" />{simulatedUserName}</Badge>}
                {isViewingOtherDate && <Badge variant="outline" className="gap-1 text-xs border-warning/50 text-warning"><CalendarIcon className="h-3 w-3" />{format(selectedDate, "dd/MM", { locale: ptBR })}</Badge>}
                <Badge variant="outline" className="gap-1 text-xs text-muted-foreground">{visibleTasks.length} tarefa(s)</Badge>
              </div>
            )}
          </div>
        )}

        {/* NEXT TASK - Big prominent card */}
        {nextTask && (
          <div
            className={cn(
              "rounded-xl border-2 p-4 transition-all",
              !isCheckedIn && !isSimulating
                ? "border-muted bg-muted/30 opacity-60 cursor-not-allowed"
                : "cursor-pointer active:scale-[0.98]",
              isCheckedIn || isSimulating
                ? nextTask.status === "in_progress"
                  ? "border-primary bg-primary/5"
                  : "border-success bg-success/5"
                : ""
            )}
            onClick={() => (isCheckedIn || isSimulating) && handleTaskClick(nextTask)}
          >
            <div className="flex items-center gap-2 mb-1.5">
              {nextTask.status === "in_progress" ? (
                <div className="flex items-center gap-1.5 text-primary">
                  <div className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
                  <span className="text-xs font-bold uppercase">Em andamento</span>
                </div>
              ) : (
                <span className="text-xs font-bold text-success uppercase flex items-center gap-1.5">
                  <ArrowRight className="h-3.5 w-3.5" /> Próxima tarefa
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold text-foreground">{nextTask.name}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {nextTask.sector} • {nextTask.estimatedTime ? `${nextTask.estimatedTime} min` : "Tempo livre"}
              {nextTask.requiresPhoto && " • 📷 Foto"}
            </p>

            <Button
              size="lg"
              className={cn(
                "w-full mt-3 h-12 rounded-xl gap-2 text-base font-bold",
                !isCheckedIn && !isSimulating
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : nextTask.status === "in_progress"
                    ? "bg-primary hover:bg-primary/90"
                    : "bg-success hover:bg-success/90 text-success-foreground"
              )}
              disabled={(!isCheckedIn && !isSimulating) || creatingExecution === nextTask.id}
              onClick={(e) => { e.stopPropagation(); handleTaskClick(nextTask); }}
            >
              {creatingExecution === nextTask.id ? (
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
              ) : !isCheckedIn && !isSimulating ? (
                <>
                  <Lock className="h-5 w-5" />
                  INICIE O TURNO PRIMEIRO
                </>
              ) : (
                <>
                  <Play className="h-5 w-5" />
                  {nextTask.status === "in_progress" ? "CONTINUAR TAREFA" : "INICIAR TAREFA"}
                </>
              )}
            </Button>
          </div>
        )}

        {/* Search - only show if many tasks */}
        {visibleTasks.length > 5 && (
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 rounded-lg bg-card border-border text-sm" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-28 h-9 rounded-lg bg-card border-border text-sm">
                <SelectValue placeholder="Filtrar" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">A Fazer</SelectItem>
                <SelectItem value="in_progress">Fazendo</SelectItem>
                <SelectItem value="completed">Feitas</SelectItem>
                <SelectItem value="blocked">Bloqueadas</SelectItem>
                {weatherBlockedCount > 0 && <SelectItem value="blocked_weather">Chuva</SelectItem>}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Task List */}
        <div className="space-y-1.5">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
              <p className="text-sm text-muted-foreground mt-3">Carregando...</p>
            </div>
          ) : sortedTasks.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-xl border border-border">
              <CheckCircle2 className="h-12 w-12 text-success/50 mx-auto mb-3" />
              <p className="text-base font-bold text-foreground">
                {completedCount > 0 ? "Tudo feito! 🎉" : "Nenhuma tarefa para hoje"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {completedCount > 0 ? "Bom trabalho!" : "Nenhuma tarefa prevista"}
              </p>
            </div>
          ) : (
            sortedTasks.map((task) => {
              const config = statusConfig[task.status];
              const Icon = config.icon;
              const isBlocked = task.status === "blocked" || task.status === "blocked_weather";
              const isLockedBySequence = !isAdminOrManager && task.status === "pending" && nextTask && task.id !== nextTask.id;
              const shiftNotStarted = !isCheckedIn && !isSimulating;
              const isClickable = !isBlocked && !isLockedBySequence && !isSimulating && !isViewingOtherDate && !shiftNotStarted;
              const isNext = nextTask?.id === task.id;

              if (isNext && !isSimulating && !isViewingOtherDate) return null;

              return (
                <div
                  key={task.id}
                  className={cn(
                    "flex items-center gap-2.5 p-2.5 rounded-lg border transition-all",
                    isBlocked || isLockedBySequence
                      ? "bg-muted/30 border-border opacity-60"
                      : task.status === "completed"
                        ? "bg-success/5 border-success/20"
                        : task.status === "not_done"
                          ? "bg-critical/5 border-critical/20"
                          : "bg-card border-border",
                    isClickable && "cursor-pointer hover:shadow-sm active:scale-[0.99]"
                  )}
                  onClick={() => isClickable && handleTaskClick(task)}
                >
                  <div className={cn(
                    "h-7 w-7 rounded-full flex items-center justify-center shrink-0",
                    task.status === "completed" ? "bg-success text-success-foreground" :
                    task.status === "not_done" ? "bg-critical text-critical-foreground" :
                    (isBlocked || isLockedBySequence) ? "bg-muted text-muted-foreground" :
                    "bg-primary/10 text-primary"
                  )}>
                    {task.status === "completed" ? <CheckCircle2 className="h-3.5 w-3.5" /> :
                     task.status === "not_done" ? <XCircle className="h-3.5 w-3.5" /> :
                     isLockedBySequence ? <Lock className="h-3.5 w-3.5" /> :
                     <Icon className="h-3.5 w-3.5" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "font-medium text-sm truncate",
                      (isBlocked || isLockedBySequence || task.status === "completed" || task.status === "not_done") ? "text-muted-foreground" : "text-foreground"
                    )}>{task.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {isLockedBySequence
                        ? "🔒 Finalize a tarefa atual primeiro"
                        : isBlocked && task.blockedByName
                          ? `⏳ ${task.blockedByName}`
                          : `${task.sector} • ${task.estimatedTime ? `${task.estimatedTime}min` : "Tempo livre"}`
                      }
                      {task.requiresPhoto && " • 📷"}
                      {(task.requiredWorkers || 1) > 1 && ` • 👥${task.requiredWorkers}`}
                    </p>
                  </div>

                  <div className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0", config.bgColor, config.textColor)}>
                    {config.label}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Ad-hoc task — shown when all tasks are done */}
        {allTasksDone && !isSimulating && !isViewingOtherDate && !isAdminOrManager && (
          <div className="bg-card rounded-2xl border-2 border-dashed border-primary/30 p-5 space-y-4">
            {!adHocActive ? (
              <div className="text-center space-y-3">
                <p className="text-sm text-muted-foreground">
                  Todas as tarefas foram concluídas. Deseja registrar uma atividade extra?
                </p>
                <Button
                  onClick={() => setAdHocActive(true)}
                  className="gap-2 bg-primary hover:bg-primary/90 rounded-xl h-12 text-base font-bold"
                >
                  <Plus className="h-5 w-5" />
                  Criar Atividade Avulsa
                </Button>
              </div>
            ) : (
              <>
                <div className="text-center">
                  <p className="text-sm font-semibold text-muted-foreground">{adHocTitle}</p>
                </div>

                {/* Timer */}
                <div className="text-center py-3">
                  <p className={cn(
                    "text-4xl font-bold font-mono tabular-nums",
                    adHocPaused ? "text-warning" : adHocStartedAt ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {formatAdHocTime(adHocElapsed)}
                  </p>
                  {adHocStartedAt && !adHocPaused && (
                    <div className="flex items-center justify-center gap-1.5 mt-1 text-primary">
                      <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                      <span className="text-xs font-medium">Em execução</span>
                    </div>
                  )}
                  {adHocPaused && (
                    <span className="text-xs font-medium text-warning">Pausado</span>
                  )}
                </div>

                {/* Controls */}
                {!adHocStartedAt ? (
                  <Button
                    onClick={handleAdHocStart}
                    disabled={false}
                    className="w-full h-14 rounded-xl gap-2 text-lg font-bold bg-success hover:bg-success/90 text-success-foreground"
                  >
                    <Play className="h-6 w-6" />
                    INICIAR
                  </Button>
                ) : (
                  <div className="space-y-3">
                    {/* Photo */}
                    <div>
                      {adHocPhotoPreview ? (
                        <div className="relative">
                          <img src={adHocPhotoPreview} alt="Foto" className="w-full rounded-xl max-h-48 object-cover" />
                          <Button variant="secondary" size="sm" className="absolute bottom-2 right-2 rounded-lg" onClick={() => adHocFileRef.current?.click()}>
                            Trocar
                          </Button>
                        </div>
                      ) : (
                        <button
                          onClick={() => adHocFileRef.current?.click()}
                          disabled={adHocPaused}
                          className="w-full h-28 rounded-xl border-2 border-dashed border-primary/50 flex flex-col items-center justify-center gap-2 text-primary hover:bg-primary/5 transition-colors cursor-pointer active:scale-[0.98]"
                        >
                          <Camera className="h-7 w-7" />
                          <span className="text-sm font-medium">Tirar foto do serviço</span>
                        </button>
                      )}
                      <input ref={adHocFileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleAdHocPhotoCapture} />
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">
                        {adHocPhoto ? "Descrição (opcional)" : "Descreva o que foi feito *"}
                      </Label>
                      <Textarea
                        value={adHocDescription}
                        onChange={(e) => setAdHocDescription(e.target.value)}
                        placeholder="Descreva a atividade realizada..."
                        rows={2}
                        className="rounded-xl text-sm resize-none"
                      />
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2.5">
                      {!adHocPaused ? (
                        <Button variant="outline" onClick={handleAdHocPause} className="h-12 rounded-xl gap-2 border-warning/50 text-warning hover:bg-warning/10 px-5">
                          <Pause className="h-5 w-5" />
                          <span className="hidden sm:inline">Pausar</span>
                        </Button>
                      ) : (
                        <Button onClick={handleAdHocResume} className="h-12 rounded-xl gap-2 bg-primary hover:bg-primary/90 px-5">
                          <Play className="h-5 w-5" />
                          <span className="hidden sm:inline">Retomar</span>
                        </Button>
                      )}
                      <Button
                        onClick={handleAdHocFinish}
                        disabled={adHocSaving || adHocPaused || (!adHocPhoto && !adHocDescription.trim())}
                        className={cn(
                          "flex-1 h-12 rounded-xl gap-2 text-base font-bold",
                          (adHocPhoto || adHocDescription.trim()) && !adHocPaused
                            ? "bg-success hover:bg-success/90 text-success-foreground"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {adHocSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                        Finalizar
                      </Button>
                    </div>

                    {!adHocPhoto && !adHocDescription.trim() && (
                      <p className="text-center text-xs text-muted-foreground">
                        Tire uma foto ou descreva o que foi feito para finalizar
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Secondary info - collapsed */}
        <details className="group mt-2">
          <summary className="flex items-center justify-center gap-2 py-3 text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors rounded-xl border border-dashed border-border hover:border-primary/30 hover:bg-muted/30">
            <Package className="h-3.5 w-3.5" />
            <span className="font-medium">Materiais do dia</span>
            <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
          </summary>
          <div className="pt-3">
            {!isViewingOtherDate && <DailyMaterialsSummary filterUserId={isSimulating ? simulatedUserId : undefined} />}
          </div>
        </details>
      </div>

      {/* Early Checkout Justification Dialog */}
      <Dialog open={earlyCheckoutOpen} onOpenChange={setEarlyCheckoutOpen}>
        <DialogContent className="max-w-md mx-3">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-6 w-6 text-warning" />
              Encerrar turno antecipadamente
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 text-center">
              <p className="text-sm font-medium text-warning">
                Seu turno termina às {shiftInfo?.end_time?.slice(0, 5) || "--:--"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Você precisa justificar a saída antecipada
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-base font-semibold">Motivo *</Label>
              <Select value={earlyCheckoutReason} onValueChange={setEarlyCheckoutReason}>
                <SelectTrigger className="h-12 text-base rounded-xl">
                  <SelectValue placeholder="Selecione o motivo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Liberado pela chefia">Liberado pela chefia</SelectItem>
                  <SelectItem value="Problema de saúde">Problema de saúde</SelectItem>
                  <SelectItem value="Emergência pessoal">Emergência pessoal</SelectItem>
                  <SelectItem value="Condições climáticas">Condições climáticas</SelectItem>
                  <SelectItem value="Falta de demanda">Falta de demanda</SelectItem>
                  <SelectItem value="Outro motivo">Outro motivo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {earlyCheckoutReason === "Outro motivo" && (
              <div className="space-y-2">
                <Label>Descreva o motivo</Label>
                <Textarea
                  value={earlyCheckoutDetail}
                  onChange={(e) => setEarlyCheckoutDetail(e.target.value)}
                  placeholder="Descreva o motivo..."
                  rows={2}
                  className="rounded-xl"
                />
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={() => { setEarlyCheckoutOpen(false); setEarlyCheckoutReason(""); }}>
                Cancelar
              </Button>
              <Button
                onClick={() => doCheckOut(earlyCheckoutReason)}
                disabled={!earlyCheckoutReason.trim() || (earlyCheckoutReason === "Outro motivo" && !earlyCheckoutDetail.trim()) || shiftActionLoading}
                className="flex-1 h-12 rounded-xl bg-warning hover:bg-warning/90 text-warning-foreground text-base font-bold"
              >
                {shiftActionLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Encerrar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
