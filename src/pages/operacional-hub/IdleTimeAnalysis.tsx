import { useEffect, useState, useMemo, useCallback } from "react";
import { AppLayout } from "@/components/operacional-hub/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useFrequencies } from "@/hooks/operacional-hub/useFrequencies";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/operacional-hub/useAuth";
import {
  Clock,
  Users,
  AlertTriangle,
  Plus,
  UserCheck,
  CalendarDays,
  Timer,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface ShiftData {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  lunch_start: string | null;
  lunch_end: string | null;
  work_days: number[];
  day_schedules: { day: number; start: string; end: string; lunchStart?: string; lunchEnd?: string }[];
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

interface IdleSlot {
  userId: string;
  userName: string;
  dateStr: string;
  dayLabel: string;
  idleMinutes: number;
  shiftStart: string;
  shiftEnd: string;
  idleStartTime: string;
  idleEndTime: string;
  totalTaskMin: number;
  availableMin: number;
  absent: boolean;
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

export default function IdleTimeAnalysis() {
  const [profiles, setProfiles] = useState<ProfileData[]>([]);
  const [jobFunctions, setJobFunctions] = useState<JobFunctionData[]>([]);
  const [shifts, setShifts] = useState<ShiftData[]>([]);
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [taskTemplates, setTaskTemplates] = useState<any[]>([]);
  const [taskDependencies, setTaskDependencies] = useState<any[]>([]);
  const [absences, setAbsences] = useState<any[]>([]);
  const [brokenToolTemplateIds, setBrokenToolTemplateIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [customStart, setCustomStart] = useState(() => new Date());
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [taskName, setTaskName] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskEstimatedMinutes, setTaskEstimatedMinutes] = useState(30);
  const [taskPriority, setTaskPriority] = useState("5");
  const [creating, setCreating] = useState(false);
  const { data: frequenciesList = [] } = useFrequencies();
  const { toast } = useToast();
  const { user } = useAuth();

  const viewDays = 7;

  const periodRange = useMemo(() => {
    return { start: customStart, end: addDays(customStart, viewDays - 1) };
  }, [customStart]);

  const weekDays = useMemo(() => {
    return eachDayOfInterval({ start: periodRange.start, end: periodRange.end }).map((date) => ({
      date,
      dayOfWeek: date.getDay(),
      dateStr: format(date, "yyyy-MM-dd"),
      label: format(date, "EEE dd/MM", { locale: ptBR }),
    }));
  }, [periodRange]);

  useEffect(() => {
    fetchAllData();
  }, [customStart]);

  const fetchAllData = async () => {
    setLoading(true);
    const startStr = format(periodRange.start, "yyyy-MM-dd");
    const endStr = format(periodRange.end, "yyyy-MM-dd");

    const [profilesRes, functionsRes, shiftsRes, tasksRes, templatesRes, absencesRes, depsRes, ttToolsRes, brokenToolsRes] = await Promise.all([
      supabase.from("op_profiles").select("user_id, full_name, shift_id, job_function_id, is_on_vacation").eq("is_active", true).order("full_name"),
      supabase.from("op_job_functions").select("id, name, sector_id").order("name"),
      supabase.from("op_shifts").select("*"),
      supabase.from("op_task_executions").select("*, task_templates(name, estimated_time_minutes, requires_rest_after, rest_minutes_after, priority, is_outdoor)").gte("scheduled_date", startStr).lte("scheduled_date", endStr),
      supabase.from("op_task_templates").select("id, name, estimated_time_minutes, requires_rest_after, rest_minutes_after, priority, frequency, job_function_id, default_assigned_user_id, additional_assigned_user_ids, required_workers, sector_id, is_active, is_outdoor").eq("is_active", true).eq("is_irregularity_template", false),
      supabase.from("op_absences").select("user_id, absence_date").gte("absence_date", startStr).lte("absence_date", endStr),
      supabase.from("op_task_dependencies").select("task_template_id, depends_on_template_id"),
      supabase.from("op_task_template_tools").select("task_template_id, tool_id"),
      supabase.from("op_tools").select("id").eq("needs_repair", true),
    ]);

    const brokenIds = new Set((brokenToolsRes.data || []).map((t: any) => t.id));
    const blockedTemplates = new Set<string>();
    (ttToolsRes.data || []).forEach((link: any) => {
      if (brokenIds.has(link.tool_id)) blockedTemplates.add(link.task_template_id);
    });
    setBrokenToolTemplateIds(blockedTemplates);
    setProfiles(profilesRes.data || []);
    setJobFunctions(functionsRes.data || []);
    setShifts((shiftsRes.data || []) as unknown as ShiftData[]);
    setAllTasks(tasksRes.data || []);
    setTaskTemplates(templatesRes.data || []);
    setAbsences(absencesRes.data || []);
    setTaskDependencies(depsRes.data || []);
    setLoading(false);
  };

  const getUserShift = (userId: string): ShiftData | null => {
    const profile = profiles.find((p) => p.user_id === userId);
    if (!profile?.shift_id) return null;
    return shifts.find((s) => s.id === profile.shift_id) || null;
  };

  const getDayShiftInfo = (shift: ShiftData | null, dayOfWeek: number) => {
    if (!shift) return null;
    if (!shift.work_days.includes(dayOfWeek)) return null;
    const daySchedule = (shift.day_schedules || []).find((ds) => ds.day === dayOfWeek);
    const start = daySchedule?.start || shift.start_time.slice(0, 5);
    const end = daySchedule?.end || shift.end_time.slice(0, 5);
    const lunchStart = daySchedule?.lunchStart || (shift.lunch_start ? shift.lunch_start.slice(0, 5) : null);
    const lunchEnd = daySchedule?.lunchEnd || (shift.lunch_end ? shift.lunch_end.slice(0, 5) : null);
    return { start, end, lunchStart, lunchEnd };
  };

  const getTemplatesForUser = useCallback((userId: string) => {
    const profile = profiles.find((p) => p.user_id === userId);
    const userFunction = profile?.job_function_id ? jobFunctions.find((jf) => jf.id === profile.job_function_id) : null;
    const userSectorId = userFunction ? (userFunction as any).sector_id : null;
    return taskTemplates.filter((t) => {
      if (t.default_assigned_user_id === userId) return true;
      const additionalIds: string[] = t.additional_assigned_user_ids || [];
      if (additionalIds.includes(userId)) return true;
      if (!t.sector_id) return false;
      if (t.sector_id && userSectorId && t.sector_id !== userSectorId) return false;
      if (t.sector_id && !userSectorId) return false;
      if (!t.default_assigned_user_id && t.job_function_id && profile?.job_function_id === t.job_function_id) return true;
      if (!t.default_assigned_user_id && !t.job_function_id && t.sector_id && t.sector_id === userSectorId) return true;
      return false;
    });
  }, [taskTemplates, profiles, jobFunctions]);

  const shouldRunOnDay = (template: any, dayOfWeek: number, dateStr: string) => {
    if (template.frequency === "daily") return true;
    if (template.frequency === "weekly") return dayOfWeek === 1;
    if (template.frequency === "monthly") return parseInt(dateStr.split("-")[2], 10) === 1;
    if (template.frequency === "on_demand") return false;
    const freq = frequenciesList.find((f: any) => f.name === template.frequency);
    if (freq?.interval_days) {
      const ref = new Date("2024-01-01");
      const d = new Date(dateStr);
      const diffDays = Math.floor((d.getTime() - ref.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays % freq.interval_days === 0;
    }
    return false;
  };

  const isAbsent = (userId: string, dateStr: string) => {
    if (absences.some((a: any) => a.user_id === userId && a.absence_date === dateStr)) return true;
    const profile = profiles.find((p) => p.user_id === userId);
    return profile?.is_on_vacation || false;
  };

  // Calculate idle slots for all users across all days
  const idleSlots = useMemo(() => {
    const slots: IdleSlot[] = [];
    
    for (const profile of profiles) {
      const userId = profile.user_id;
      const shift = getUserShift(userId);
      if (!shift) continue;

      const templates = getTemplatesForUser(userId);

      for (const wd of weekDays) {
        const { dateStr, dayOfWeek, label } = wd;
        const shiftInfo = getDayShiftInfo(shift, dayOfWeek);
        const absent = isAbsent(userId, dateStr);

        if (!shiftInfo || absent) continue;

        const shiftStartMin = timeToMinutes(shiftInfo.start);
        const shiftEndMin = timeToMinutes(shiftInfo.end);
        const lunchStartMin = shiftInfo.lunchStart ? timeToMinutes(shiftInfo.lunchStart) : null;
        const lunchEndMin = shiftInfo.lunchEnd ? timeToMinutes(shiftInfo.lunchEnd) : null;
        const lunchDuration = (lunchStartMin && lunchEndMin) ? Math.max(0, lunchEndMin - lunchStartMin) : 0;
        const availableMin = (shiftEndMin - shiftStartMin) - lunchDuration;

        // Check existing task executions for this day
        const existingTasks = allTasks.filter((t: any) => 
          t.scheduled_date === dateStr && (t.assigned_user_id === userId || t.executed_by_user_id === userId)
        );

        let totalTaskMin = 0;

        if (existingTasks.length > 0) {
          for (const t of existingTasks) {
            const est = (t.task_templates as any)?.estimated_time_minutes || 30;
            const rest = (t.task_templates as any)?.requires_rest_after ? ((t.task_templates as any)?.rest_minutes_after || 0) : 0;
            totalTaskMin += est + rest;
          }
        } else {
          // Use template simulation
          const dayTemplates = templates.filter((t) => shouldRunOnDay(t, dayOfWeek, dateStr) && !brokenToolTemplateIds.has(t.id));
          for (const t of dayTemplates) {
            const est = t.estimated_time_minutes || 30;
            const rest = t.requires_rest_after ? (t.rest_minutes_after || 0) : 0;
            totalTaskMin += est + rest;
          }
        }

        const idleMin = Math.max(0, availableMin - totalTaskMin);
        
        if (idleMin >= 15) {
          // Calculate approximate idle start time (after all tasks end)
          const idleStartMin = Math.min(shiftStartMin + totalTaskMin, shiftEndMin);
          // Skip lunch if idle start falls during lunch
          let adjustedIdleStart = idleStartMin;
          if (lunchStartMin && lunchEndMin && idleStartMin >= lunchStartMin && idleStartMin < lunchEndMin) {
            adjustedIdleStart = lunchEndMin;
          }

          slots.push({
            userId,
            userName: profile.full_name,
            dateStr,
            dayLabel: label,
            idleMinutes: idleMin,
            shiftStart: shiftInfo.start,
            shiftEnd: shiftInfo.end,
            idleStartTime: minutesToTime(adjustedIdleStart),
            idleEndTime: shiftInfo.end.slice(0, 5),
            totalTaskMin,
            availableMin,
            absent: false,
          });
        }
      }
    }

    // Sort: most idle first
    slots.sort((a, b) => b.idleMinutes - a.idleMinutes);
    return slots;
  }, [profiles, shifts, allTasks, taskTemplates, weekDays, absences, frequenciesList, jobFunctions, brokenToolTemplateIds]);

  const toggleSlotSelection = (slotKey: string) => {
    setSelectedSlots((prev) => {
      const next = new Set(prev);
      if (next.has(slotKey)) next.delete(slotKey);
      else next.add(slotKey);
      return next;
    });
  };

  const getSlotKey = (slot: IdleSlot) => `${slot.userId}__${slot.dateStr}`;

  const selectedSlotsList = useMemo(() => {
    return idleSlots.filter((s) => selectedSlots.has(getSlotKey(s)));
  }, [idleSlots, selectedSlots]);

  // Group by date for display
  const slotsByDate = useMemo(() => {
    const map = new Map<string, { label: string; slots: IdleSlot[] }>();
    for (const wd of weekDays) {
      const daySlots = idleSlots.filter((s) => s.dateStr === wd.dateStr);
      if (daySlots.length > 0) {
        map.set(wd.dateStr, { label: wd.label, slots: daySlots });
      }
    }
    return map;
  }, [idleSlots, weekDays]);

  const totalIdleHours = useMemo(() => {
    return Math.round(idleSlots.reduce((sum, s) => sum + s.idleMinutes, 0) / 60 * 10) / 10;
  }, [idleSlots]);

  const uniqueIdleUsers = useMemo(() => {
    return new Set(idleSlots.map((s) => s.userId)).size;
  }, [idleSlots]);

  const handleCreateTask = async () => {
    if (!taskName.trim()) {
      toast({ title: "Nome da tarefa é obrigatório", variant: "destructive" });
      return;
    }
    if (selectedSlotsList.length === 0) {
      toast({ title: "Selecione ao menos um slot", variant: "destructive" });
      return;
    }

    setCreating(true);
    try {
      // First create a task template for the ad-hoc task
      const { data: template, error: templateError } = await supabase
        .from("op_task_templates")
        .insert({
          name: taskName.trim(),
          description: taskDescription.trim() || null,
          estimated_time_minutes: taskEstimatedMinutes,
          priority: parseInt(taskPriority),
          frequency: "on_demand",
          is_active: true,
          is_irregularity_template: false,
          requires_photo: false,
          requires_before_after_photo: false,
          required_workers: 1,
          created_by_user_id: user?.id || null,
          approval_status: "approved",
        })
        .select("id")
        .single();

      if (templateError) throw templateError;

      // Create task_executions for each selected slot
      const executions = selectedSlotsList.map((slot) => ({
        task_template_id: template.id,
        assigned_user_id: slot.userId,
        scheduled_date: slot.dateStr,
        status: "pending" as const,
        priority_score: parseInt(taskPriority) * 10,
        planned_start_time: slot.idleStartTime,
      }));

      const { error: execError } = await supabase
        .from("op_task_executions")
        .insert(executions);

      if (execError) throw execError;

      toast({ title: `Tarefa criada para ${selectedSlotsList.length} slot(s)` });
      setCreateDialogOpen(false);
      setTaskName("");
      setTaskDescription("");
      setTaskEstimatedMinutes(30);
      setTaskPriority("5");
      setSelectedSlots(new Set());
      // Refresh data
      fetchAllData();
    } catch (err: any) {
      toast({ title: "Erro ao criar tarefa", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const getIdleIntensity = (minutes: number, available: number) => {
    const pct = available > 0 ? (minutes / available) * 100 : 0;
    if (pct >= 70) return { color: "text-red-500", bg: "bg-red-500/10 border-red-500/30", label: "Ocioso" };
    if (pct >= 40) return { color: "text-orange-500", bg: "bg-orange-500/10 border-orange-500/30", label: "Poucas tarefas" };
    return { color: "text-yellow-500", bg: "bg-yellow-500/10 border-yellow-500/30", label: "Leve ociosidade" };
  };

  const formatMinutes = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (h === 0) return `${m}min`;
    if (m === 0) return `${h}h`;
    return `${h}h${m.toString().padStart(2, "0")}`;
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Timer className="h-6 w-6 text-primary" />
              Análise de Ociosidade
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Visualize tempos ociosos e crie tarefas avulsas para otimizar a equipe
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setCustomStart((d) => addDays(d, -7))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCustomStart(new Date())}>
              Hoje
            </Button>
            <Button variant="outline" size="icon" onClick={() => setCustomStart((d) => addDays(d, 7))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Period */}
        <p className="text-sm text-muted-foreground">
          <CalendarDays className="inline h-4 w-4 mr-1" />
          {format(periodRange.start, "dd/MM/yyyy", { locale: ptBR })} — {format(periodRange.end, "dd/MM/yyyy", { locale: ptBR })}
        </p>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border">
            <CardContent className="p-4 text-center">
              <Clock className="h-5 w-5 mx-auto text-primary mb-1" />
              <p className="text-2xl font-bold text-foreground">{totalIdleHours}h</p>
              <p className="text-xs text-muted-foreground">Total ocioso</p>
            </CardContent>
          </Card>
          <Card className="border">
            <CardContent className="p-4 text-center">
              <Users className="h-5 w-5 mx-auto text-primary mb-1" />
              <p className="text-2xl font-bold text-foreground">{uniqueIdleUsers}</p>
              <p className="text-xs text-muted-foreground">Pessoas com ociosidade</p>
            </CardContent>
          </Card>
          <Card className="border">
            <CardContent className="p-4 text-center">
              <AlertTriangle className="h-5 w-5 mx-auto text-warning mb-1" />
              <p className="text-2xl font-bold text-foreground">{idleSlots.length}</p>
              <p className="text-xs text-muted-foreground">Slots ociosos</p>
            </CardContent>
          </Card>
          <Card className="border">
            <CardContent className="p-4 text-center">
              <UserCheck className="h-5 w-5 mx-auto text-primary mb-1" />
              <p className="text-2xl font-bold text-foreground">{selectedSlots.size}</p>
              <p className="text-xs text-muted-foreground">Selecionados</p>
            </CardContent>
          </Card>
        </div>

        {/* Action bar */}
        {selectedSlots.size > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/30">
            <UserCheck className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-foreground flex-1">
              {selectedSlots.size} slot(s) selecionado(s) — {[...new Set(selectedSlotsList.map(s => s.userName))].join(", ")}
            </span>
            <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Criar Tarefa
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedSlots(new Set())}>
              Limpar
            </Button>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : idleSlots.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <UserCheck className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">Nenhuma ociosidade detectada</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Todos os colaboradores estão com carga de trabalho adequada nos próximos 7 dias.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {[...slotsByDate.entries()].map(([dateStr, { label, slots }]) => (
              <Card key={dateStr} className="border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    {label}
                    <Badge variant="secondary" className="ml-auto">{slots.length} pessoa(s)</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {slots.map((slot) => {
                    const key = getSlotKey(slot);
                    const isSelected = selectedSlots.has(key);
                    const intensity = getIdleIntensity(slot.idleMinutes, slot.availableMin);

                    return (
                      <div
                        key={key}
                        onClick={() => toggleSlotSelection(key)}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm",
                          isSelected ? "bg-primary/10 border-primary/40 ring-1 ring-primary/20" : "bg-card border-border hover:bg-muted/50"
                        )}
                      >
                        <Checkbox checked={isSelected} className="pointer-events-none" />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm text-foreground">{slot.userName}</span>
                            <Badge variant="outline" className={cn("text-[10px]", intensity.bg, intensity.color)}>
                              {intensity.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span>Turno: {slot.shiftStart.slice(0, 5)}–{slot.shiftEnd.slice(0, 5)}</span>
                            <span>•</span>
                            <span>Tarefas: {formatMinutes(slot.totalTaskMin)}</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p className={cn("text-lg font-bold", intensity.color)}>
                            {formatMinutes(slot.idleMinutes)}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {slot.idleStartTime}–{slot.idleEndTime}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Task Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Criar Tarefa Avulsa
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-xs font-medium">Atribuir para</Label>
              <div className="mt-1 flex flex-wrap gap-1">
                {[...new Map(selectedSlotsList.map(s => [s.userId, s])).values()].map((slot) => (
                  <Badge key={slot.userId} variant="secondary" className="text-xs">
                    {slot.userName}
                  </Badge>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                {selectedSlotsList.length} slot(s) em {[...new Set(selectedSlotsList.map(s => s.dayLabel))].join(", ")}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Nome da tarefa *</Label>
              <Input
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                placeholder="Ex: Limpeza da área externa"
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                placeholder="Detalhes opcionais..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tempo estimado (min)</Label>
                <Input
                  type="number"
                  value={taskEstimatedMinutes}
                  onChange={(e) => setTaskEstimatedMinutes(parseInt(e.target.value) || 30)}
                  min={5}
                />
              </div>
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select value={taskPriority} onValueChange={setTaskPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((p) => (
                      <SelectItem key={p} value={String(p)}>
                        P{p} {p >= 9 ? "— Crítica" : p >= 7 ? "— Alta" : p >= 4 ? "— Média" : "— Baixa"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateTask} disabled={creating}>
              {creating ? "Criando..." : `Criar para ${selectedSlotsList.length} slot(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
