import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppLayout } from "@/components/operacional-hub/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEstablishment } from "@/hooks/operacional-hub/useEstablishment";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { 
  ArrowLeft, 
  Loader2, 
  Link2, 
  AlertTriangle, 
  Settings2, 
  Users, 
  MapPin,
  Clock,
  Camera,
  Sun,
  Coffee,
  ListChecks,
  Plus,
  X,
  GripVertical,
  Wrench,
  Package,
  Search,
  Lock
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { LocationPhotosUpload } from "@/components/operacional-hub/templates/LocationPhotosUpload";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { useFrequencies } from "@/hooks/operacional-hub/useFrequencies";
import { useAuth } from "@/hooks/operacional-hub/useAuth";
import { useUserRole } from "@/hooks/operacional-hub/useUserRole";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface Sector {
  id: string;
  name: string;
  color: string;
}

interface JobFunction {
  id: string;
  name: string;
  sector_id: string | null;
}

interface UserProfile {
  userId: string;
  fullName: string;
  jobFunctionId: string | null;
}

interface TemplateData {
  id: string;
  name: string;
  description: string | null;
  sector_id: string | null;
  job_function_id: string | null;
  default_assigned_user_id: string | null;
  estimated_time_minutes: number | null;
  frequency: string;
  requires_photo: boolean;
  is_outdoor: boolean;
  priority: number;
  location_photos: string[] | null;
}

interface TemplateFormProps {
  templateId?: string;
  isDialog?: boolean;
  onSaved?: () => void;
}

