import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/operacional-hub/useAuth";
import { useEstablishment } from "@/hooks/operacional-hub/useEstablishment";
import {
  Users,
  Loader2,
  AlertTriangle,
  Search,
  Info,
} from "lucide-react";

interface Irregularity {
  id: string;
  title: string;
  description: string | null;
  photo_url: string;
  sector: { id: string; name: string; color: string } | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  irregularity: Irregularity;
  onDispatched: () => void;
}

interface ProfileData {
  user_id: string;
  full_name: string;
  shift_id: string | null;
  job_function_id: string | null;
  is_on_vacation: boolean;
}

type Priority = "baixa" | "media" | "alta" | "critica";

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; priorityValue: number; priorityOrder: number }> = {
  baixa: { label: "Baixa", color: "bg-muted text-muted-foreground", priorityValue: 2, priorityOrder: 1 },
  media: { label: "Média", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400", priorityValue: 5, priorityOrder: 3 },
  alta: { label: "Alta", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400", priorityValue: 8, priorityOrder: 7 },
  critica: { label: "Crítica", color: "bg-destructive/10 text-destructive", priorityValue: 10, priorityOrder: 10 },
};

export function IrregularityDispatchDialog({ open, onOpenChange, irregularity, onDispatched }: Props) {
  const [taskName, setTaskName] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | null>(30);
  const [isUndefinedTime, setIsUndefinedTime] = useState(false);
  const [priority, setPriority] = useState<Priority>("alta");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Data
  const [profiles, setProfiles] = useState<ProfileData[]>([]);
  const [jobFunctions, setJobFunctions] = useState<any[]>([]);
  const [sectors, setSectors] = useState<{ id: string; name: string; color: string | null }[]>([]);
  const [filterSectorId, setFilterSectorId] = useState<string>("");

  // Selected workers
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  const { toast } = useToast();
  const { user } = useAuth();
  const { establishmentId } = useEstablishment();

  useEffect(() => {
    if (open && irregularity) {
      setTaskName(`Correção: ${irregularity.title}`);
      setSelectedUserIds([]);
      setEstimatedMinutes(30);
      setIsUndefinedTime(false);
      setPriority("alta");
      setSearchTerm("");
      setFilterSectorId("");
      fetchData();
    }
  }, [open, irregularity]);

  const fetchData = async () => {
    setLoading(true);
    const [profilesRes, functionsRes, sectorsRes] = await Promise.all([
      supabase.from("op_profiles").select("user_id, full_name, shift_id, job_function_id, is_on_vacation").eq("is_active", true).order("full_name"),
      supabase.from("op_job_functions").select("id, name, sector_id"),
      supabase.from("op_sectors").select("id, name, color").order("name"),
    ]);

    setProfiles(profilesRes.data || []);
    setJobFunctions(functionsRes.data || []);
    setSectors(sectorsRes.data || []);
    setLoading(false);
  };

  // Filtered profiles
  const filteredProfiles = useMemo(() => {
    let filtered = profiles;
    if (filterSectorId) {
      const sectorFunctionIds = jobFunctions.filter((jf: any) => jf.sector_id === filterSectorId).map((jf: any) => jf.id);
      filtered = filtered.filter(p => p.job_function_id && sectorFunctionIds.includes(p.job_function_id));
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p => p.full_name.toLowerCase().includes(term));
    }
    return filtered;
  }, [profiles, filterSectorId, searchTerm, jobFunctions]);

  const toggleUser = (userId: string) => {
    setSelectedUserIds(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  };

  const getWorkerInfo = (userId: string) => {
    const profile = profiles.find(p => p.user_id === userId);
    const userFunction = profile?.job_function_id ? jobFunctions.find((jf: any) => jf.id === profile.job_function_id) : null;
    const sector = userFunction?.sector_id ? sectors.find(s => s.id === userFunction.sector_id) : null;
    return { profile, function: userFunction, sector };
  };

  const handleDispatch = async () => {
    if (selectedUserIds.length === 0) {
      toast({ title: "Selecione pelo menos um colaborador", variant: "destructive" });
      return;
    }

    if (!taskName.trim()) {
      toast({ title: "Nome da tarefa é obrigatório", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const config = PRIORITY_CONFIG[priority];
      const mainUserId = selectedUserIds[0];
      const additionalUserIds = selectedUserIds.slice(1);

      // Get the first worker's sector from their job function
      const mainWorkerInfo = getWorkerInfo(mainUserId);
      const workerSectorId = mainWorkerInfo.sector?.id || irregularity.sector?.id || null;

      // Create a task template (irregularity type, on_demand, photo required)
      // Sector = first worker's sector, function = null (any), assigned = first worker
      // Location photo = irregularity photo
      const { data: template, error: templateError } = await supabase
        .from("op_task_templates")
        .insert([{
          name: taskName.trim(),
          description: irregularity.description || `Corrigir irregularidade: ${irregularity.title}`,
          sector_id: workerSectorId,
          job_function_id: null,
          frequency: "on_demand",
          requires_photo: true,
          requires_before_after_photo: true,
          is_irregularity_template: true,
          is_active: true,
          priority: config.priorityValue,
          priority_order: config.priorityOrder,
          estimated_time_minutes: isUndefinedTime ? null : estimatedMinutes,
          default_assigned_user_id: mainUserId,
          additional_assigned_user_ids: additionalUserIds.length > 0 ? additionalUserIds : [],
          required_workers: selectedUserIds.length,
          establishment_id: establishmentId,
          created_by_user_id: user?.id,
          approval_status: "approved",
          location_photos: [irregularity.photo_url],
        }])
        .select()
        .single();

      if (templateError) throw templateError;

      // Create task executions for each selected user (same logic as generate-daily-tasks)
      const executions = selectedUserIds.map(userId => ({
        task_template_id: template.id,
        assigned_user_id: userId,
        scheduled_date: new Date().toISOString().split("T")[0],
        status: "pending" as const,
        priority_score: config.priorityValue * 10,
        establishment_id: establishmentId,
        is_outdoor_task: false,
        photo_before_url: irregularity.photo_url,
      }));

      const { error: execError } = await supabase
        .from("op_task_executions")
        .insert(executions);

      if (execError) throw execError;

      // Unlink any task_executions that reference this irregularity, then delete it
      await supabase
        .from("op_task_executions")
        .update({ irregularity_id: null })
        .eq("irregularity_id", irregularity.id);

      await supabase
        .from("op_irregularities")
        .delete()
        .eq("id", irregularity.id);

      toast({ title: `Template criado com ${executions.length} execução(ões). Irregularidade removida.` });
      onDispatched();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error dispatching:", error);
      toast({ title: "Erro ao despachar", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Despachar Irregularidade
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-5 py-2">
          {/* Irregularity info */}
          <div className="flex gap-3 items-start p-3 rounded-lg bg-muted/50 border border-border">
            <img src={irregularity.photo_url} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{irregularity.title}</p>
              {irregularity.description && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{irregularity.description}</p>
              )}
              {irregularity.sector && (
                <Badge variant="outline" className="mt-1 text-[10px]">
                  <div className="h-2 w-2 rounded-full mr-1" style={{ backgroundColor: irregularity.sector.color }} />
                  {irregularity.sector.name}
                </Badge>
              )}
            </div>
          </div>

          {/* Task name */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Nome da tarefa</Label>
            <Input
              value={taskName}
              onChange={e => setTaskName(e.target.value)}
              placeholder="Nome da tarefa de correção"
              className="h-9"
            />
          </div>

          {/* Time + Priority row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Tempo estimado</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={isUndefinedTime}
                    onCheckedChange={checked => {
                      setIsUndefinedTime(checked);
                      if (checked) setEstimatedMinutes(null);
                      else setEstimatedMinutes(30);
                    }}
                    id="undefined-time"
                  />
                  <Label htmlFor="undefined-time" className="text-xs text-muted-foreground cursor-pointer">
                    Tempo indefinido
                  </Label>
                </div>
                {!isUndefinedTime && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={5}
                      max={480}
                      step={5}
                      value={estimatedMinutes || ""}
                      onChange={e => setEstimatedMinutes(parseInt(e.target.value) || null)}
                      className="h-9 w-24"
                    />
                    <span className="text-xs text-muted-foreground">minutos</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Prioridade</Label>
              <Select value={priority} onValueChange={v => setPriority(v as Priority)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(PRIORITY_CONFIG) as [Priority, typeof PRIORITY_CONFIG[Priority]][]).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <span className={cn("px-1.5 py-0.5 rounded text-xs font-medium", config.color)}>
                        {config.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Info box */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Será criado um <strong>template de irregularidade</strong> com frequência <strong>sob demanda</strong> e foto obrigatória.</p>
              <p>Após a execução por todos os colaboradores, o template será <strong>automaticamente desativado</strong>.</p>
            </div>
          </div>

          {/* Worker selection */}
          <div className="space-y-2">
            <Label className="text-xs font-medium flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              Colaboradores ({selectedUserIds.length} selecionado{selectedUserIds.length !== 1 ? "s" : ""})
            </Label>

            {/* Sector filter */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                className={cn(
                  "px-2 py-0.5 rounded text-[11px] border transition-all",
                  !filterSectorId ? "border-primary bg-primary/10 text-primary font-medium" : "border-border text-muted-foreground hover:border-primary/30"
                )}
                onClick={() => setFilterSectorId("")}
              >
                Todos
              </button>
              {sectors.map(s => (
                <button
                  key={s.id}
                  className={cn(
                    "px-2 py-0.5 rounded text-[11px] border transition-all flex items-center gap-1",
                    filterSectorId === s.id ? "border-primary bg-primary/10 text-primary font-medium" : "border-border text-muted-foreground hover:border-primary/30"
                  )}
                  onClick={() => setFilterSectorId(filterSectorId === s.id ? "" : s.id)}
                >
                  {s.color && <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />}
                  {s.name}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar colaborador..."
                className="h-8 pl-8 text-xs"
              />
            </div>

            {/* Worker list */}
            <ScrollArea className="h-40 border border-border rounded-md">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : (
                <div className="p-1 space-y-0.5">
                  {filteredProfiles.map(p => {
                    const info = getWorkerInfo(p.user_id);
                    const isSelected = selectedUserIds.includes(p.user_id);
                    return (
                      <button
                        key={p.user_id}
                        className={cn(
                          "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left transition-all text-xs",
                          isSelected
                            ? "bg-primary/10 border border-primary/30"
                            : "hover:bg-muted border border-transparent"
                        )}
                        onClick={() => toggleUser(p.user_id)}
                      >
                        <Checkbox checked={isSelected} className="pointer-events-none" />
                        <span className="font-medium flex-1 truncate">{p.full_name}</span>
                        {info.sector && (
                          <Badge variant="outline" className="text-[9px] shrink-0">
                            {info.sector.color && <span className="h-1.5 w-1.5 rounded-full mr-1" style={{ backgroundColor: info.sector.color }} />}
                            {info.sector.name}
                          </Badge>
                        )}
                        {p.is_on_vacation && (
                          <Badge variant="secondary" className="text-[9px]">Férias</Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Selected users summary */}
          {selectedUserIds.length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs font-medium">Resumo</Label>
              <div className="p-3 rounded-lg border border-border bg-muted/30 text-xs space-y-1">
                <p><strong>Template:</strong> {taskName}</p>
                <p><strong>Prioridade:</strong> {PRIORITY_CONFIG[priority].label}</p>
                <p><strong>Tempo:</strong> {isUndefinedTime ? "Indefinido" : `${estimatedMinutes} min`}</p>
                <p><strong>Colaboradores:</strong> {selectedUserIds.map(id => profiles.find(p => p.user_id === id)?.full_name).join(", ")}</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleDispatch}
            disabled={saving || selectedUserIds.length === 0}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Despachar ({selectedUserIds.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
