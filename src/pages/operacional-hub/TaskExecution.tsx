import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/operacional-hub/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ArrowLeft, 
  Play, 
  Camera, 
  Clock,
  CheckCircle2,
  Loader2,
  XCircle,
  CalendarDays,
  AlertTriangle,
  Users,
  Pause,
  CloudRain,
  Wrench,
  Volume2,
  VolumeX,
  Mic,
  Square,
  Trash2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/operacional-hub/useAuth";
import { useEstablishment } from "@/hooks/operacional-hub/useEstablishment";
import { validateTaskCompletion, calculateImageHash } from "@/lib/operacional-hub/antifraud";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LocationPhotosViewer } from "@/components/operacional-hub/tasks/LocationPhotosViewer";
import { WeatherCheckDialog } from "@/components/operacional-hub/tasks/WeatherCheckDialog";
import { useWeatherCondition } from "@/hooks/operacional-hub/useWeatherCondition";
import { ToolCheckDialog } from "@/components/operacional-hub/tasks/ToolCheckDialog";
import { useOfflineSync } from "@/hooks/operacional-hub/useOfflineSync";
import { getCachedData, addToPhotoQueue, fileToBase64 } from "@/lib/operacional-hub/offlineDb";

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  type?: "check" | "yes_no";
  sector_id?: string;
  answer?: "yes" | "no";
}

interface TaskData {
  id: string;
  name: string;
  description: string;
  sector: string;
  sectorColor: string;
  status: string;
  checklist: ChecklistItem[];
  estimatedTime: number;
  requiresPhoto: boolean;
  startedAt: string | null;
  photoUrl: string | null;
  photoBeforeUrl: string | null;
  observations: string;
  minExecutionMinutes: number;
  expectedLat: number | null;
  expectedLng: number | null;
  locationRadius: number;
  requiresBeforeAfterPhoto: boolean;
  locationPhotos: string[];
  requiredWorkers: number;
  teamMembers: { name: string; isCurrentUser: boolean }[];
  isOutdoor: boolean;
  pausedAt: string | null;
  pauseCount: number;
  totalPauseMinutes: number;
  pauseReason: string | null;
}

const PAUSE_REASONS = [
  "Intervalo/Descanso",
  "Problema técnico",
  "Remanejado temporariamente",
  "Chuva",
  "Falta de material",
  "Aguardando liberação de área",
  "Outro motivo",
];