export default function TemplateForm({ templateId: propTemplateId, isDialog, onSaved }: TemplateFormProps = {}) {
  const { id: paramId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const id = propTemplateId || paramId;
  const isEditing = !!id;

  const [sectors, setSectors] = useState<Sector[]>([]);
  const [jobFunctions, setJobFunctions] = useState<JobFunction[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [templates, setTemplates] = useState<{ id: string; name: string; isActive: boolean; sector?: { name: string; color: string } }[]>([]);
  const [allDependencies, setAllDependencies] = useState<{ task_template_id: string; depends_on_template_id: string }[]>([]);
  const [allTools, setAllTools] = useState<{ id: string; name: string; sectorId: string | null }[]>([]);
  const [selectedToolIds, setSelectedToolIds] = useState<string[]>([]);
  const [allMaterials, setAllMaterials] = useState<{ id: string; name: string; unit: string; sectorId: string | null; currentStock: number }[]>([]);
  const [selectedMaterials, setSelectedMaterials] = useState<{ materialId: string; quantityNeeded: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [usedPriorityOrders, setUsedPriorityOrders] = useState<number[]>([]);
  const [depDialogOpen, setDepDialogOpen] = useState(false);
  const [depSearch, setDepSearch] = useState("");
  const [depSectorFilter, setDepSectorFilter] = useState("all");
  const { data: frequencies = [] } = useFrequencies();
  const { establishmentId } = useEstablishment();

  interface ChecklistFormItem {
    text: string;
    type: "check" | "yes_no";
    sector_id?: string;
  }

  const [form, setForm] = useState({
    name: "",
    description: "",
    sectorId: "",
    jobFunctionId: "",
    defaultAssignedUserId: "",
    dependsOnIds: [] as string[],
    estimatedTime: 30 as number | null,
    frequency: "daily",
    requiresPhoto: true,
    isOutdoor: false,
    priority: "medium" as "critical" | "high" | "medium" | "low",
    locationPhotos: [] as string[],
    
    requiresRestAfter: false,
    restMinutesAfter: 0,
    checklist: [] as ChecklistFormItem[],
    requiredWorkers: 1,
    additionalAssignedUserIds: [] as string[],
    priorityOrder: null as number | null,
    workDays: [1, 2, 3, 4, 5] as number[],
    isActive: true,
  });
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [newChecklistType, setNewChecklistType] = useState<"check" | "yes_no">("check");
  const [newChecklistSectorId, setNewChecklistSectorId] = useState("");

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [sectorsRes, functionsRes, usersRes, templatesRes, dependenciesRes, toolsRes, materialsRes, priorityOrdersRes] = await Promise.all([
        supabase.from("op_sectors").select("*").order("name"),
        supabase.from("op_job_functions").select("id, name, sector_id").order("name"),
        supabase.from("op_profiles").select("user_id, full_name, job_function_id").eq("is_active", true).order("full_name"),
        supabase.from("op_task_templates").select("id, name, is_active, sectors:op_sectors(name, color)").order("name"),
        supabase.from("op_task_dependencies").select("task_template_id, depends_on_template_id"),
        supabase.from("op_tools").select("id, name, sector_id").eq("is_available", true).order("name"),
        supabase.from("op_materials").select("id, name, unit, sector_id, current_stock").order("name"),
        supabase.from("op_task_templates").select("id, priority_order").not("priority_order", "is", null),
      ]);

      if (sectorsRes.data) setSectors(sectorsRes.data);
      if (functionsRes.data) setJobFunctions(functionsRes.data);
      if (usersRes.data) {
        setUsers(usersRes.data.map((u: any) => ({ userId: u.user_id, fullName: u.full_name, jobFunctionId: u.job_function_id })));
      }
      if (templatesRes.data) {
        setTemplates(templatesRes.data.map((t: any) => ({
          id: t.id,
          name: t.name,
          isActive: t.is_active ?? true,
          sector: t.sectors,
        })));
      }
      if (dependenciesRes.data) {
        setAllDependencies(dependenciesRes.data as any[]);
      }
      if (toolsRes.data) {
        setAllTools(toolsRes.data.map((t: any) => ({ id: t.id, name: t.name, sectorId: t.sector_id })));
      }
      if (materialsRes.data) {
        setAllMaterials(materialsRes.data.map((m: any) => ({ id: m.id, name: m.name, unit: m.unit, sectorId: m.sector_id, currentStock: m.current_stock || 0 })));
      }
      if (priorityOrdersRes.data) {
        const used = (priorityOrdersRes.data as any[])
          .filter((t: any) => t.id !== id && t.priority_order !== null)
          .map((t: any) => t.priority_order as number);
        setUsedPriorityOrders(used);
      }
      // Load existing template if editing
      if (id) {
        const { data: template } = await supabase
          .from("op_task_templates")
          .select("*")
          .eq("id", id)
          .single();

        if (template) {
          const deps = (dependenciesRes.data || [])
            .filter((d: any) => d.task_template_id === id)
            .map((d: any) => d.depends_on_template_id);

          const priorityMap: Record<number, "critical" | "high" | "medium" | "low"> = {
            10: "critical",
            8: "high",
            5: "medium",
            2: "low",
          };
          const templatePriority = template.priority || 5;
          const priority = priorityMap[templatePriority] || 
            (templatePriority >= 9 ? "critical" : templatePriority >= 7 ? "high" : templatePriority >= 4 ? "medium" : "low");

          const checklistData: ChecklistFormItem[] = Array.isArray(template.checklist) 
            ? (template.checklist as any[]).map((item: any) => {
                if (typeof item === 'string') return { text: item, type: "check" as const };
                return { 
                  text: item?.text || item?.label || String(item), 
                  type: (item?.type === "yes_no" ? "yes_no" : "check") as "check" | "yes_no",
                  sector_id: item?.sector_id || undefined,
                };
              })
            : [];

          setForm({
            name: template.name,
            description: template.description || "",
            sectorId: template.sector_id || "",
            jobFunctionId: template.job_function_id || "",
            defaultAssignedUserId: template.default_assigned_user_id || "",
            dependsOnIds: deps,
            estimatedTime: template.estimated_time_minutes ?? null,
            frequency: template.frequency,
            requiresPhoto: template.requires_photo || false,
            isOutdoor: template.is_outdoor || false,
            priority,
            locationPhotos: template.location_photos || [],
            
            requiresRestAfter: (template as any).requires_rest_after || false,
            restMinutesAfter: (template as any).rest_minutes_after || 0,
            checklist: checklistData,
            requiredWorkers: (template as any).required_workers || 1,
            additionalAssignedUserIds: (template as any).additional_assigned_user_ids || [],
            priorityOrder: (template as any).priority_order ?? null,
            workDays: (template as any).work_days || [1, 2, 3, 4, 5],
            isActive: template.is_active ?? true,
          });

          // Load template tools and materials
          const [templateToolsRes, templateMaterialsRes] = await Promise.all([
            supabase.from("op_task_template_tools").select("tool_id").eq("task_template_id", id),
            supabase.from("op_task_template_materials").select("material_id, quantity_needed").eq("task_template_id", id),
          ]);
          if (templateToolsRes.data) {
            setSelectedToolIds(templateToolsRes.data.map((t: any) => t.tool_id));
          }
          if (templateMaterialsRes.data) {
            setSelectedMaterials(templateMaterialsRes.data.map((m: any) => ({ materialId: m.material_id, quantityNeeded: m.quantity_needed || 1 })));
          }
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ title: "Erro ao carregar dados", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.name) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }
    if (!form.sectorId) {
      toast({ title: "Setor é obrigatório", variant: "destructive" });
      return;
    }
    // job_function_id is optional - when empty, anyone in the sector can do the task
    if (form.requiresRestAfter && (!form.restMinutesAfter || form.restMinutesAfter <= 0)) {
      toast({ title: "Informe o tempo de descanso", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const priorityValues: Record<string, number> = {
        critical: 10,
        high: 8,
        medium: 5,
        low: 2,
      };

      const checklistJson = form.checklist.map((item) => ({
        text: item.text,
        type: item.type || "check",
        ...(item.type === "yes_no" && item.sector_id ? { sector_id: item.sector_id } : {}),
        checked: false,
      }));

      let approvalStatus = "approved";

      const data: Record<string, any> = {
        name: form.name,
        description: form.description || null,
        sector_id: form.sectorId || null,
        job_function_id: form.jobFunctionId || null,
        default_assigned_user_id: form.defaultAssignedUserId || null,
        estimated_time_minutes: form.estimatedTime || null,
        frequency: form.frequency,
        requires_photo: form.requiresPhoto,
        is_outdoor: form.isOutdoor,
        priority: priorityValues[form.priority] || 5,
        priority_order: (form.priority === "high" || form.priority === "critical") ? form.priorityOrder : null,
        location_photos: form.locationPhotos,
        is_irregularity_template: false,
        requires_rest_after: form.requiresRestAfter,
        rest_minutes_after: form.requiresRestAfter ? (form.restMinutesAfter || null) : null,
        checklist: checklistJson,
        required_workers: form.requiredWorkers,
        additional_assigned_user_ids: form.requiredWorkers > 1 ? form.additionalAssignedUserIds : [],
        work_days: form.workDays,
        is_active: form.isActive,
      };

      // Add approval fields for new templates
      if (!isEditing) {
        data.created_by_user_id = user?.id || null;
        data.approval_status = approvalStatus;
        data.establishment_id = establishmentId;
        if (approvalStatus === "approved") {
          data.approved_by_user_id = user?.id || null;
          data.approved_at = new Date().toISOString();
        }
        data.is_active = approvalStatus === "approved";
      }

      let templateId = id;

      if (id) {
        const { error } = await supabase
          .from("op_task_templates")
          .update(data as any)
          .eq("id", id);
        if (error) throw error;
      } else {
        const { data: newTemplate, error } = await supabase
          .from("op_task_templates")
          .insert([data as any])
          .select("id")
          .single();
        if (error) throw error;
        templateId = newTemplate.id;
      }

      // Update dependencies (with circular dependency check)
      if (templateId) {
        await supabase
          .from("op_task_dependencies")
          .delete()
          .eq("task_template_id", templateId);

        if (form.dependsOnIds.length > 0) {
          // Filter out any dependencies that would create circular references
          const safeDeps = form.dependsOnIds.filter(depId => {
            const wouldCreateCycle = allDependencies.some(
              d => d.task_template_id === depId && d.depends_on_template_id === templateId
            );
            return !wouldCreateCycle;
          });
          if (safeDeps.length > 0) {
            const dependenciesToInsert = safeDeps.map((depId) => ({
              task_template_id: templateId,
              depends_on_template_id: depId,
            }));
            await supabase.from("op_task_dependencies").insert(dependenciesToInsert);
          }
        }
      }

        // Update tools
        await supabase
          .from("op_task_template_tools")
          .delete()
          .eq("task_template_id", templateId);

        if (selectedToolIds.length > 0) {
          const toolsToInsert = selectedToolIds.map((toolId) => ({
            task_template_id: templateId!,
            tool_id: toolId,
          }));
          await supabase.from("op_task_template_tools").insert(toolsToInsert);
        }

        // Update materials
        await supabase
          .from("op_task_template_materials")
          .delete()
          .eq("task_template_id", templateId);

        if (selectedMaterials.length > 0) {
          const materialsToInsert = selectedMaterials
            .filter((m) => m.materialId)
            .map((m) => ({
              task_template_id: templateId!,
              material_id: m.materialId,
              quantity_needed: m.quantityNeeded || 1,
            }));
          if (materialsToInsert.length > 0) {
            await supabase.from("op_task_template_materials").insert(materialsToInsert);
          }
        }

      if (!isEditing && approvalStatus === "pending") {
        toast({ 
          title: "Template enviado para aprovação", 
          description: "Um administrador precisa aprovar antes de ficar ativo." 
        });
      } else {
        toast({ title: id ? "Template atualizado!" : "Template criado!" });
      }
      if (isDialog && onSaved) {
        onSaved();
      } else {
        navigate("/operacional/templates");
      }
    } catch (error) {
      console.error("Error saving template:", error);
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const Wrapper = isDialog ? ({ children }: { children: React.ReactNode }) => <>{children}</> : AppLayout;

  if (loading) {
    return (
      <Wrapper>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Wrapper>
    );
  }

  const handleClose = () => {
    if (isDialog && onSaved) {
      onSaved();
    } else {
      navigate("/operacional/templates");
    }
  };

  return (
    <Wrapper>
      <div className={cn("max-w-5xl mx-auto space-y-6 pb-8", isDialog && "max-w-none")}>
        {!isDialog && (
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl md:text-[26px] font-semibold tracking-tight">
                {isEditing ? "Editar Template" : "Novo Template"}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                {isEditing ? "Modifique as configurações do template" : "Configure um novo modelo de tarefa"}
              </p>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Form - Left/Center Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info Card */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings2 className="h-5 w-5 text-primary" />
                  Informações Básicas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Template *</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Ex: Limpeza do Banheiro Principal"
                    className="text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Descreva os passos e detalhes da tarefa..."
                    rows={3}
                    className="resize-none"
                  />
                </div>

              </CardContent>
            </Card>

            {/* Assignment Card - Only for regular templates */}
            <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Atribuição
                  </CardTitle>
                  <CardDescription>
                    Defina setor, função e responsável pela tarefa
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Setor *</Label>
                      <Select
                        value={form.sectorId || ""}
                        onValueChange={(v) => {
                          const currentFn = jobFunctions.find(f => f.id === form.jobFunctionId);
                          const resetFn = currentFn && currentFn.sector_id !== v;
                          setForm({ ...form, sectorId: v, defaultAssignedUserId: "", ...(resetFn ? { jobFunctionId: "" } : {}) });
                        }}
                      >
                        <SelectTrigger className={!form.sectorId ? "border-destructive" : ""}>
                          <SelectValue placeholder="Selecione o setor" />
                        </SelectTrigger>
                        <SelectContent>
                          {sectors.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              <span className="flex items-center gap-2">
                                <span 
                                  className="h-2 w-2 rounded-full" 
                                  style={{ backgroundColor: s.color }}
                                />
                                {s.name}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Função <span className="text-xs text-muted-foreground">(opcional)</span></Label>
                      <Select
                        value={form.jobFunctionId || "none"}
                        onValueChange={(v) => setForm({ ...form, jobFunctionId: v === "none" ? "" : v, defaultAssignedUserId: "" })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Qualquer pessoa do setor" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Qualquer pessoa do setor</SelectItem>
                          {jobFunctions
                            .filter((f) => f.sector_id === form.sectorId)
                            .map((f) => (
                              <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Colaborador Responsável</Label>
                    <Select
                      value={form.defaultAssignedUserId || "none"}
                      onValueChange={(v) => setForm({ ...form, defaultAssignedUserId: v === "none" ? "" : v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sem atribuição fixa" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem atribuição fixa</SelectItem>
                        {users
                          .filter((u) => {
                            if (!form.sectorId) return false;
                            // Get functions in the selected sector
                            const sectorFunctionIds = jobFunctions
                              .filter((f) => f.sector_id === form.sectorId)
                              .map((f) => f.id);
                            // If a specific function is selected, match it
                            if (form.jobFunctionId) {
                              return u.jobFunctionId === form.jobFunctionId;
                            }
                            // Otherwise, show anyone whose function is in this sector
                            return u.jobFunctionId && sectorFunctionIds.includes(u.jobFunctionId);
                          })
                          .map((u) => (
                            <SelectItem key={u.userId} value={u.userId}>{u.fullName}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Se definido, a tarefa será sempre atribuída a este colaborador
                    </p>
                  </div>

                  {/* Required Workers */}
                  <div className="space-y-2">
                    <Label>Quantidade de Pessoas Necessárias</Label>
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      value={form.requiredWorkers}
                      onChange={(e) => {
                        const val = Math.max(1, parseInt(e.target.value) || 1);
                        setForm({ 
                          ...form, 
                          requiredWorkers: val,
                          additionalAssignedUserIds: val <= 1 ? [] : form.additionalAssignedUserIds
                        });
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      Quantas pessoas são necessárias para executar esta tarefa
                    </p>
                  </div>

                  {/* Additional Users from Other Sectors */}
                  {form.requiredWorkers > 1 && (
                    <div className="space-y-3 p-4 rounded-xl border border-primary/20 bg-primary/5">
                      <Label className="text-base font-medium">
                        Colaboradores Adicionais de Outros Setores
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Selecione colaboradores de qualquer setor para compor a equipe ({form.additionalAssignedUserIds.length} de {form.requiredWorkers - 1} adicionais)
                      </p>
                      
                      {form.additionalAssignedUserIds.map((uid, idx) => {
                        const user = users.find(u => u.userId === uid);
                        return (
                          <div key={idx} className="flex items-center gap-2">
                            <Select
                              value={uid}
                              onValueChange={(v) => {
                                const updated = [...form.additionalAssignedUserIds];
                                updated[idx] = v;
                                setForm({ ...form, additionalAssignedUserIds: updated });
                              }}
                            >
                              <SelectTrigger className="flex-1">
                                <SelectValue placeholder="Selecione um colaborador" />
                              </SelectTrigger>
                              <SelectContent>
                                {users
                                  .filter((u) => {
                                    // Exclude the main assigned user
                                    if (u.userId === form.defaultAssignedUserId) return false;
                                    // Exclude already selected additional users (except current slot)
                                    if (form.additionalAssignedUserIds.includes(u.userId) && u.userId !== uid) return false;
                                    return true;
                                  })
                                  .map((u) => {
                                    const fn = jobFunctions.find(f => f.id === u.jobFunctionId);
                                    const sec = fn ? sectors.find(s => s.id === fn.sector_id) : null;
                                    return (
                                      <SelectItem key={u.userId} value={u.userId}>
                                        <span className="flex items-center gap-2">
                                          {sec && (
                                            <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: sec.color }} />
                                          )}
                                          {u.fullName}
                                          {sec && <span className="text-xs text-muted-foreground">({sec.name})</span>}
                                        </span>
                                      </SelectItem>
                                    );
                                  })}
                              </SelectContent>
                            </Select>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                const updated = form.additionalAssignedUserIds.filter((_, i) => i !== idx);
                                setForm({ ...form, additionalAssignedUserIds: updated });
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}

                      {form.additionalAssignedUserIds.length < form.requiredWorkers - 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => setForm({ ...form, additionalAssignedUserIds: [...form.additionalAssignedUserIds, ""] })}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Adicionar Colaborador
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

            {/* Location Photos Card */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Fotos de Localização
                </CardTitle>
                <CardDescription>
                  Adicione até 3 fotos para ajudar a identificar o local da tarefa
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LocationPhotosUpload
                  photos={form.locationPhotos}
                  onChange={(photos) => setForm({ ...form, locationPhotos: photos })}
                  maxPhotos={3}
                />
              </CardContent>
            </Card>

            {/* Checklist Card */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ListChecks className="h-5 w-5 text-primary" />
                  Checklist
                </CardTitle>
                <CardDescription>
                  Itens que o colaborador deve conferir durante a execução da tarefa
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {form.checklist.map((item, index) => (
                  <div key={index} className="space-y-2 p-3 rounded-lg border border-border bg-muted/20 group">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground/40" />
                      <Select
                        value={item.type || "check"}
                        onValueChange={(v: "check" | "yes_no") => {
                          const updated = [...form.checklist];
                          updated[index] = { ...updated[index], type: v, sector_id: v === "check" ? undefined : updated[index].sector_id };
                          setForm({ ...form, checklist: updated });
                        }}
                      >
                        <SelectTrigger className="h-8 w-[100px] text-[11px] shrink-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="check" className="text-xs">✓ Check</SelectItem>
                          <SelectItem value="yes_no" className="text-xs">⚠ Sim/Não</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        value={item.text}
                        onChange={(e) => {
                          const updated = [...form.checklist];
                          updated[index] = { ...updated[index], text: e.target.value };
                          setForm({ ...form, checklist: updated });
                        }}
                        className="flex-1 h-8 text-sm"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                        onClick={() => {
                          const updated = [...form.checklist];
                          updated.splice(index, 1);
                          setForm({ ...form, checklist: updated });
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    {item.type === "yes_no" && (
                      <div className="ml-8 flex items-center gap-2">
                        <AlertTriangle className="h-3 w-3 text-warning shrink-0" />
                        <span className="text-xs text-muted-foreground shrink-0">Se "Não" → Irregularidade para:</span>
                        <Select
                          value={item.sector_id || ""}
                          onValueChange={(v) => {
                            const updated = [...form.checklist];
                            updated[index] = { ...updated[index], sector_id: v };
                            setForm({ ...form, checklist: updated });
                          }}
                        >
                          <SelectTrigger className="h-7 text-xs flex-1">
                            <SelectValue placeholder="Setor destino" />
                          </SelectTrigger>
                          <SelectContent>
                            {sectors.map((s) => (
                              <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                ))}
                
                {/* Add new item */}
                <div className="space-y-2 p-3 rounded-lg border border-dashed border-primary/30 bg-primary/5">
                  <div className="flex items-center gap-2">
                    <Select
                      value={newChecklistType}
                      onValueChange={(v: "check" | "yes_no") => setNewChecklistType(v)}
                    >
                      <SelectTrigger className="w-28 h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="check">✅ Check</SelectItem>
                        <SelectItem value="yes_no">❓ Sim/Não</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      value={newChecklistItem}
                      onChange={(e) => setNewChecklistItem(e.target.value)}
                      placeholder={newChecklistType === "yes_no" ? "Pergunta sim/não..." : "Item do checklist..."}
                      className="flex-1"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newChecklistItem.trim()) {
                          e.preventDefault();
                          const newItem: ChecklistFormItem = {
                            text: newChecklistItem.trim(),
                            type: newChecklistType,
                            ...(newChecklistType === "yes_no" ? { sector_id: newChecklistSectorId || undefined } : {}),
                          };
                          setForm({ ...form, checklist: [...form.checklist, newItem] });
                          setNewChecklistItem("");
                          setNewChecklistSectorId("");
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={!newChecklistItem.trim()}
                      onClick={() => {
                        if (newChecklistItem.trim()) {
                          const newItem: ChecklistFormItem = {
                            text: newChecklistItem.trim(),
                            type: newChecklistType,
                            ...(newChecklistType === "yes_no" ? { sector_id: newChecklistSectorId || undefined } : {}),
                          };
                          setForm({ ...form, checklist: [...form.checklist, newItem] });
                          setNewChecklistItem("");
                          setNewChecklistSectorId("");
                        }
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {newChecklistType === "yes_no" && (
                    <div className="flex items-center gap-2 ml-[7.5rem]">
                      <AlertTriangle className="h-3 w-3 text-warning shrink-0" />
                      <span className="text-xs text-muted-foreground shrink-0">Setor destino:</span>
                      <Select value={newChecklistSectorId} onValueChange={setNewChecklistSectorId}>
                        <SelectTrigger className="h-7 text-xs flex-1">
                          <SelectValue placeholder="Selecione o setor" />
                        </SelectTrigger>
                        <SelectContent>
                          {sectors.map((s) => (
                            <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                {form.checklist.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    Nenhum item no checklist. Adicione itens acima.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Tools Card */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Wrench className="h-5 w-5 text-primary" />
                    Ferramentas Necessárias
                  </CardTitle>
                  <CardDescription>
                    Selecione as ferramentas obrigatórias para executar esta tarefa
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {allTools.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhuma ferramenta cadastrada. Cadastre em Ferramentas primeiro.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {allTools
                        .filter((t) => !form.sectorId || !t.sectorId || t.sectorId === form.sectorId)
                        .map((tool) => (
                        <label
                          key={tool.id}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                            selectedToolIds.includes(tool.id)
                              ? "border-primary/50 bg-primary/5"
                              : "border-border hover:bg-muted/50"
                          )}
                        >
                          <Checkbox
                            checked={selectedToolIds.includes(tool.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedToolIds([...selectedToolIds, tool.id]);
                              } else {
                                setSelectedToolIds(selectedToolIds.filter((id) => id !== tool.id));
                              }
                            }}
                          />
                          <Wrench className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{tool.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

            {/* Materials Card */}
            <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    Materiais Necessários
                  </CardTitle>
                  <CardDescription>
                    Defina os materiais e quantidades necessárias. Tarefas sem estoque suficiente serão puladas.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selectedMaterials.map((sm, idx) => {
                    const mat = allMaterials.find((m) => m.id === sm.materialId);
                    const insufficient = mat && mat.currentStock < sm.quantityNeeded;
                    return (
                      <div key={idx} className="flex items-center gap-2">
                        <Select
                          value={sm.materialId || ""}
                          onValueChange={(v) => {
                            const updated = [...selectedMaterials];
                            updated[idx] = { ...updated[idx], materialId: v };
                            setSelectedMaterials(updated);
                          }}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Selecione um material" />
                          </SelectTrigger>
                          <SelectContent>
                            {allMaterials
                              .filter((m) => !form.sectorId || !m.sectorId || m.sectorId === form.sectorId)
                              .filter((m) => !selectedMaterials.some((s, i) => i !== idx && s.materialId === m.id))
                              .map((m) => (
                                <SelectItem key={m.id} value={m.id}>
                                  <span className="flex items-center gap-2">
                                    {m.name}
                                    <span className="text-xs text-muted-foreground">
                                      ({m.currentStock} {m.unit})
                                    </span>
                                  </span>
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          min={1}
                          value={sm.quantityNeeded}
                          onChange={(e) => {
                            const updated = [...selectedMaterials];
                            updated[idx] = { ...updated[idx], quantityNeeded: Math.max(1, parseInt(e.target.value) || 1) };
                            setSelectedMaterials(updated);
                          }}
                          className="w-20"
                          placeholder="Qtd"
                        />
                        {mat && (
                          <span className="text-xs text-muted-foreground whitespace-nowrap">{mat.unit}</span>
                        )}
                        {insufficient && (
                          <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setSelectedMaterials(selectedMaterials.filter((_, i) => i !== idx))}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setSelectedMaterials([...selectedMaterials, { materialId: "", quantityNeeded: 1 }])}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Material
                  </Button>
                  {selectedMaterials.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      Nenhum material vinculado. Adicione materiais acima.
                    </p>
                  )}
                </CardContent>
              </Card>

            <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Link2 className="h-5 w-5 text-primary" />
                    Dependências
                  </CardTitle>
                  <CardDescription>
                    Esta tarefa só poderá ser iniciada após as tarefas selecionadas serem concluídas
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {form.dependsOnIds.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {form.dependsOnIds.map((depId) => {
                        const t = templates.find(tpl => tpl.id === depId);
                        if (!t) return null;
                        // Check if other templates also depend on this dep (besides the current one)
                        const isUsedByOthers = allDependencies.some(
                          d => d.depends_on_template_id === depId && d.task_template_id !== id
                        );
                        return (
                          <Badge key={depId} variant="secondary" className="flex items-center gap-1.5 py-1.5 px-3 text-sm">
                            {t.sector && (
                              <span 
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: t.sector.color }}
                              />
                            )}
                            {t.name}
                            {isUsedByOthers ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Lock className="h-3 w-3 ml-1 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  Outros templates dependem desta tarefa
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setForm({ ...form, dependsOnIds: form.dependsOnIds.filter(d => d !== depId) })}
                                className="ml-1 hover:text-destructive transition-colors"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                  <Dialog open={depDialogOpen} onOpenChange={setDepDialogOpen}>
                    <DialogTrigger asChild>
                      <Button type="button" variant="outline" className="w-full gap-2">
                        <Plus className="h-4 w-4" />
                        Adicionar Dependência
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Selecionar Dependências</DialogTitle>
                        <DialogDescription>
                          Escolha as tarefas que devem ser concluídas antes desta.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Buscar template..."
                              value={depSearch}
                              onChange={(e) => setDepSearch(e.target.value)}
                              className="pl-9"
                            />
                          </div>
                          <Select value={depSectorFilter} onValueChange={setDepSectorFilter}>
                            <SelectTrigger className="w-[160px]">
                              <SelectValue placeholder="Todos setores" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todos setores</SelectItem>
                              {sectors.map((s) => (
                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="max-h-72 overflow-y-auto space-y-1 border rounded-lg p-2">
                          {templates
                            .filter(t => t.id !== id && t.isActive)
                            .filter(t => {
                              // Prevent circular dependencies: if template t already depends on current template (id),
                              // selecting it would create a cycle
                              if (id) {
                                const wouldCreateCycle = allDependencies.some(
                                  d => d.task_template_id === t.id && d.depends_on_template_id === id
                                );
                                if (wouldCreateCycle) return false;
                              }
                              return true;
                            })
                            .filter(t => !depSearch || t.name.toLowerCase().includes(depSearch.toLowerCase()))
                            .filter(t => depSectorFilter === "all" || (t.sector && sectors.find(s => s.name === t.sector?.name)?.id === depSectorFilter))
                            .map((t) => {
                              const isSelected = form.dependsOnIds.includes(t.id);
                              const isLockedDep = isSelected && allDependencies.some(
                                d => d.depends_on_template_id === t.id && d.task_template_id !== id
                              );
                              return (
                                <label
                                  key={t.id}
                                  className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${isLockedDep ? "opacity-70 cursor-not-allowed" : "cursor-pointer"} ${isSelected ? "bg-primary/10 border border-primary/20" : "hover:bg-muted"}`}
                                >
                                  <Checkbox
                                    checked={isSelected}
                                    disabled={isLockedDep}
                                    onCheckedChange={(checked) => {
                                      if (isLockedDep) return;
                                      if (checked) {
                                        setForm({ ...form, dependsOnIds: [...form.dependsOnIds, t.id] });
                                      } else {
                                        setForm({ ...form, dependsOnIds: form.dependsOnIds.filter(depId => depId !== t.id) });
                                      }
                                    }}
                                  />
                                  <span className="text-sm font-medium flex-1">{t.name}</span>
                                  {isLockedDep && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                      </TooltipTrigger>
                                      <TooltipContent>Outros templates dependem desta tarefa</TooltipContent>
                                    </Tooltip>
                                  )}
                                  {t.sector && (
                                    <span
                                      className="text-xs px-2 py-1 rounded-full"
                                      style={{ backgroundColor: t.sector.color + "20", color: t.sector.color }}
                                    >
                                      {t.sector.name}
                                    </span>
                                  )}
                                </label>
                              );
                            })}
                          {templates.filter(t => t.id !== id && t.isActive).filter(t => !depSearch || t.name.toLowerCase().includes(depSearch.toLowerCase())).filter(t => depSectorFilter === "all" || (t.sector && sectors.find(s => s.name === t.sector?.name)?.id === depSectorFilter)).length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-6">
                              Nenhum template encontrado
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Button type="button" onClick={() => setDepDialogOpen(false)}>
                          Concluído
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  {form.dependsOnIds.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      Nenhuma dependência configurada
                    </p>
                  )}
                </CardContent>
              </Card>
          </div>

          {/* Right Sidebar - Settings */}
          <div className="space-y-6">
            {/* Active/Inactive Toggle */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">Template Ativo</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {form.isActive ? "Tarefas serão geradas normalmente" : "Nenhuma tarefa será gerada"}
                    </p>
                  </div>
                  <Switch
                    checked={form.isActive}
                    onCheckedChange={(v) => setForm({ ...form, isActive: v })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Timing Card */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Tempo e Frequência
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Label>Tempo Estimado</Label>
                  <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Tempo indefinido</span>
                    </div>
                    <Switch
                      checked={form.estimatedTime === null}
                      onCheckedChange={(v) => setForm({ ...form, estimatedTime: v ? null : 30 })}
                    />
                  </div>
                  {form.estimatedTime === null ? (
                    <p className="text-xs text-muted-foreground px-1">
                      O tempo será medido pelo cronômetro (iniciar/finalizar do colaborador).
                    </p>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={form.estimatedTime}
                        onChange={(e) => setForm({ ...form, estimatedTime: parseInt(e.target.value) || 30 })}
                        className="flex-1"
                        min={1}
                      />
                      <span className="text-sm text-muted-foreground">minutos</span>
                    </div>
                  )}
                </div>

                {/* Rest time after task */}
                <div className="space-y-3 p-3 rounded-xl border border-border bg-muted/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Coffee className="h-4 w-4 text-muted-foreground" />
                      <Label className="cursor-pointer">Descanso após tarefa</Label>
                    </div>
                    <Switch
                      checked={form.requiresRestAfter}
                      onCheckedChange={(v) => setForm({ ...form, requiresRestAfter: v, restMinutesAfter: v ? (form.restMinutesAfter || 10) : 0 })}
                    />
                  </div>
                  {form.requiresRestAfter && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Tempo de descanso *</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={form.restMinutesAfter}
                          onChange={(e) => setForm({ ...form, restMinutesAfter: parseInt(e.target.value) || 0 })}
                          className="flex-1"
                          min={1}
                          max={120}
                          placeholder="10"
                        />
                        <span className="text-sm text-muted-foreground">minutos</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Este tempo será considerado no cálculo de jornada e produtividade
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                    <Label>Frequência</Label>
                    <Select
                      value={form.frequency}
                      onValueChange={(v) => setForm({ ...form, frequency: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {frequencies.length > 0 ? (
                          frequencies.map((freq) => (
                            <SelectItem key={freq.id} value={freq.name}>
                              {freq.label}
                              {freq.interval_days ? ` (${freq.interval_days}d)` : ""}
                            </SelectItem>
                          ))
                        ) : (
                          <>
                            <SelectItem value="daily">Diária</SelectItem>
                            <SelectItem value="weekly">Semanal</SelectItem>
                            <SelectItem value="monthly">Mensal</SelectItem>
                            <SelectItem value="on_demand">Sob Demanda</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                {/* Work Days Selection */}
                {form.frequency !== "on_demand" && (
                  <div className="space-y-2">
                    <Label>Dias Disponíveis</Label>
                    <p className="text-xs text-muted-foreground">
                      Em quais dias da semana esta tarefa pode ser executada
                    </p>
                    <ToggleGroup
                      type="multiple"
                      value={form.workDays.map(String)}
                      onValueChange={(vals) => setForm({ ...form, workDays: vals.map(Number).sort() })}
                      className="flex flex-wrap gap-1"
                    >
                      {[
                        { value: "1", label: "Seg" },
                        { value: "2", label: "Ter" },
                        { value: "3", label: "Qua" },
                        { value: "4", label: "Qui" },
                        { value: "5", label: "Sex" },
                        { value: "6", label: "Sáb" },
                        { value: "0", label: "Dom" },
                      ].map((day) => (
                        <ToggleGroupItem
                          key={day.value}
                          value={day.value}
                          className="flex-1 min-w-[40px] text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                        >
                          {day.label}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Priority Card */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Prioridade</CardTitle>
                <CardDescription>
                  Define ação em caso de ausência do colaborador
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select
                  value={form.priority}
                  onValueChange={(v: "critical" | "high" | "medium" | "low") => setForm({ ...form, priority: v, priorityOrder: (v === "high" || v === "critical") ? form.priorityOrder : null })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-red-500" />
                        Crítica
                      </span>
                    </SelectItem>
                    <SelectItem value="high">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-orange-500" />
                        Alta
                      </span>
                    </SelectItem>
                    <SelectItem value="medium">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-yellow-500" />
                        Média
                      </span>
                    </SelectItem>
                    <SelectItem value="low">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-gray-400" />
                        Baixa
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>

                {(form.priority === "high" || form.priority === "critical") && (
                  <div className="mt-4">
                    <Label className="text-sm text-muted-foreground mb-2 block">
                      Ordem de prioridade (10 = mais importante, 1 = menos importante)
                    </Label>
                    <Select
                      value={form.priorityOrder !== null ? String(form.priorityOrder) : ""}
                      onValueChange={(v) => setForm({ ...form, priorityOrder: v !== "" && v !== undefined ? Number(v) : null })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a ordem" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 10 }, (_, i) => 10 - i)
                          .filter((n) => !usedPriorityOrders.includes(n) || n === form.priorityOrder)
                          .map((n) => (
                            <SelectItem key={n} value={String(n)}>
                              {n}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Options Card */}
            <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">Opções</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Camera className="h-4 w-4 text-muted-foreground" />
                      <Label className="cursor-pointer">Foto obrigatória</Label>
                    </div>
                    <Switch
                      checked={form.requiresPhoto}
                      onCheckedChange={(v) => setForm({ ...form, requiresPhoto: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sun className="h-4 w-4 text-muted-foreground" />
                      <Label className="cursor-pointer">Tarefa ao ar livre</Label>
                    </div>
                    <Switch
                      checked={form.isOutdoor}
                      onCheckedChange={(v) => setForm({ ...form, isOutdoor: v })}
                    />
                  </div>
                </CardContent>
              </Card>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button 
                className="w-full h-12 text-base" 
                onClick={handleSubmit} 
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  isEditing ? "Salvar Alterações" : "Criar Template"
                )}
              </Button>
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={handleClose}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Wrapper>
  );
}
