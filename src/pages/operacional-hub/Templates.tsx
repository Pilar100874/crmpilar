import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/operacional-hub/layout/AppLayout";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, FileText, Clock, Trash2, Edit2, AlertTriangle, Search, Users, Copy, Sun, Camera, MapPin, Power, ClipboardList } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useUserRole } from "@/hooks/operacional-hub/useUserRole";
import { useFrequencies } from "@/hooks/operacional-hub/useFrequencies";

interface TaskTemplate {
  id: string;
  name: string;
  description: string | null;
  sector: { id: string; name: string; color: string } | null;
  jobFunction: { id: string; name: string } | null;
  estimatedTime: number | null;
  frequency: string;
  requiresPhoto: boolean;
  isActive: boolean;
  isOutdoor: boolean;
  priority: number;
  isIrregularityTemplate: boolean;
  requiredWorkers: number;
  hasLocationPhotos: boolean;
}

interface Sector {
  id: string;
  name: string;
  color: string;
}

interface JobFunction {
  id: string;
  name: string;
}

export default function Templates() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [jobFunctions, setJobFunctions] = useState<JobFunction[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters - persist to localStorage
  const [searchQuery, setSearchQuery] = useState(() => localStorage.getItem("templates_search") || "");
  const [filterSectorId, setFilterSectorId] = useState<string>(() => localStorage.getItem("templates_sector") || "all");
  const [filterFunctionId, setFilterFunctionId] = useState<string>(() => localStorage.getItem("templates_function") || "all");
  const [filterType, setFilterType] = useState<string>(() => localStorage.getItem("templates_type") || "all");

  useEffect(() => { localStorage.setItem("templates_search", searchQuery); }, [searchQuery]);
  useEffect(() => { localStorage.setItem("templates_sector", filterSectorId); }, [filterSectorId]);
  useEffect(() => { localStorage.setItem("templates_function", filterFunctionId); }, [filterFunctionId]);
  useEffect(() => { localStorage.setItem("templates_type", filterType); }, [filterType]);
  
  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<{ id: string; name: string } | null>(null);

  // Duplicate
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [templateToDuplicate, setTemplateToDuplicate] = useState<{ id: string; name: string } | null>(null);
  const [duplicateName, setDuplicateName] = useState("");

  const { toast } = useToast();
  const { isAdminOrManager } = useUserRole();
  const { data: frequencies = [] } = useFrequencies();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [templatesRes, sectorsRes, functionsRes] = await Promise.all([
        supabase
          .from("op_task_templates")
          .select(`
            id, name, description, estimated_time_minutes, frequency, requires_photo, is_active, is_outdoor, priority, is_irregularity_template, required_workers, location_photos,
            sectors:op_sectors(id, name, color),
            job_functions:op_job_functions(id, name)
          `)
          .order("name"),
        supabase.from("op_sectors").select("*").order("name"),
        supabase.from("op_job_functions").select("*").order("name"),
      ]);

      if (templatesRes.data) {
        setTemplates(
          templatesRes.data.map((t: any) => ({
            id: t.id,
            name: t.name,
            description: t.description,
            sector: t.sectors,
            jobFunction: t.job_functions,
            estimatedTime: t.estimated_time_minutes ?? null,
            frequency: t.frequency,
            requiresPhoto: t.requires_photo || false,
            isActive: t.is_active || false,
            isOutdoor: t.is_outdoor || false,
            priority: t.priority || 5,
            isIrregularityTemplate: t.is_irregularity_template || false,
            requiredWorkers: t.required_workers || 1,
            hasLocationPhotos: Array.isArray(t.location_photos) && t.location_photos.length > 0,
          }))
        );
      }
      if (sectorsRes.data) setSectors(sectorsRes.data);
      if (functionsRes.data) setJobFunctions(functionsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const openDeleteDialog = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTemplateToDelete({ id, name });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!templateToDelete) return;

    try {
      // First, unlink any irregularities referencing executions of this template
      const { data: executions } = await supabase
        .from("op_task_executions")
        .select("id")
        .eq("task_template_id", templateToDelete.id);

      if (executions && executions.length > 0) {
        const execIds = executions.map(e => e.id);
        // Unlink irregularities that reference these executions
        await supabase
          .from("op_irregularities")
          .update({ task_execution_id: null })
          .in("task_execution_id", execIds);

        // Delete the executions
        await supabase
          .from("op_task_executions")
          .delete()
          .eq("task_template_id", templateToDelete.id);
      }

      const { error } = await supabase.from("op_task_templates").delete().eq("id", templateToDelete.id);
      if (error) throw error;
      toast({ title: "Template excluído!" });
      fetchData();
    } catch (error) {
      console.error("Error deleting template:", error);
      toast({ title: "Erro ao excluir", variant: "destructive" });
    } finally {
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    }
  };

  const openDuplicateDialog = (templateId: string, templateName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTemplateToDuplicate({ id: templateId, name: templateName });
    setDuplicateName(`${templateName} (Cópia)`);
    setDuplicateDialogOpen(true);
  };

  const handleConfirmDuplicate = async () => {
    if (!templateToDuplicate || !duplicateName.trim()) return;
    try {
      const { data: original, error: fetchErr } = await supabase
        .from("op_task_templates")
        .select("*")
        .eq("id", templateToDuplicate.id)
        .single();
      if (fetchErr || !original) throw fetchErr;

      const { id, created_at, updated_at, approved_at, approved_by_user_id, ...rest } = original as any;
      const { data: newTemplate, error: insertErr } = await supabase
        .from("op_task_templates")
        .insert([{ ...rest, name: duplicateName.trim(), approval_status: "approved", is_active: true }])
        .select("id")
        .single();
      if (insertErr) throw insertErr;

      const newId = newTemplate.id;
      const [depsRes, toolsRes, matsRes] = await Promise.all([
        supabase.from("op_task_dependencies").select("depends_on_template_id").eq("task_template_id", templateToDuplicate.id),
        supabase.from("op_task_template_tools").select("tool_id").eq("task_template_id", templateToDuplicate.id),
        supabase.from("op_task_template_materials").select("material_id, quantity_needed").eq("task_template_id", templateToDuplicate.id),
      ]);

      if (depsRes.data?.length) {
        await supabase.from("op_task_dependencies").insert(depsRes.data.map((d: any) => ({ task_template_id: newId, depends_on_template_id: d.depends_on_template_id })));
      }
      if (toolsRes.data?.length) {
        await supabase.from("op_task_template_tools").insert(toolsRes.data.map((t: any) => ({ task_template_id: newId, tool_id: t.tool_id })));
      }
      if (matsRes.data?.length) {
        await supabase.from("op_task_template_materials").insert(matsRes.data.map((m: any) => ({ task_template_id: newId, material_id: m.material_id, quantity_needed: m.quantity_needed })));
      }

      toast({ title: "Template duplicado com sucesso!" });
      fetchData();
    } catch (error) {
      console.error("Error duplicating template:", error);
      toast({ title: "Erro ao duplicar template", variant: "destructive" });
    } finally {
      setDuplicateDialogOpen(false);
      setTemplateToDuplicate(null);
    }
  };
  const frequencyLabels: Record<string, string> = {
    daily: "Diária",
    weekly: "Semanal",
    monthly: "Mensal",
    on_demand: "Sob Demanda",
  };

  const getFrequencyLabel = (freq: string) => {
    if (frequencyLabels[freq]) return frequencyLabels[freq];
    const custom = frequencies.find((f) => f.name === freq);
    if (custom) return custom.label + (custom.interval_days ? ` (${custom.interval_days}d)` : "");
    return freq;
  };

  const priorityLabels: Record<number, { label: string; color: string }> = {
    10: { label: "Crítica", color: "bg-red-500" },
    8: { label: "Alta", color: "bg-orange-500" },
    5: { label: "Média", color: "bg-yellow-500" },
    2: { label: "Baixa", color: "bg-gray-400" },
  };

  const getPriorityInfo = (priority: number) => {
    if (priority >= 9) return priorityLabels[10];
    if (priority >= 7) return priorityLabels[8];
    if (priority >= 4) return priorityLabels[5];
    return priorityLabels[2];
  };

  // Filter templates
  const filteredTemplates = templates.filter((template) => {
    const matchesSearch = !searchQuery || 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSector = filterSectorId === "all" || template.sector?.id === filterSectorId;
    const matchesFunction = filterFunctionId === "all" || template.jobFunction?.id === filterFunctionId;
    const matchesType = filterType === "all" || 
      (filterType === "irregularity" && template.isIrregularityTemplate) ||
      (filterType === "regular" && !template.isIrregularityTemplate);
    return matchesSearch && matchesSector && matchesFunction && matchesType;
  });

  const regularTemplates = filteredTemplates.filter(t => !t.isIrregularityTemplate);
  const irregularityTemplates = filteredTemplates.filter(t => t.isIrregularityTemplate);

  const hasActiveFilters = searchQuery || filterSectorId !== "all" || filterFunctionId !== "all" || filterType !== "all";

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">Templates de Tarefas</h1>
            <p className="text-muted-foreground">
              {templates.length} template{templates.length !== 1 ? "s" : ""} cadastrado{templates.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              className="gap-2 h-12" 
              onClick={() => navigate("/operacional/templates-report")}
            >
              <ClipboardList className="h-5 w-5" />
              Relatório
            </Button>
            <Button 
              className="gap-2 h-12 px-6" 
              onClick={() => navigate("/operacional/templates/new")}
            >
              <Plus className="h-5 w-5" />
              Novo Template
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {/* Filters */}
              <div className="flex flex-wrap gap-3">
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-full sm:w-[160px]">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    <SelectItem value="regular">Tarefas Regulares</SelectItem>
                    <SelectItem value="irregularity">Irregularidades</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterSectorId} onValueChange={setFilterSectorId}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Setor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os setores</SelectItem>
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

                <Select value={filterFunctionId} onValueChange={setFilterFunctionId}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Função" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as funções</SelectItem>
                    {jobFunctions.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {hasActiveFilters && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setSearchQuery("");
                      setFilterSectorId("all");
                      setFilterFunctionId("all");
                      setFilterType("all");
                      localStorage.removeItem("templates_search");
                      localStorage.removeItem("templates_sector");
                      localStorage.removeItem("templates_function");
                      localStorage.removeItem("templates_type");
                    }}
                  >
                    Limpar filtros
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
          </div>
        ) : filteredTemplates.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {templates.length === 0 
                    ? "Nenhum template cadastrado" 
                    : "Nenhum template encontrado"}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {templates.length === 0 
                    ? "Crie seu primeiro template para começar" 
                    : "Tente ajustar os filtros de busca"}
                </p>
                {templates.length === 0 && (
                  <Button onClick={() => navigate("/operacional/templates/new")}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Template
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Regular Templates */}
            {(filterType === "all" || filterType === "regular") && regularTemplates.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Tarefas Regulares
                  <Badge variant="secondary" className="ml-2">{regularTemplates.length}</Badge>
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {regularTemplates.map((template) => (
                    <Card 
                      key={template.id}
                      className={cn(
                        "cursor-pointer hover:border-primary/50 transition-colors group",
                        !template.isActive && "opacity-60"
                      )}
                      onClick={() => navigate(`/templates/${template.id}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div
                              className="h-3 w-3 rounded-full flex-shrink-0 mt-1.5"
                              style={{ backgroundColor: template.sector?.color || "#3b82f6" }}
                            />
                            <div className="min-w-0 flex-1">
                              <h3 className="font-medium truncate group-hover:text-primary transition-colors">
                                {template.name}
                              </h3>
                              <p className="text-sm text-muted-foreground truncate">
                                {template.sector?.name || "Sem setor"}
                                {template.jobFunction && ` • ${template.jobFunction.name}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => openDuplicateDialog(template.id, template.name, e)}
                              title="Duplicar"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/templates/${template.id}`);
                              }}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            {isAdminOrManager && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                                onClick={(e) => openDeleteDialog(template.id, template.name, e)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2 mt-3 text-xs">
                          {!template.isActive && (
                            <Badge variant="destructive" className="gap-1">
                              <Power className="h-3 w-3" />
                              Inativo
                            </Badge>
                          )}
                          <Badge variant="outline" className="gap-1">
                            <Clock className="h-3 w-3" />
                            {template.estimatedTime !== null ? `${template.estimatedTime}min` : "Indefinido"}
                          </Badge>
                          <Badge variant="outline">
                            {getFrequencyLabel(template.frequency)}
                          </Badge>
                          <Badge variant="outline" className="gap-1">
                            <span 
                              className={`h-1.5 w-1.5 rounded-full ${getPriorityInfo(template.priority).color}`}
                            />
                            {getPriorityInfo(template.priority).label}
                          </Badge>
                          {template.requiredWorkers > 1 && (
                            <Badge variant="outline" className="gap-1">
                              <Users className="h-3 w-3" />
                              {template.requiredWorkers}
                            </Badge>
                          )}
                          {template.isOutdoor && (
                            <Badge variant="outline" className="gap-1">
                              <Sun className="h-3 w-3" />
                              Ar livre
                            </Badge>
                          )}
                          {template.requiresPhoto && (
                            <Badge variant="outline" className="gap-1">
                              <Camera className="h-3 w-3" />
                              Foto
                            </Badge>
                          )}
                          {template.hasLocationPhotos && (
                            <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-300">
                              <MapPin className="h-3 w-3" />
                              Local
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Irregularity Templates */}
            {(filterType === "all" || filterType === "irregularity") && irregularityTemplates.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  Templates de Irregularidade
                  <Badge variant="secondary" className="ml-2">{irregularityTemplates.length}</Badge>
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {irregularityTemplates.map((template) => (
                    <Card 
                      key={template.id}
                      className="cursor-pointer hover:border-warning/50 border-warning/30 transition-colors group"
                      onClick={() => navigate(`/templates/${template.id}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0 mt-1" />
                            <div className="min-w-0 flex-1">
                              <h3 className="font-medium truncate group-hover:text-warning transition-colors">
                                {template.name}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                Usuário seleciona o setor
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => openDuplicateDialog(template.id, template.name, e)}
                              title="Duplicar"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/templates/${template.id}`);
                              }}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            {isAdminOrManager && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                                onClick={(e) => openDeleteDialog(template.id, template.name, e)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2 mt-3 text-xs">
                          <Badge variant="outline" className="gap-1 border-warning/50 text-warning">
                            Irregularidade
                          </Badge>
                          <Badge variant="outline" className="gap-1">
                            <Clock className="h-3 w-3" />
                            {template.estimatedTime !== null ? `${template.estimatedTime}min` : "Indefinido"}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o template "{templateToDelete?.name}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Duplicate Dialog */}
      <AlertDialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Duplicar template</AlertDialogTitle>
            <AlertDialogDescription>
              Informe o nome para o novo template.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={duplicateName}
            onChange={(e) => setDuplicateName(e.target.value)}
            placeholder="Nome do novo template"
            className="mt-2"
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter" && duplicateName.trim()) handleConfirmDuplicate(); }}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDuplicate}
              disabled={!duplicateName.trim()}
            >
              Duplicar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