export default function TaskExecution() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { establishmentId } = useEstablishment();

  const [task, setTask] = useState<TaskData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [observations, setObservations] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  
  // Not done dialog state
  const [notDoneDialogOpen, setNotDoneDialogOpen] = useState(false);
  const [notDoneReason, setNotDoneReason] = useState("");
  const [savingNotDone, setSavingNotDone] = useState(false);
  const [notDoneAudioBlob, setNotDoneAudioBlob] = useState<Blob | null>(null);
  const [notDoneAudioUrl, setNotDoneAudioUrl] = useState<string | null>(null);
  const [isRecordingNotDone, setIsRecordingNotDone] = useState(false);
  const notDoneRecorderRef = useRef<MediaRecorder | null>(null);
  const [showNoTasksDialog, setShowNoTasksDialog] = useState(false);
  const [showWeatherCheck, setShowWeatherCheck] = useState(false);
  const [showToolCheck, setShowToolCheck] = useState(false);
  const [taskTemplateId, setTaskTemplateId] = useState<string | null>(null);
  const { isRaining, refresh: refreshWeather } = useWeatherCondition();
  const { isOnline, queueAction } = useOfflineSync();
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Delay reason dialog
  const [delayDialogOpen, setDelayDialogOpen] = useState(false);
  const [delayReason, setDelayReason] = useState("");
  const [pendingCompleteData, setPendingCompleteData] = useState<Record<string, any> | null>(null);

  // Pause dialog state
  const [pauseDialogOpen, setPauseDialogOpen] = useState(false);
  const [pauseReason, setPauseReason] = useState("");
  const [pauseReasonDetail, setPauseReasonDetail] = useState("");
  const [savingPause, setSavingPause] = useState(false);

  // Irregularity from yes/no checklist
  const [irregularityDialogOpen, setIrregularityDialogOpen] = useState(false);
  const [irregularityChecklistItem, setIrregularityChecklistItem] = useState<ChecklistItem | null>(null);
  const [irregularityTitle, setIrregularityTitle] = useState("");
  const [irregularityDescription, setIrregularityDescription] = useState("");
  const [irregularityPhotoFile, setIrregularityPhotoFile] = useState<File | null>(null);
  const [irregularityPhotoPreview, setIrregularityPhotoPreview] = useState<string | null>(null);
  const [savingIrregularity, setSavingIrregularity] = useState(false);
  const [irregularitySectorName, setIrregularitySectorName] = useState<string | null>(null);
  const irregularityFileRef = useRef<HTMLInputElement>(null);

  // Weather interruption dialog
  const [weatherInterruptionOpen, setWeatherInterruptionOpen] = useState(false);

  useEffect(() => {
    if (id) fetchTask();
  }, [id]);

  // Timer that accounts for pauses
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (task?.status === "in_progress" && task.startedAt && !task.pausedAt) {
      const startTime = new Date(task.startedAt).getTime();
      const totalPauseMs = (task.totalPauseMinutes || 0) * 60 * 1000;
      interval = setInterval(() => {
        const now = Date.now();
        const elapsed = Math.floor((now - startTime - totalPauseMs) / 1000);
        setElapsedTime(Math.max(0, elapsed));
      }, 1000);
    } else if (task?.status === "in_progress" && task.pausedAt) {
      // Paused - freeze the timer
      const startTime = new Date(task.startedAt!).getTime();
      const pauseTime = new Date(task.pausedAt).getTime();
      const totalPauseMs = (task.totalPauseMinutes || 0) * 60 * 1000;
      const elapsed = Math.floor((pauseTime - startTime - totalPauseMs) / 1000);
      setElapsedTime(Math.max(0, elapsed));
    }
    return () => clearInterval(interval);
  }, [task?.status, task?.startedAt, task?.pausedAt, task?.totalPauseMinutes]);

  // Weather change listener - force pause outdoor tasks
  useEffect(() => {
    if (!task || task.status !== "in_progress" || !task.isOutdoor || task.pausedAt) return;

    if (isRaining) {
      setWeatherInterruptionOpen(true);
    }
  }, [isRaining, task?.status, task?.isOutdoor, task?.pausedAt]);

  // Realtime subscription for weather changes
  useEffect(() => {
    const channel = supabase
      .channel('weather-interrupt')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'operational_conditions',
          filter: "type=eq.weather"
        },
        () => {
          refreshWeather();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchTask = async () => {
    try {
      const { data, error } = await supabase
        .from("op_task_executions")
        .select(`
          id,
          status,
          checklist_progress,
          started_at,
          photo_completion_url,
          photo_before_url,
          photo_after_url,
          observations,
          expected_latitude,
          expected_longitude,
          location_radius_meters,
          task_template_id,
          is_outdoor_task,
          paused_at,
          pause_count,
          total_pause_minutes,
          pause_reason,
          task_templates:op_task_templates(
            name,
            description,
            estimated_time_minutes,
            requires_photo,
            requires_before_after_photo,
            checklist,
            min_execution_minutes,
            location_photos,
            required_workers,
            additional_assigned_user_ids,
            default_assigned_user_id,
            is_outdoor,
            sectors:op_sectors(
              name,
              color
            )
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;

      const progressChecklist = data.checklist_progress as unknown as ChecklistItem[] | null;
      const templateChecklist = data.task_templates?.checklist as unknown as ChecklistItem[] | null;
      const checklist = (progressChecklist && progressChecklist.length > 0)
        ? progressChecklist
        : (templateChecklist || []);

      // Fetch team members if multi-person task
      const requiredWorkers = (data.task_templates as any)?.required_workers || 1;
      let teamMembers: { name: string; isCurrentUser: boolean }[] = [];
      if (requiredWorkers > 1) {
        const allUserIds: string[] = [];
        const primaryUserId = (data.task_templates as any)?.default_assigned_user_id;
        const additionalIds: string[] = (data.task_templates as any)?.additional_assigned_user_ids || [];
        if (primaryUserId) allUserIds.push(primaryUserId);
        allUserIds.push(...additionalIds.filter((id: string) => id && !allUserIds.includes(id)));
        
        if (allUserIds.length > 0) {
          const { data: memberProfiles } = await supabase
            .from("op_profiles")
            .select("user_id, full_name")
            .in("user_id", allUserIds);
          
          teamMembers = (memberProfiles || []).map((p: any) => ({
            name: p.full_name,
            isCurrentUser: p.user_id === user?.id,
          }));
        }
      }

      setTask({
        id: data.id,
        name: data.task_templates?.name || "Sem nome",
        description: data.task_templates?.description || "",
        sector: data.task_templates?.sectors?.name || "Sem setor",
        sectorColor: data.task_templates?.sectors?.color || "#3b82f6",
        status: data.status,
        checklist,
        estimatedTime: data.task_templates?.estimated_time_minutes || 0,
        requiresPhoto: data.task_templates?.requires_photo || false,
        requiresBeforeAfterPhoto: data.task_templates?.requires_before_after_photo || false,
        startedAt: data.started_at,
        photoUrl: data.photo_completion_url || data.photo_after_url,
        photoBeforeUrl: data.photo_before_url,
        observations: data.observations || "",
        minExecutionMinutes: data.task_templates?.min_execution_minutes || 0,
        expectedLat: data.expected_latitude ? Number(data.expected_latitude) : null,
        expectedLng: data.expected_longitude ? Number(data.expected_longitude) : null,
        locationRadius: data.location_radius_meters || 500,
        locationPhotos: data.task_templates?.location_photos || [],
        requiredWorkers,
        teamMembers,
        isOutdoor: data.is_outdoor_task || data.task_templates?.is_outdoor || false,
        pausedAt: data.paused_at,
        pauseCount: data.pause_count || 0,
        totalPauseMinutes: data.total_pause_minutes || 0,
        pauseReason: data.pause_reason,
      });
      setTaskTemplateId(data.task_template_id);

      // Check material availability
      if (data.task_template_id && data.status === "pending") {
        const { data: materialsNeeded } = await supabase
          .from("op_task_template_materials")
          .select(`
            quantity_needed,
            materials:op_materials(current_stock, name)
          `)
          .eq("task_template_id", data.task_template_id);

        if (materialsNeeded && materialsNeeded.length > 0) {
          const insufficientMaterials = materialsNeeded.filter(
            (m: any) => m.materials && m.materials.current_stock < (m.quantity_needed || 1)
          );
          if (insufficientMaterials.length > 0) {
            const names = insufficientMaterials
              .map((m: any) => `${m.materials.name} (precisa: ${m.quantity_needed}, tem: ${m.materials.current_stock})`)
              .join(", ");
            toast({
              title: "⚠️ Materiais insuficientes",
              description: `Tarefa pulada por falta de: ${names}`,
              variant: "destructive",
            });
            navigate("/operacional/tasks");
            return;
          }
        }
      }

      const taskIsOutdoor = data.is_outdoor_task || data.task_templates?.is_outdoor || false;
      if (taskIsOutdoor) {
        setShowWeatherCheck(true);
      } else {
        // Skip weather, go straight to tool check if needed
        if (data.task_template_id) {
          setShowToolCheck(true);
        }
      }
      setObservations(data.observations || "");
      if (data.photo_completion_url) {
        setPhotoPreview(data.photo_completion_url);
      }
    } catch (error) {
      console.error("Error fetching task:", error);
      // Try loading from offline cache
      if (!navigator.onLine) {
        try {
          const cachedTasks = await getCachedData<any[]>(`tasks_${user?.id}_${establishmentId}`);
          if (cachedTasks) {
            const cached = cachedTasks.find((t: any) => t.id === id);
            if (cached) {
              const template = cached.task_template;
              const progressChecklist = cached.checklist_progress as ChecklistItem[] | null;
              const templateChecklist = template?.checklist as ChecklistItem[] | null;
              const checklist = (progressChecklist && progressChecklist.length > 0) ? progressChecklist : (templateChecklist || []);
              
              setTask({
                id: cached.id,
                name: template?.name || "Sem nome",
                description: template?.description || "",
                sector: template?.sector?.name || "Sem setor",
                sectorColor: template?.sector?.color || "#3b82f6",
                status: cached.status,
                checklist,
                estimatedTime: template?.estimated_time_minutes || 0,
                requiresPhoto: template?.requires_photo || false,
                requiresBeforeAfterPhoto: template?.requires_before_after_photo || false,
                startedAt: cached.started_at,
                photoUrl: cached.photo_completion_url || cached.photo_after_url,
                photoBeforeUrl: cached.photo_before_url,
                observations: cached.observations || "",
                minExecutionMinutes: template?.min_execution_minutes || 0,
                expectedLat: cached.expected_latitude ? Number(cached.expected_latitude) : null,
                expectedLng: cached.expected_longitude ? Number(cached.expected_longitude) : null,
                locationRadius: cached.location_radius_meters || 500,
                locationPhotos: template?.location_photos || [],
                requiredWorkers: template?.required_workers || 1,
                teamMembers: [],
                isOutdoor: cached.is_outdoor_task || template?.is_outdoor || false,
                pausedAt: cached.paused_at,
                pauseCount: cached.pause_count || 0,
                totalPauseMinutes: cached.total_pause_minutes || 0,
                pauseReason: cached.pause_reason,
              });
              setTaskTemplateId(cached.task_template_id);
              setObservations(cached.observations || "");
              toast({ title: "📴 Modo offline", description: "Dados carregados do cache local" });
              setLoading(false);
              return;
            }
          }
        } catch { /* ignore */ }
      }
      toast({
        title: "Erro",
        description: "Não foi possível carregar a tarefa",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    if (!task) return;
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.warn("Geolocation error:", err)
      );
    }

    try {
      const now = new Date().toISOString();
      const updateData = {
        status: "in_progress" as const,
        started_at: now,
        actual_start_time: now,
        executed_by_user_id: user?.id,
      };

      if (!navigator.onLine) {
        await queueAction("task_executions", "update", updateData, "id", task.id);
        setTask({ ...task, status: "in_progress", startedAt: now, pausedAt: null });
        toast({ title: "Tarefa iniciada (offline)", description: "Será sincronizado ao reconectar." });
        return;
      }

      const { error } = await supabase
        .from("op_task_executions")
        .update(updateData as never)
        .eq("id", task.id);

      if (error) throw error;

      setTask({ ...task, status: "in_progress", startedAt: now, pausedAt: null });
      toast({ title: "Tarefa iniciada!" });
    } catch (error) {
      // If network error, queue offline
      if (!navigator.onLine) {
        const now = new Date().toISOString();
        await queueAction("task_executions", "update", {
          status: "in_progress", started_at: now, actual_start_time: now, executed_by_user_id: user?.id,
        }, "id", task.id);
        setTask({ ...task, status: "in_progress", startedAt: now, pausedAt: null });
        toast({ title: "Tarefa iniciada (offline)" });
        return;
      }
      console.error("Error starting task:", error);
      toast({
        title: "Erro",
        description: "Não foi possível iniciar a tarefa",
        variant: "destructive",
      });
    }
  };

  // ===== PAUSE LOGIC =====
  const handlePause = async (reason: string) => {
    if (!task) return;
    setSavingPause(true);
    
    try {
      const now = new Date().toISOString();
      const finalReason = reason === "Outro motivo" && pauseReasonDetail 
        ? `Outro: ${pauseReasonDetail}` 
        : reason;
      
      const updateData = {
        paused_at: now,
        pause_reason: finalReason,
        pause_count: (task.pauseCount || 0) + 1,
      };

      if (!navigator.onLine) {
        await queueAction("task_executions", "update", updateData, "id", task.id);
      } else {
        const { error } = await supabase
          .from("op_task_executions")
          .update(updateData)
          .eq("id", task.id);
        if (error) throw error;
      }

      setTask({
        ...task,
        pausedAt: now,
        pauseReason: finalReason,
        pauseCount: (task.pauseCount || 0) + 1,
      });
      
      setPauseDialogOpen(false);
      setWeatherInterruptionOpen(false);
      setPauseReason("");
      setPauseReasonDetail("");
      
      toast({ 
        title: "⏸️ Tarefa pausada",
        description: `Motivo: ${finalReason}`,
      });
    } catch (error) {
      console.error("Error pausing task:", error);
      toast({ title: "Erro", description: "Não foi possível pausar a tarefa", variant: "destructive" });
    } finally {
      setSavingPause(false);
    }
  };

  const handleResume = async () => {
    if (!task || !task.pausedAt) return;
    setSavingPause(true);

    try {
      const pauseStart = new Date(task.pausedAt).getTime();
      const now = Date.now();
      const pauseMinutes = Math.floor((now - pauseStart) / 60000);
      const newTotalPause = (task.totalPauseMinutes || 0) + pauseMinutes;

      const updateData = {
        paused_at: null,
        pause_reason: null,
        total_pause_minutes: newTotalPause,
      };

      if (!navigator.onLine) {
        await queueAction("task_executions", "update", updateData, "id", task.id);
      } else {
        const { error } = await supabase
          .from("op_task_executions")
          .update(updateData)
          .eq("id", task.id);
        if (error) throw error;
      }

      setTask({
        ...task,
        pausedAt: null,
        pauseReason: null,
        totalPauseMinutes: newTotalPause,
      });

      toast({ title: "▶️ Tarefa retomada!" });
    } catch (error) {
      console.error("Error resuming task:", error);
      toast({ title: "Erro", description: "Não foi possível retomar a tarefa", variant: "destructive" });
    } finally {
      setSavingPause(false);
    }
  };

  const handleWeatherPause = () => {
    handlePause("Chuva");
  };

  const handleChecklistChange = async (itemId: string, checked: boolean) => {
    if (!task) return;
    
    const updatedChecklist = task.checklist.map((item) =>
      item.id === itemId ? { ...item, completed: checked } : item
    );

    setTask({ ...task, checklist: updatedChecklist });

    try {
      const updateData = { checklist_progress: JSON.parse(JSON.stringify(updatedChecklist)) };
      if (!navigator.onLine) {
        await queueAction("task_executions", "update", updateData, "id", task.id);
      } else {
        await supabase
          .from("op_task_executions")
          .update(updateData)
          .eq("id", task.id);
      }
    } catch (error) {
      console.error("Error updating checklist:", error);
    }
  };

  const handleYesNoAnswer = async (itemId: string, answer: "yes" | "no") => {
    if (!task) return;
    
    const item = task.checklist.find(i => i.id === itemId);
    if (!item) return;

    const updatedChecklist = task.checklist.map((i) =>
      i.id === itemId ? { ...i, completed: true, answer } : i
    );

    setTask({ ...task, checklist: updatedChecklist });

    try {
      await supabase
        .from("op_task_executions")
        .update({ checklist_progress: JSON.parse(JSON.stringify(updatedChecklist)) })
        .eq("id", task.id);
    } catch (error) {
      console.error("Error updating checklist:", error);
    }

    // If answer is "no", open irregularity dialog
    if (answer === "no") {
      setIrregularityChecklistItem(item);
      setIrregularityTitle(`Irregularidade: ${item.text}`);
      setIrregularityDescription(`Resposta "Não" durante execução da tarefa "${task.name}" - Item: ${item.text}`);
      
      // Fetch sector name for the destination sector
      if (item.sector_id) {
        supabase.from("op_sectors").select("name").eq("id", item.sector_id).single().then(({ data }) => {
          setIrregularitySectorName(data?.name || null);
        });
      } else {
        setIrregularitySectorName(null);
      }
      
      setIrregularityDialogOpen(true);
    }
  };

  const handleIrregularitySubmit = async () => {
    if (!irregularityChecklistItem || !user?.id) return;
    setSavingIrregularity(true);
    try {
      let photoUrl = "";
      if (irregularityPhotoFile) {
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("irregularity-photos")
          .upload(fileName, irregularityPhotoFile);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage
          .from("irregularity-photos")
          .getPublicUrl(fileName);
        photoUrl = publicUrl;
      }

      const { error } = await supabase.from("op_irregularities").insert([{
        title: irregularityTitle,
        description: irregularityDescription || null,
        photo_url: photoUrl || `https://placehold.co/400x300?text=Irregularidade`,
        sector_id: irregularityChecklistItem.sector_id || null,
        reported_by_user_id: user.id,
        task_execution_id: task?.id || null,
        establishment_id: establishmentId,
      }]);

      if (error) throw error;

      toast({ title: "Irregularidade registrada automaticamente!" });
      setIrregularityDialogOpen(false);
      setIrregularityChecklistItem(null);
      setIrregularityTitle("");
      setIrregularityDescription("");
      setIrregularityPhotoFile(null);
      setIrregularityPhotoPreview(null);
    } catch (error) {
      console.error("Error saving irregularity:", error);
      toast({ title: "Erro ao registrar irregularidade", variant: "destructive" });
    } finally {
      setSavingIrregularity(false);
    }
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const canComplete = () => {
    if (!task) return false;
    if (task.pausedAt) return false; // Can't complete while paused
    const allChecked = task.checklist.every((item) => item.completed);
    const hasPhoto = !task.requiresPhoto || photoFile || task.photoUrl;
    return allChecked && hasPhoto;
  };

  const handleComplete = async () => {
    if (!task || !canComplete()) return;

    // Check if task exceeded estimated time (only if estimated time is defined)
    const timeSpentMinutes = Math.floor(elapsedTime / 60);
    if (task.estimatedTime > 0 && timeSpentMinutes > task.estimatedTime && !delayReason) {
      setDelayDialogOpen(true);
      return;
    }

    await doComplete(delayReason);
  };

  const doComplete = async (reason?: string) => {
    if (!task) return;
    setSaving(true);
    try {
      if (photoFile) {
        const antifraudResult = await validateTaskCompletion({
          photoFile,
          existingPhotoHash: null,
          currentLocation: location,
          expectedLocation: {
            lat: task.expectedLat,
            lng: task.expectedLng,
            radius: task.locationRadius,
          },
          startedAt: task.startedAt ? new Date(task.startedAt) : null,
          minExecutionMinutes: task.minExecutionMinutes,
        });
        if (antifraudResult.isSuspicious) {
          toast({
            title: "⚠️ Atenção",
            description: `Comportamento suspeito: ${antifraudResult.reasons.join(", ")}`,
            variant: "destructive",
          });
        }
      }

      const timeSpent = Math.floor(elapsedTime / 60);
      const isSuspicious = timeSpent < task.minExecutionMinutes;
      const isDelayed = timeSpent > task.estimatedTime && task.estimatedTime > 0;

      const finalObservations = reason
        ? `${observations}\n\n⏰ Motivo do atraso: ${reason}`
        : observations;

      const fieldName = task.photoBeforeUrl ? "photo_after_url" : "photo_completion_url";

      // Handle photo upload (online or queue for offline)
      let photoUrl = task.photoUrl;
      let photoHash: string | null = null;

      if (photoFile && navigator.onLine) {
        photoHash = await calculateImageHash(photoFile);
        const fileName = `${task.id}/${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage.from("task-photos").upload(fileName, photoFile);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from("task-photos").getPublicUrl(fileName);
        photoUrl = publicUrl;
      } else if (photoFile && !navigator.onLine) {
        // Queue photo for later upload
        const base64 = await fileToBase64(photoFile);
        const fileName = `${task.id}/${Date.now()}.jpg`;
        await addToPhotoQueue({
          id: crypto.randomUUID(),
          taskExecutionId: task.id,
          base64Data: base64,
          fileName,
          bucket: "task-photos",
          fieldName,
          createdAt: new Date().toISOString(),
        });
        photoHash = null;
        photoUrl = "pending_upload";
      }

      const updateData: Record<string, any> = {
        status: isDelayed ? "delayed" : "completed",
        completed_at: new Date().toISOString(),
        time_spent_minutes: timeSpent,
        photo_hash: photoHash,
        observations: finalObservations,
        latitude: location?.lat,
        longitude: location?.lng,
        is_suspicious: isSuspicious,
        suspicious_reason: isSuspicious ? `Tempo muito rápido: ${timeSpent}min` : null,
      };

      if (photoUrl && photoUrl !== "pending_upload") {
        updateData[fieldName] = photoUrl;
      }

      if (navigator.onLine) {
        const { error } = await supabase.from("op_task_executions").update(updateData as never).eq("id", task.id);
        if (error) throw error;
      } else {
        await queueAction("task_executions", "update", updateData, "id", task.id);
      }

      toast({
        title: isDelayed ? "Tarefa concluída com atraso" : "Tarefa concluída! ✅",
        description: !navigator.onLine
          ? `Salvo offline. Foto será enviada quando houver sinal.`
          : `Tempo: ${timeSpent} minutos${task.pauseCount > 0 ? ` (${task.pauseCount} pausa(s), ${task.totalPauseMinutes}min pausado)` : ""}`,
      });
      setDelayDialogOpen(false);
      navigate("/operacional/tasks");
    } catch (error) {
      console.error("Error completing task:", error);
      toast({ title: "Erro", description: "Não foi possível concluir a tarefa", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const advanceSubsequentTasks = async () => {
    if (!user?.id) return;
    const today = format(new Date(), "yyyy-MM-dd");

    // Get user's shift to calculate remaining time
    const { data: profile } = await supabase
      .from("op_profiles")
      .select("shift_id, job_function_id")
      .eq("user_id", user.id)
      .single();
    if (!profile?.shift_id) return;

    const { data: shift } = await supabase
      .from("op_shifts")
      .select("end_time, lunch_start, lunch_end")
      .eq("id", profile.shift_id)
      .single();
    if (!shift) return;

    // Calculate remaining minutes
    const now = new Date();
    const [eh, em] = shift.end_time.split(":").map(Number);
    const shiftEndMs = new Date().setHours(eh, em, 0, 0);
    let remainingMinutes = Math.max(0, Math.floor((shiftEndMs - now.getTime()) / 60000));

    if (shift.lunch_start && shift.lunch_end) {
      const [lsh, lsm] = shift.lunch_start.split(":").map(Number);
      const [leh, lem] = shift.lunch_end.split(":").map(Number);
      const lunchStartMs = new Date().setHours(lsh, lsm, 0, 0);
      if (now.getTime() < lunchStartMs) {
        remainingMinutes -= ((leh * 60 + lem) - (lsh * 60 + lsm));
      }
    }
    if (remainingMinutes <= 0) return;

    // Get today's pending tasks time
    const { data: todayTasks } = await supabase
      .from("op_task_executions")
      .select("id, task_template_id, task_templates:op_task_templates(estimated_time_minutes)")
      .eq("scheduled_date", today)
      .in("status", ["pending", "in_progress"])
      .or(`assigned_user_id.eq.${user.id},assigned_user_id.is.null`);

    const pendingMinutes = (todayTasks || []).reduce((sum: number, t: any) => {
      return sum + (t.task_templates?.estimated_time_minutes || 15);
    }, 0);

    const gapMinutes = remainingMinutes - pendingMinutes;
    if (gapMinutes < 15) return;

    // Get today's completed template IDs to avoid advancing already-done tasks
    const { data: completedToday } = await supabase
      .from("op_task_executions")
      .select("task_template_id")
      .eq("scheduled_date", today)
      .in("status", ["completed", "not_done"])
      .or(`assigned_user_id.eq.${user.id},executed_by_user_id.eq.${user.id}`);

    const completedTemplateIds = new Set(
      (completedToday || []).map((t: any) => t.task_template_id)
    );

    // Find future tasks for this user (only pending, not yet executed today)
    const { data: futureTasks } = await supabase
      .from("op_task_executions")
      .select("id, task_template_id, scheduled_date, task_templates:op_task_templates(estimated_time_minutes, name)")
      .eq("assigned_user_id", user.id)
      .eq("status", "pending")
      .gt("scheduled_date", today)
      .order("scheduled_date", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(50);

    // Filter out tasks whose template was already done today
    const eligibleTasks = (futureTasks || []).filter(
      (ft: any) => !completedTemplateIds.has(ft.task_template_id)
    );

    if (eligibleTasks.length === 0) {
      // No future tasks available — show "go to HR" dialog
      setShowNoTasksDialog(true);
      return;
    }

    // Advance tasks until gap is filled
    let filledMinutes = 0;
    let advancedCount = 0;

    for (const ft of eligibleTasks) {
      const taskTime = (ft.task_templates as any)?.estimated_time_minutes || 15;
      if (filledMinutes + taskTime > gapMinutes) continue;

      const { error } = await supabase
        .from("op_task_executions")
        .update({
          scheduled_date: today,
          carried_over: true,
          observations: `Adiantada de ${ft.scheduled_date} para preencher jornada`,
        })
        .eq("id", ft.id);

      if (!error) {
        filledMinutes += taskTime;
        advancedCount++;
      }
      if (filledMinutes >= gapMinutes) break;
    }

    if (advancedCount > 0) {
      toast({
        title: `${advancedCount} tarefa(s) adiantada(s)`,
        description: "Tarefas subsequentes foram trazidas para preencher sua jornada.",
      });
    } else {
      // Gap exists but no eligible task fits — show dialog
      setShowNoTasksDialog(true);
    }
  };

  const handleNotDone = async () => {
    if (!task || (!notDoneReason.trim() && !notDoneAudioBlob)) {
      toast({
        title: "Justificativa obrigatória",
        description: "Informe o motivo ou grave um áudio",
        variant: "destructive",
      });
      return;
    }

    setSavingNotDone(true);
    try {
      // Upload audio if exists
      let audioUrl: string | null = null;
      if (notDoneAudioBlob) {
        const fileName = `not-done-audio/${task.id}-${Date.now()}.webm`;
        const { error: uploadError } = await supabase.storage
          .from("task-photos")
          .upload(fileName, notDoneAudioBlob, { contentType: "audio/webm" });
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from("task-photos").getPublicUrl(fileName);
          audioUrl = urlData.publicUrl;
        }
      }

      const fullReason = audioUrl 
        ? `${notDoneReason}\n[Áudio: ${audioUrl}]` 
        : notDoneReason;

      const { error: updateError } = await supabase
        .from("op_task_executions")
        .update({
          status: "not_done",
          observations: fullReason,
          completed_at: new Date().toISOString(),
        })
        .eq("id", task.id);

      if (updateError) throw updateError;

      // Auto-reschedule to next day
      const { data: currentTask, error: fetchError } = await supabase
        .from("op_task_executions")
        .select("task_template_id, photo_before_url, establishment_id")
        .eq("id", task.id)
        .single();

      if (!fetchError && currentTask?.task_template_id) {
        const nextDay = format(addDays(new Date(), 1), "yyyy-MM-dd");
        await supabase
          .from("op_task_executions")
          .insert([{
            task_template_id: currentTask.task_template_id,
            scheduled_date: nextDay,
            assigned_user_id: user?.id,
            establishment_id: currentTask.establishment_id,
            status: "pending",
            observations: `Reagendada automaticamente de ${format(new Date(), "dd/MM/yyyy")} - Motivo: ${notDoneReason}`,
          }]);
      }

      toast({
        title: "Tarefa não realizada",
        description: "Reagendada automaticamente para amanhã",
      });

      // Advance subsequent tasks
      try {
        await advanceSubsequentTasks();
      } catch (advErr) {
        console.error("Error advancing tasks:", advErr);
      }

      // Cleanup audio
      if (notDoneAudioUrl) URL.revokeObjectURL(notDoneAudioUrl);
      setNotDoneAudioBlob(null);
      setNotDoneAudioUrl(null);
      setNotDoneReason("");
      setNotDoneDialogOpen(false);
      navigate("/operacional/tasks");
    } catch (error) {
      console.error("Error marking task as not done:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a tarefa",
        variant: "destructive",
      });
    } finally {
      setSavingNotDone(false);
    }
  };

  const getNextDaysOptions = () => {
    const options = [];
    for (let i = 1; i <= 7; i++) {
      const date = addDays(new Date(), i);
      options.push({
        value: format(date, "yyyy-MM-dd"),
        label: format(date, "EEEE, dd/MM", { locale: ptBR }).replace(/^\w/, c => c.toUpperCase()),
      });
    }
    return options;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin h-10 w-10 border-3 border-primary border-t-transparent rounded-full" />
        </div>
      </AppLayout>
    );
  }

  // Weather check screen before showing task
  if (showWeatherCheck) {
    return (
      <>
        <AppLayout>
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="animate-spin h-10 w-10 border-3 border-primary border-t-transparent rounded-full" />
          </div>
        </AppLayout>
        <WeatherCheckDialog
          open={true}
          onConfirm={() => {
            refreshWeather();
            setShowWeatherCheck(false);
            // Show tool check next if task has a template
            if (taskTemplateId) {
              setShowToolCheck(true);
            }
          }}
          onCancel={() => navigate("/operacional/tasks")}
        />
      </>
    );
  }

  // Tool check screen after weather check
  if (showToolCheck && taskTemplateId) {
    return (
      <>
        <AppLayout>
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center space-y-3">
              <Wrench className="h-10 w-10 text-primary mx-auto" />
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Verificando ferramentas...</p>
            </div>
          </div>
        </AppLayout>
        <ToolCheckDialog
          open={true}
          taskTemplateId={taskTemplateId}
          onAllConfirmed={() => setShowToolCheck(false)}
          onSkip={async (reason) => {
            // Mark task as not_done in the database
            if (task?.id || id) {
              const taskId = task?.id || id;
              await supabase
                .from("op_task_executions")
                .update({
                  status: "not_done",
                  observations: reason,
                  completed_at: new Date().toISOString(),
                })
                .eq("id", taskId);

              // Try to advance subsequent tasks
              try {
                await advanceSubsequentTasks();
              } catch (err) {
                console.error("Error advancing tasks:", err);
              }
            }
            toast({
              title: "Tarefa pulada",
              description: reason,
              variant: "destructive",
            });
            navigate("/operacional/tasks");
          }}
        />
      </>
    );
  }

  if (!task) {
    return (
      <AppLayout>
        <div className="text-center py-16">
          <p className="text-lg text-muted-foreground">Tarefa não encontrada</p>
          <Button onClick={() => navigate("/operacional/tasks")} className="mt-4">
            Voltar
          </Button>
        </div>
      </AppLayout>
    );
  }

  const completedCount = task.checklist.filter((i) => i.completed).length;
  const progress = task.checklist.length > 0 
    ? Math.round((completedCount / task.checklist.length) * 100)
    : 0;

  const isPaused = !!task.pausedAt;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto pb-32 px-3 sm:px-4 lg:px-0">
        {/* Paused banner */}
        {isPaused && (
          <div className="mb-4 bg-warning/10 border-2 border-warning/50 rounded-2xl p-4 sm:p-5 animate-pulse">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="h-12 w-12 rounded-full bg-warning/20 flex items-center justify-center shrink-0">
                <Pause className="h-6 w-6 text-warning" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-warning text-base sm:text-lg">TAREFA PAUSADA</p>
                <p className="text-sm text-muted-foreground truncate">
                  Motivo: {task.pauseReason || "Não informado"}
                </p>
              </div>
              <Button
                onClick={handleResume}
                disabled={savingPause}
                size="lg"
                className="gap-2 bg-success hover:bg-success/90 text-success-foreground rounded-xl shrink-0 h-12 px-5"
              >
                {savingPause ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-5 w-5" />}
                <span className="hidden sm:inline">Retomar</span>
              </Button>
            </div>
          </div>
        )}

        {/* Header + Timer — side by side on lg */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-4">
          {/* Task header — 3 cols on lg */}
          <div className="lg:col-span-3 bg-card rounded-2xl border border-border p-5 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <div
                className="h-3.5 w-3.5 rounded-full ring-2 ring-offset-2 ring-offset-card"
                style={{ backgroundColor: task.sectorColor, boxShadow: `0 0 8px ${task.sectorColor}40` }}
              />
              <span className="text-sm font-medium text-muted-foreground">{task.sector}</span>
              {task.isOutdoor && (
                <Badge variant="outline" className="gap-1 text-xs border-blue-500/50 text-blue-500 bg-blue-500/5">
                  <CloudRain className="h-3 w-3" />
                  Outdoor
                </Badge>
              )}
              {task.requiredWorkers > 1 && (
                <Badge variant="outline" className="gap-1 ml-auto text-xs bg-primary/5">
                  <Users className="h-3 w-3" />
                  {task.requiredWorkers} pessoas
                </Badge>
              )}
            </div>
            <div className="flex items-start gap-2">
              <h1 className="text-xl sm:text-xl sm:text-2xl md:text-[26px] font-semibold tracking-tight text-foreground leading-tight flex-1">{task.name}</h1>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 mt-1"
                onClick={() => {
                  if (isSpeaking) {
                    window.speechSynthesis.cancel();
                    setIsSpeaking(false);
                    return;
                  }
                  const text = `${task.name}. ${task.description || ''}`;
                  const utterance = new SpeechSynthesisUtterance(text);
                  utterance.lang = 'pt-BR';
                  utterance.rate = 0.9;
                  utterance.onend = () => setIsSpeaking(false);
                  utterance.onerror = () => setIsSpeaking(false);
                  setIsSpeaking(true);
                  window.speechSynthesis.speak(utterance);
                }}
                title={isSpeaking ? "Parar leitura" : "Ouvir tarefa"}
              >
                {isSpeaking ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </Button>
            </div>
            {task.description && (
              <p className="text-muted-foreground mt-2 text-sm sm:text-base leading-relaxed">{task.description}</p>
            )}
            {task.teamMembers.length > 0 && (
              <div className="mt-4 p-3 sm:p-4 rounded-xl bg-primary/5 border border-primary/20">
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">👥 Equipe</p>
                <div className="flex flex-wrap gap-2">
                  {task.teamMembers.map((member, idx) => (
                    <span
                      key={idx}
                      className={cn(
                        "text-xs sm:text-sm px-3 py-1.5 rounded-full font-medium",
                        member.isCurrentUser
                          ? "bg-primary/20 text-primary ring-1 ring-primary/30"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {member.name}{member.isCurrentUser ? " (você)" : ""}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {task.pauseCount > 0 && (
              <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                <Pause className="h-3 w-3 shrink-0" />
                <span>{task.pauseCount} pausa(s)</span>
                <span className="text-muted-foreground/50">•</span>
                <span>{task.totalPauseMinutes} min pausado</span>
              </div>
            )}
          </div>

          {/* Timer — 2 cols on lg */}
          <div className={cn(
            "lg:col-span-2 bg-card rounded-2xl border p-5 sm:p-6 shadow-sm flex flex-col items-center justify-center",
            isPaused ? "border-warning/50 bg-warning/5" : "border-border"
          )}>
            <div className="flex items-center gap-2 text-muted-foreground mb-3">
              <Clock className="h-4 w-4" />
              <span className="text-xs sm:text-sm font-medium uppercase tracking-wide">
                {isPaused ? "Pausado" : "Execução"}
              </span>
            </div>
            <p className={cn(
              "text-5xl sm:text-6xl lg:text-7xl font-bold font-mono tabular-nums tracking-tight",
              isPaused
                ? "text-warning"
                : task.status === "in_progress" && elapsedTime > task.estimatedTime * 60
                  ? "text-critical"
                  : "text-foreground"
            )}>{formatTime(elapsedTime)}</p>
            
            {task.status === "in_progress" && task.startedAt && !isPaused && (
              <div className="mt-3 text-center space-y-1.5 w-full">
                {task.estimatedTime > 0 ? (
                  <>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Estimado: <strong>{task.estimatedTime} min</strong>
                    </p>
                    <div className={cn(
                      "text-sm sm:text-base font-bold px-4 py-2 rounded-xl",
                      elapsedTime > task.estimatedTime * 60
                        ? "text-critical bg-critical/10"
                        : "text-success bg-success/10"
                    )}>
                      {elapsedTime > task.estimatedTime * 60
                        ? `⚠️ ATRASADO ${Math.floor((elapsedTime - task.estimatedTime * 60) / 60)} min`
                        : `Até ${format(new Date(new Date(task.startedAt).getTime() + (task.estimatedTime + (task.totalPauseMinutes || 0)) * 60000), "HH:mm")}`
                      }
                    </div>
                  </>
                ) : (
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    ⏱️ Tempo livre — finalize quando concluir
                  </p>
                )}
                {task.totalPauseMinutes > 0 && (
                  <div className="mt-2 p-2.5 rounded-lg bg-warning/10 border border-warning/30 text-left">
                    <p className="text-xs font-semibold text-warning flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      +{task.totalPauseMinutes} min ({task.pauseCount} pausa)
                    </p>
                  </div>
                )}
              </div>
            )}

            {task.status === "in_progress" && isPaused && task.totalPauseMinutes > 0 && (
              <div className="mt-3 p-2.5 rounded-lg bg-warning/10 border border-warning/30 text-left w-full">
                <p className="text-xs font-semibold text-warning flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  -{task.totalPauseMinutes} min por pausas
                </p>
              </div>
            )}

            {task.status === "pending" && (
              <div className="mt-4 w-full space-y-3">
                <p className="text-sm text-muted-foreground text-center">
                  {task.estimatedTime > 0 
                    ? <>Estimado: <strong>{task.estimatedTime} min</strong></>
                    : <>⏱️ Tempo livre</>
                  }
                </p>
                <Button 
                  size="lg" 
                  onClick={handleStart} 
                  className="gap-3 rounded-xl h-14 sm:h-16 text-base sm:text-lg font-bold w-full bg-success hover:bg-success/90 text-success-foreground shadow-lg shadow-success/20 transition-all active:scale-[0.98]"
                >
                  <Play className="h-6 w-6" />
                  INICIAR TAREFA
                </Button>
              </div>
            )}

            {task.status === "in_progress" && !isPaused && (
              <div className="flex items-center gap-2 mt-4 text-primary">
                <div className="h-3 w-3 rounded-full bg-primary animate-pulse" />
                <span className="font-medium text-sm">Em execução</span>
              </div>
            )}

            {task.status === "completed" && (
              <div className="flex items-center justify-center gap-2 mt-4 text-success bg-success/10 px-4 py-2 rounded-xl">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-semibold">Concluída</span>
              </div>
            )}
          </div>
        </div>

        {/* Location Photos */}
        {task.locationPhotos && task.locationPhotos.length > 0 && (
          <div className="mb-4">
            <LocationPhotosViewer 
              photos={task.locationPhotos} 
              title="Local do Serviço"
            />
          </div>
        )}

        {/* Progress + Checklist + Photo — 2 column grid on lg */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left column: Progress + Checklist */}
          <div className="space-y-4">
            {/* Progress */}
            <div className="bg-card rounded-2xl border border-border p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-foreground text-sm sm:text-base">Progresso</span>
                <span className={cn(
                  "text-2xl sm:text-3xl font-bold tabular-nums",
                  progress === 100 ? "text-success" : "text-foreground"
                )}>{progress}%</span>
              </div>
              <div className="h-3 sm:h-4 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    progress === 100 ? "bg-success" : "bg-primary"
                  )}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                {completedCount} de {task.checklist.length} itens
              </p>
            </div>

            {/* Checklist */}
            {task.checklist.length > 0 && (
              <div className="bg-card rounded-2xl border border-border p-5 sm:p-6 shadow-sm">
                <h3 className="font-semibold text-foreground mb-4 text-sm sm:text-base">Checklist</h3>
                <div className="space-y-2.5">
                  {task.checklist.map((item) => {
                    const isYesNo = item.type === "yes_no";
                    
                    if (isYesNo) {
                      return (
                        <div
                          key={item.id}
                          className={cn(
                            "p-3 sm:p-4 rounded-xl border transition-all",
                            item.completed
                              ? item.answer === "no"
                                ? "bg-critical/5 border-critical/30"
                                : "bg-success/5 border-success/30"
                              : "bg-muted/30 border-border"
                          )}
                        >
                          <p className={cn(
                            "text-sm sm:text-base font-medium mb-3",
                            item.completed && item.answer === "yes" && "text-muted-foreground"
                          )}>
                            ❓ {item.text}
                          </p>
                          <div className="flex items-center gap-3">
                            <Button
                              size="sm"
                              variant={item.answer === "yes" ? "default" : "outline"}
                              disabled={task.status === "pending" || task.status === "completed" || isPaused}
                              onClick={() => handleYesNoAnswer(item.id, "yes")}
                              className={cn(
                                "flex-1 h-10 rounded-lg gap-2 font-semibold",
                                item.answer === "yes" && "bg-success hover:bg-success/90 text-success-foreground"
                              )}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              Sim
                            </Button>
                            <Button
                              size="sm"
                              variant={item.answer === "no" ? "default" : "outline"}
                              disabled={task.status === "pending" || task.status === "completed" || isPaused}
                              onClick={() => handleYesNoAnswer(item.id, "no")}
                              className={cn(
                                "flex-1 h-10 rounded-lg gap-2 font-semibold",
                                item.answer === "no" && "bg-critical hover:bg-critical/90 text-critical-foreground"
                              )}
                            >
                              <XCircle className="h-4 w-4" />
                              Não
                            </Button>
                          </div>
                          {item.answer === "no" && (
                            <p className="text-xs text-critical mt-2 flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Irregularidade registrada
                            </p>
                          )}
                        </div>
                      );
                    }
                    
                    return (
                      <label
                        key={item.id}
                        className={cn(
                          "flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border transition-all cursor-pointer active:scale-[0.99]",
                          item.completed
                            ? "bg-success/5 border-success/30"
                            : "bg-muted/30 border-border hover:border-primary/30 hover:bg-muted/50"
                        )}
                      >
                        <Checkbox
                          checked={item.completed}
                          onCheckedChange={(checked) =>
                            handleChecklistChange(item.id, checked as boolean)
                          }
                          disabled={task.status === "pending" || task.status === "completed" || isPaused}
                          className="h-6 w-6 sm:h-7 sm:w-7 rounded-lg shrink-0"
                        />
                        <span className={cn(
                          "flex-1 text-sm sm:text-base",
                          item.completed
                            ? "line-through text-muted-foreground"
                            : "text-foreground"
                        )}>
                          {item.text}
                        </span>
                        {item.completed && (
                          <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right column: Photo + Observations */}
          <div className="space-y-4">
            {/* Before photo comparison */}
            {task.photoBeforeUrl && (
              <div className="bg-card rounded-2xl border border-border p-5 sm:p-6 shadow-sm">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2 text-sm sm:text-base">
                  <Camera className="h-5 w-5 text-primary" />
                  Foto ANTES
                </h3>
                <img
                  src={task.photoBeforeUrl}
                  alt="Antes"
                  className="w-full rounded-xl border border-border"
                />
              </div>
            )}

            {/* Photo capture */}
            {task.requiresPhoto && (
              <div className="bg-card rounded-2xl border border-border p-5 sm:p-6 shadow-sm">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2 text-sm sm:text-base">
                  <Camera className="h-5 w-5 text-primary" />
                  {task.photoBeforeUrl ? "Foto DEPOIS" : "Foto de Comprovação"}
                  <span className="text-xs text-critical ml-auto font-normal bg-critical/10 px-2 py-0.5 rounded-full">Obrigatória</span>
                </h3>
                
                {photoPreview ? (
                  <div className="relative group">
                    <img
                      src={photoPreview}
                      alt="Comprovação"
                      className={cn(
                        "w-full rounded-xl",
                        task.photoBeforeUrl && "border-2 border-success/20"
                      )}
                    />
                    {task.status !== "completed" && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="absolute bottom-3 right-3 rounded-lg shadow-lg opacity-80 group-hover:opacity-100 transition-opacity"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Trocar
                      </Button>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={task.status === "pending" || isPaused}
                    className={cn(
                      "w-full h-36 sm:h-44 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all",
                      task.status === "pending" || isPaused
                        ? "border-muted text-muted-foreground cursor-not-allowed opacity-50"
                        : task.photoBeforeUrl
                          ? "border-success/50 text-success hover:bg-success/5 cursor-pointer active:scale-[0.98]"
                          : "border-primary/50 text-primary hover:bg-primary/5 cursor-pointer active:scale-[0.98]"
                    )}
                  >
                    <Camera className="h-8 w-8 sm:h-10 sm:w-10" />
                    <span className="font-semibold text-sm sm:text-base">
                      {task.photoBeforeUrl ? "Tirar foto DEPOIS" : "Tirar foto"}
                    </span>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handlePhotoCapture}
                />
              </div>
            )}

            {/* Observations */}
            <div className="bg-card rounded-2xl border border-border p-5 sm:p-6 shadow-sm">
              <h3 className="font-semibold text-foreground mb-3 text-sm sm:text-base">Observações</h3>
              <Textarea
                placeholder="Adicione observações..."
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                rows={3}
                disabled={task.status === "completed"}
                className="rounded-xl border-border bg-background text-sm sm:text-base resize-none"
              />
            </div>
          </div>
        </div>

        {/* Not done for pending tasks */}
        {task.status === "pending" && (
          <div className="mt-4 bg-card rounded-2xl border border-border p-5 sm:p-6 shadow-sm">
            <Button
              variant="outline"
              onClick={() => setNotDoneDialogOpen(true)}
              className="w-full gap-2 h-12 rounded-xl border-critical/50 text-critical hover:bg-critical/10 text-sm sm:text-base"
            >
              <XCircle className="h-5 w-5" />
              Não foi possível realizar
            </Button>
          </div>
        )}

        {/* Action buttons — fixed bottom bar */}
        {task.status === "in_progress" && (
          <div className="fixed bottom-0 left-0 right-0 z-50 p-3 sm:p-4 bg-background/95 backdrop-blur-md border-t border-border shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.1)] lg:left-72">
            <div className="max-w-4xl mx-auto space-y-2.5">
              {!isPaused ? (
                <>
                  <div className="flex gap-2.5 sm:gap-3">
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => setPauseDialogOpen(true)}
                      disabled={saving}
                      className="h-12 sm:h-14 rounded-xl gap-2 border-warning/50 text-warning hover:bg-warning/10 px-4 sm:px-6 shrink-0"
                    >
                      <Pause className="h-5 w-5" />
                      <span className="hidden sm:inline">Pausar</span>
                    </Button>

                    <Button
                      size="lg"
                      onClick={handleComplete}
                      disabled={!canComplete() || saving}
                      className={cn(
                        "flex-1 h-12 sm:h-14 rounded-xl gap-2 text-base sm:text-lg font-bold transition-all active:scale-[0.98]",
                        canComplete()
                          ? "bg-success hover:bg-success/90 text-success-foreground shadow-lg shadow-success/20"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span className="hidden sm:inline">Salvando...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-5 w-5" />
                          Finalizar
                        </>
                      )}
                    </Button>
                  </div>
                  
                  <Button
                    variant="ghost"
                    onClick={() => setNotDoneDialogOpen(true)}
                    disabled={saving}
                    className="w-full h-10 sm:h-11 rounded-xl gap-2 text-critical hover:bg-critical/10 text-xs sm:text-sm"
                  >
                    <XCircle className="h-4 w-4" />
                    Não foi possível realizar
                  </Button>
                  
                  {!canComplete() && (
                    <p className="text-center text-xs text-muted-foreground pb-1">
                      Complete todos os itens
                      {task.requiresPhoto && !photoPreview && " e tire a foto"}
                    </p>
                  )}
                </>
              ) : (
                <Button
                  size="lg"
                  onClick={handleResume}
                  disabled={savingPause}
                  className="w-full h-14 sm:h-16 rounded-xl gap-2 text-lg font-bold bg-success hover:bg-success/90 text-success-foreground shadow-lg shadow-success/20 active:scale-[0.98]"
                >
                  {savingPause ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-6 w-6" />}
                  RETOMAR TAREFA
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Pause Justification Dialog */}
      <Dialog open={pauseDialogOpen} onOpenChange={setPauseDialogOpen}>
        <DialogContent className="max-w-md mx-3">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Pause className="h-6 w-6 text-warning" />
              Pausar Tarefa
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">
              Selecione o motivo da pausa. O tempo pausado será registrado separadamente.
            </p>
            <div className="space-y-2">
              <Label className="text-base font-semibold">Motivo da pausa *</Label>
              <Select value={pauseReason} onValueChange={setPauseReason}>
                <SelectTrigger className="h-12 text-base rounded-xl">
                  <SelectValue placeholder="Selecione o motivo" />
                </SelectTrigger>
                <SelectContent>
                  {PAUSE_REASONS.map((reason) => (
                    <SelectItem key={reason} value={reason}>{reason}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {pauseReason === "Outro motivo" && (
              <div className="space-y-2">
                <Label>Descreva o motivo</Label>
                <Textarea
                  value={pauseReasonDetail}
                  onChange={(e) => setPauseReasonDetail(e.target.value)}
                  placeholder="Descreva o motivo da pausa..."
                  rows={2}
                  className="rounded-xl"
                />
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={() => { setPauseDialogOpen(false); setPauseReason(""); }}>
                Cancelar
              </Button>
              <Button
                onClick={() => handlePause(pauseReason)}
                disabled={!pauseReason.trim() || (pauseReason === "Outro motivo" && !pauseReasonDetail.trim()) || savingPause}
                className="flex-1 h-12 bg-warning hover:bg-warning/90 text-warning-foreground text-base font-bold rounded-xl"
              >
                {savingPause ? <Loader2 className="h-5 w-5 animate-spin" /> : "PAUSAR"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Weather Interruption Dialog */}
      <Dialog open={weatherInterruptionOpen} onOpenChange={() => {}}>
        <DialogContent className="max-w-md mx-3" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <CloudRain className="h-6 w-6 text-blue-500" />
              ⚠️ Chuva Detectada!
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-5 text-center">
              <CloudRain className="h-14 w-14 text-blue-500 mx-auto mb-3" />
              <p className="font-bold text-foreground text-base">Esta é uma tarefa outdoor</p>
              <p className="text-sm text-muted-foreground mt-1">
                A condição climática mudou para chuva. A tarefa precisa ser pausada.
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Seu progresso e tempo de execução foram preservados. Quando a chuva parar, você poderá retomar.
            </p>
            <Button
              onClick={handleWeatherPause}
              disabled={savingPause}
              className="w-full h-14 rounded-xl gap-2 text-lg font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
            >
              {savingPause ? <Loader2 className="h-5 w-5 animate-spin" /> : <Pause className="h-5 w-5" />}
              PAUSAR POR CHUVA
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Not Done Dialog */}
      <Dialog open={notDoneDialogOpen} onOpenChange={(open) => {
        setNotDoneDialogOpen(open);
        if (!open) {
          setNotDoneReason("");
          if (notDoneAudioUrl) URL.revokeObjectURL(notDoneAudioUrl);
          setNotDoneAudioBlob(null);
          setNotDoneAudioUrl(null);
          if (isRecordingNotDone && notDoneRecorderRef.current) {
            notDoneRecorderRef.current.stop();
            setIsRecordingNotDone(false);
          }
        }
      }}>
        <DialogContent className="max-w-md mx-3">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-critical" />
              Tarefa Não Realizada
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Motivo da não realização *</Label>
              <Textarea
                value={notDoneReason}
                onChange={(e) => setNotDoneReason(e.target.value)}
                placeholder="Descreva o motivo pelo qual a tarefa não foi realizada..."
                rows={3}
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mic className="h-4 w-4" />
                Ou grave um áudio
              </Label>
              <div className="flex items-center gap-3">
                {!isRecordingNotDone && !notDoneAudioUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2 rounded-xl h-12 flex-1"
                    onClick={async () => {
                      try {
                        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                        const recorder = new MediaRecorder(stream);
                        const chunks: BlobPart[] = [];
                        recorder.ondataavailable = (e) => chunks.push(e.data);
                        recorder.onstop = () => {
                          stream.getTracks().forEach(t => t.stop());
                          const blob = new Blob(chunks, { type: "audio/webm" });
                          setNotDoneAudioBlob(blob);
                          setNotDoneAudioUrl(URL.createObjectURL(blob));
                        };
                        notDoneRecorderRef.current = recorder;
                        recorder.start();
                        setIsRecordingNotDone(true);
                      } catch {
                        toast({ title: "Erro", description: "Permissão de microfone negada", variant: "destructive" });
                      }
                    }}
                  >
                    <Mic className="h-5 w-5" />
                    Gravar áudio
                  </Button>
                )}
                {isRecordingNotDone && (
                  <Button
                    type="button"
                    variant="destructive"
                    className="gap-2 rounded-xl h-12 flex-1 animate-pulse"
                    onClick={() => {
                      notDoneRecorderRef.current?.stop();
                      setIsRecordingNotDone(false);
                    }}
                  >
                    <Square className="h-4 w-4" />
                    Parar gravação
                  </Button>
                )}
                {notDoneAudioUrl && !isRecordingNotDone && (
                  <div className="flex items-center gap-2 flex-1">
                    <audio src={notDoneAudioUrl} controls className="flex-1 h-10" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        URL.revokeObjectURL(notDoneAudioUrl);
                        setNotDoneAudioBlob(null);
                        setNotDoneAudioUrl(null);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-critical" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              A tarefa será reagendada automaticamente para o próximo dia útil.
            </p>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1 h-12 rounded-xl"
                onClick={() => setNotDoneDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleNotDone}
                disabled={(!notDoneReason.trim() && !notDoneAudioBlob) || savingNotDone}
                className="flex-1 h-12 rounded-xl bg-critical hover:bg-critical/90 font-bold"
              >
                {savingNotDone ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Confirmar"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delay Reason Dialog */}
      <Dialog open={delayDialogOpen} onOpenChange={setDelayDialogOpen}>
        <DialogContent className="max-w-md mx-3">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-6 w-6 text-warning" />
              Tarefa com Atraso
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="bg-warning/10 border border-warning/30 rounded-xl p-5 text-center">
              <p className="text-3xl font-bold text-warning">
                +{Math.floor((elapsedTime - (task?.estimatedTime || 0) * 60) / 60)} min
              </p>
              <p className="text-sm text-muted-foreground mt-1">além do tempo estimado</p>
            </div>

            <div className="space-y-2">
              <Label className="text-base font-semibold">Por que demorou mais?</Label>
              <Select value={delayReason} onValueChange={setDelayReason}>
                <SelectTrigger className="h-12 text-base rounded-xl">
                  <SelectValue placeholder="Selecione o motivo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Local muito sujo">Local muito sujo</SelectItem>
                  <SelectItem value="Falta de material">Falta de material</SelectItem>
                  <SelectItem value="Problema no equipamento">Problema no equipamento</SelectItem>
                  <SelectItem value="Área muito grande">Área muito grande</SelectItem>
                  <SelectItem value="Interrupção por terceiros">Interrupção por terceiros</SelectItem>
                  <SelectItem value="Dificuldade de acesso">Dificuldade de acesso</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Textarea
              placeholder="Descreva com mais detalhes (opcional)..."
              value={delayReason.startsWith("Outro:") ? delayReason.replace("Outro:", "").trim() : ""}
              onChange={(e) => {
                if (delayReason && !["Local muito sujo","Falta de material","Problema no equipamento","Área muito grande","Interrupção por terceiros","Dificuldade de acesso"].includes(delayReason)) {
                  setDelayReason(e.target.value);
                }
              }}
              rows={2}
              className="text-base rounded-xl"
            />

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={() => setDelayDialogOpen(false)}>
                Voltar
              </Button>
              <Button
                onClick={() => doComplete(delayReason)}
                disabled={!delayReason.trim() || saving}
                className="flex-1 h-12 bg-success hover:bg-success/90 text-success-foreground text-base font-bold rounded-xl"
              >
                {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : "Finalizar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* No Tasks Available Dialog */}
      <Dialog open={showNoTasksDialog} onOpenChange={setShowNoTasksDialog}>
        <DialogContent className="max-w-md mx-3">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-6 w-6 text-warning" />
              Sem Tarefas Disponíveis
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="bg-muted/50 border border-border rounded-xl p-5 text-center space-y-2">
              <p className="text-base font-medium text-foreground">
                Não existem tarefas subsequentes para adiantar.
              </p>
              <p className="text-sm text-muted-foreground">
                Todas as tarefas futuras já foram executadas ou não são elegíveis para adiantamento.
              </p>
            </div>
            <div className="bg-primary/10 border border-primary/30 rounded-xl p-4">
              <p className="text-sm font-semibold text-primary mb-1">O que fazer?</p>
              <p className="text-sm text-muted-foreground">
                Dirija-se ao <strong>Departamento Pessoal</strong> para ser informado sobre o que fazer no restante da jornada.
              </p>
            </div>
            <Button
              onClick={() => {
                setShowNoTasksDialog(false);
                navigate("/operacional/tasks");
              }}
              className="w-full h-12 rounded-xl text-base font-bold"
            >
              Entendido - Ir ao Departamento Pessoal
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Irregularity from Yes/No Dialog */}
      <Dialog open={irregularityDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIrregularityDialogOpen(false);
          setIrregularityChecklistItem(null);
        }
      }}>
        <DialogContent className="max-w-md mx-3">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-6 w-6 text-critical" />
              Registrar Irregularidade
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="bg-critical/10 border border-critical/30 rounded-xl p-4">
              <p className="text-sm font-medium text-critical">
                Resposta "Não" detectada no checklist
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Item: {irregularityChecklistItem?.text}
              </p>
              {irregularitySectorName && (
                <p className="text-xs font-semibold text-primary mt-2 flex items-center gap-1">
                  📍 Destino: Setor {irregularitySectorName}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Título da Irregularidade</Label>
              <Input
                value={irregularityTitle}
                onChange={(e) => setIrregularityTitle(e.target.value)}
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição <span className="text-critical">*</span></Label>
              <Textarea
                value={irregularityDescription}
                onChange={(e) => setIrregularityDescription(e.target.value)}
                rows={2}
                className="rounded-xl"
                placeholder="Descreva o problema encontrado..."
              />
            </div>

            <div className="space-y-2">
              <Label>Foto <span className="text-critical">*</span></Label>
              <input
                ref={irregularityFileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setIrregularityPhotoFile(file);
                    const reader = new FileReader();
                    reader.onload = () => setIrregularityPhotoPreview(reader.result as string);
                    reader.readAsDataURL(file);
                  }
                }}
              />
              {irregularityPhotoPreview ? (
                <div className="relative">
                  <img src={irregularityPhotoPreview} alt="Preview" className="w-full h-32 object-cover rounded-xl" />
                  <Button variant="secondary" size="sm" className="absolute bottom-2 right-2 rounded-lg"
                    onClick={() => irregularityFileRef.current?.click()}>
                    Trocar
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => irregularityFileRef.current?.click()}
                  className="w-full h-24 rounded-xl border-2 border-dashed border-primary/50 flex flex-col items-center justify-center gap-1 text-primary hover:bg-primary/5 transition-colors"
                >
                  <Camera className="h-6 w-6" />
                  <span className="text-xs font-medium">Tirar foto</span>
                </button>
              )}
            </div>

            {!irregularityDescription.trim() && !irregularityPhotoFile && (
              <p className="text-xs text-critical flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Informe uma descrição ou tire uma foto para continuar
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={() => setIrregularityDialogOpen(false)}>
                Pular
              </Button>
              <Button
                onClick={handleIrregularitySubmit}
                disabled={!irregularityTitle.trim() || (!irregularityDescription.trim() && !irregularityPhotoFile) || savingIrregularity}
                className="flex-1 h-12 rounded-xl bg-critical hover:bg-critical/90 text-critical-foreground font-bold"
              >
                {savingIrregularity ? <Loader2 className="h-5 w-5 animate-spin" /> : "Registrar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
