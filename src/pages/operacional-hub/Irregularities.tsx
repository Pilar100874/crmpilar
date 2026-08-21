import { useEffect, useState, useRef } from "react";
import { AppLayout } from "@/components/operacional-hub/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEstablishment } from "@/hooks/operacional-hub/useEstablishment";
import { useUserRole } from "@/hooks/operacional-hub/useUserRole";
import { Textarea } from "@/components/ui/textarea";
import { IrregularityDispatchDialog } from "@/components/operacional-hub/irregularities/IrregularityDispatchDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Camera, 
  Plus, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ArrowRight,
  Loader2,
  ImageIcon,
  MapPin,
  Pencil,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/operacional-hub/useAuth";
import { useNavigate } from "react-router-dom";

interface Irregularity {
  id: string;
  title: string;
  description: string | null;
  photo_url: string;
  location_description: string | null;
  status: string;
  created_at: string;
  sector: { id: string; name: string; color: string } | null;
  task_execution: { id: string; status: string; photo_after_url: string | null } | null;
}

interface Sector {
  id: string;
  name: string;
  color: string;
}

export default function Irregularities() {
  const [irregularities, setIrregularities] = useState<Irregularity[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const { establishmentId } = useEstablishment();
  const { isAdminOrManager } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creatingTask, setCreatingTask] = useState<string | null>(null);
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);
  const [selectedIrregularity, setSelectedIrregularity] = useState<Irregularity | null>(null);
  const [dispatchDialogOpen, setDispatchDialogOpen] = useState(false);
  const [dispatchIrregularity, setDispatchIrregularity] = useState<Irregularity | null>(null);
  const [editingIrregularity, setEditingIrregularity] = useState<Irregularity | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [irregularityToDelete, setIrregularityToDelete] = useState<Irregularity | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>(() => {
    return localStorage.getItem("irregularities_status_filter") || "all";
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  
  const [form, setForm] = useState({
    title: "",
    description: "",
    sectorId: "",
    locationDescription: "",
  });

  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [irregRes, sectorsRes] = await Promise.all([
        supabase
          .from("op_irregularities")
          .select(`
            id, title, description, photo_url, location_description, status, created_at,
            sectors:op_sectors(id, name, color),
            task_executions:op_task_executions!irregularities_task_execution_id_fkey(id, status, photo_after_url)
          `)
          .order("created_at", { ascending: false }),
        supabase.from("op_sectors").select("*").order("name"),
      ]);

      if (irregRes.data) {
        setIrregularities(
          irregRes.data.map((i: any) => ({
            id: i.id,
            title: i.title,
            description: i.description,
            photo_url: i.photo_url,
            location_description: i.location_description,
            status: i.status,
            created_at: i.created_at,
            sector: i.sectors,
            task_execution: i.task_executions,
          }))
        );
      }
      if (sectorsRes.data) setSectors(sectorsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
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

  const resetForm = () => {
    setForm({ title: "", description: "", sectorId: "", locationDescription: "" });
    setPhotoFile(null);
    setPhotoPreview(null);
    setEditingIrregularity(null);
  };

  const openEditDialog = (item: Irregularity) => {
    setEditingIrregularity(item);
    setForm({
      title: item.title,
      description: item.description || "",
      sectorId: item.sector?.id || "",
      locationDescription: item.location_description || "",
    });
    setPhotoPreview(item.photo_url);
    setPhotoFile(null);
    setEditDialogOpen(true);
  };

  const handleEdit = async () => {
    if (!form.title) {
      toast({ title: "Título é obrigatório", variant: "destructive" });
      return;
    }
    if (!editingIrregularity) return;

    setSaving(true);
    try {
      let photoUrl = editingIrregularity.photo_url;

      // Upload new photo if changed
      if (photoFile) {
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("irregularity-photos")
          .upload(fileName, photoFile);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage
          .from("irregularity-photos")
          .getPublicUrl(fileName);
        photoUrl = publicUrl;
      }

      const { error } = await supabase
        .from("op_irregularities")
        .update({
          title: form.title,
          description: form.description || null,
          photo_url: photoUrl,
          sector_id: form.sectorId || null,
          location_description: form.locationDescription || null,
        })
        .eq("id", editingIrregularity.id);

      if (error) throw error;

      toast({ title: "Irregularidade atualizada!" });
      setEditDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error updating irregularity:", error);
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!irregularityToDelete) return;
    setDeleting(true);
    try {
      // Unlink any task_executions referencing this irregularity
      await supabase
        .from("op_task_executions")
        .update({ irregularity_id: null })
        .eq("irregularity_id", irregularityToDelete.id);

      const { error } = await supabase
        .from("op_irregularities")
        .delete()
        .eq("id", irregularityToDelete.id);

      if (error) throw error;

      toast({ title: "Irregularidade excluída!" });
      fetchData();
    } catch (error) {
      console.error("Error deleting irregularity:", error);
      toast({ title: "Erro ao excluir", variant: "destructive" });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setIrregularityToDelete(null);
    }
  };

  const handleSubmit = async () => {
    if (!form.title || !photoFile) {
      toast({ 
        title: "Dados obrigatórios", 
        description: "Título e foto são obrigatórios",
        variant: "destructive" 
      });
      return;
    }

    setSaving(true);
    try {
      // Upload photo
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("irregularity-photos")
        .upload(fileName, photoFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("irregularity-photos")
        .getPublicUrl(fileName);

      // Create irregularity
      const { error } = await supabase.from("op_irregularities").insert([{
        title: form.title,
        description: form.description || null,
        photo_url: publicUrl,
        sector_id: form.sectorId || null,
        location_description: form.locationDescription || null,
        reported_by_user_id: user?.id,
        establishment_id: establishmentId,
      }]);

      if (error) throw error;

      toast({ title: "Irregularidade registrada!" });
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error saving irregularity:", error);
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTask = async (irregularity: Irregularity) => {
    setCreatingTask(irregularity.id);
    try {
      // Create a task template for the irregularity
      const { data: template, error: templateError } = await supabase
        .from("op_task_templates")
        .insert([{
          name: `Correção: ${irregularity.title}`,
          description: irregularity.description || `Corrigir irregularidade: ${irregularity.title}`,
          sector_id: irregularity.sector?.id || null,
          frequency: "on_demand",
          requires_photo: true,
          requires_before_after_photo: true,
          estimated_time_minutes: 30,
        }])
        .select()
        .single();

      if (templateError) throw templateError;

      // Create task execution
      const { data: execution, error: execError } = await supabase
        .from("op_task_executions")
        .insert([{
          task_template_id: template.id,
          photo_before_url: irregularity.photo_url,
          assigned_user_id: user?.id,
          status: "pending",
        }])
        .select()
        .single();

      if (execError) throw execError;

      // Update irregularity
      const { error: updateError } = await supabase
        .from("op_irregularities")
        .update({ 
          status: "task_created",
          task_execution_id: execution.id,
        })
        .eq("id", irregularity.id);

      if (updateError) throw updateError;

      toast({ 
        title: "Tarefa criada!",
        description: "Vá para Tarefas para executar",
      });
      fetchData();
    } catch (error) {
      console.error("Error creating task:", error);
      toast({ title: "Erro ao criar tarefa", variant: "destructive" });
    } finally {
      setCreatingTask(null);
    }
  };

  const openCompare = (irregularity: Irregularity) => {
    setSelectedIrregularity(irregularity);
    setCompareDialogOpen(true);
  };

  const getStatusInfo = (status: string, hasAfterPhoto: boolean) => {
    switch (status) {
      case "resolved":
        return { label: "Resolvida", color: "bg-success/10 text-success", icon: CheckCircle2 };
      case "task_created":
        return hasAfterPhoto 
          ? { label: "Concluída", color: "bg-success/10 text-success", icon: CheckCircle2 }
          : { label: "Em andamento", color: "bg-warning/10 text-warning", icon: Clock };
      default:
        return { label: "Pendente", color: "bg-critical/10 text-critical", icon: AlertTriangle };
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-[26px] font-semibold tracking-tight text-foreground">Irregularidades</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Registre problemas com foto e crie tarefas de correção
            </p>
          </div>
          <Button 
            onClick={() => setDialogOpen(true)} 
            className="gap-2 rounded-xl"
          >
            <Camera className="h-4 w-4" />
            Registrar Irregularidade
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-card rounded-xl border border-border p-4 text-center">
            <p className="text-2xl font-bold text-critical">
              {irregularities.filter(i => i.status === "pending").length}
            </p>
            <p className="text-sm text-muted-foreground">Pendentes</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4 text-center">
            <p className="text-2xl font-bold text-warning">
              {irregularities.filter(i => i.status === "task_created" && !i.task_execution?.photo_after_url).length}
            </p>
            <p className="text-sm text-muted-foreground">Em andamento</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4 text-center">
            <p className="text-2xl font-bold text-success">
              {irregularities.filter(i => i.status === "resolved" || i.task_execution?.photo_after_url).length}
            </p>
            <p className="text-sm text-muted-foreground">Resolvidas</p>
          </div>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { value: "all", label: "Todas" },
            { value: "pending", label: "Pendentes" },
            { value: "in_progress", label: "Em andamento" },
            { value: "resolved", label: "Resolvidas" },
          ].map(f => (
            <Button
              key={f.value}
              size="sm"
              variant={statusFilter === f.value ? "default" : "outline"}
              className="rounded-lg"
              onClick={() => {
                setStatusFilter(f.value);
                localStorage.setItem("irregularities_status_filter", f.value);
              }}
            >
              {f.label}
            </Button>
          ))}
        </div>

        {/* List */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
            </div>
          ) : (() => {
            const filtered = irregularities.filter(item => {
              if (statusFilter === "all") return true;
              if (statusFilter === "pending") return item.status === "pending";
              if (statusFilter === "in_progress") return item.status === "task_created" && !item.task_execution?.photo_after_url;
              if (statusFilter === "resolved") return item.status === "resolved" || !!item.task_execution?.photo_after_url;
              return true;
            });
            if (filtered.length === 0) return (
              <div className="text-center py-16 rounded-xl border border-border bg-card">
                <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  {irregularities.length === 0 ? "Nenhuma irregularidade registrada" : "Nenhuma irregularidade encontrada com este filtro"}
                </p>
                {irregularities.length === 0 && (
                  <Button onClick={() => setDialogOpen(true)} variant="outline" className="gap-2">
                    <Camera className="h-4 w-4" />
                    Registrar primeira
                  </Button>
                )}
              </div>
            );
            return filtered.map((item) => {
              const statusInfo = getStatusInfo(item.status, !!item.task_execution?.photo_after_url);
              const StatusIcon = statusInfo.icon;
              
              return (
                <div
                  key={item.id}
                  className="bg-card rounded-xl border border-border overflow-hidden"
                >
                  <div className="flex flex-col sm:flex-row">
                    {/* Photo thumbnail */}
                    <div className="sm:w-32 h-32 sm:h-auto flex-shrink-0">
                      <img 
                        src={item.photo_url} 
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {item.sector && (
                              <div 
                                className="h-2 w-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: item.sector.color }}
                              />
                            )}
                            <span className="text-xs text-muted-foreground">
                              {item.sector?.name || "Sem setor"} • {formatDate(item.created_at)}
                            </span>
                          </div>
                          <h3 className="font-semibold text-foreground truncate">{item.title}</h3>
                          {item.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                              {item.description}
                            </p>
                          )}
                          {item.location_description && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                              <MapPin className="h-3 w-3" />
                              {item.location_description}
                            </div>
                          )}
                        </div>
                        
                        <div className={cn("px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1", statusInfo.color)}>
                          <StatusIcon className="h-3 w-3" />
                          {statusInfo.label}
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        {item.status === "pending" && isAdminOrManager && (
                          <Button 
                            size="sm" 
                            onClick={() => {
                              setDispatchIrregularity(item);
                              setDispatchDialogOpen(true);
                            }}
                            className="gap-2 rounded-lg"
                          >
                            <Plus className="h-4 w-4" />
                            Despachar Execução
                          </Button>
                        )}
                        
                        {item.status === "task_created" && item.task_execution && !item.task_execution.photo_after_url && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => navigate(`/tasks/${item.task_execution!.id}`)}
                            className="gap-2 rounded-lg"
                          >
                            <ArrowRight className="h-4 w-4" />
                            Executar Tarefa
                          </Button>
                        )}
                        
                        {item.task_execution?.photo_after_url && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => openCompare(item)}
                            className="gap-2 rounded-lg"
                          >
                            <ImageIcon className="h-4 w-4" />
                            Comparar Antes/Depois
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(item)}
                          className="gap-1 rounded-lg"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Editar
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setIrregularityToDelete(item);
                            setDeleteDialogOpen(true);
                          }}
                          className="gap-1 rounded-lg text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Excluir
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>

      {/* Register Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar Irregularidade</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {/* Photo capture */}
            <div className="space-y-2">
              <Label>Foto da Irregularidade *</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhotoCapture}
              />
              {photoPreview ? (
                <div className="relative">
                  <img 
                    src={photoPreview} 
                    alt="Preview" 
                    className="w-full h-48 object-cover rounded-xl"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute bottom-2 right-2 rounded-lg"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Trocar
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-48 rounded-xl border-2 border-dashed border-primary/50 flex flex-col items-center justify-center gap-2 text-primary hover:bg-primary/5 transition-colors"
                >
                  <Camera className="h-10 w-10" />
                  <span className="font-medium">Tirar foto ou selecionar</span>
                </button>
              )}
            </div>

            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ex: Lixo acumulado no corredor"
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Detalhes adicionais..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Setor</Label>
                <Select
                  value={form.sectorId}
                  onValueChange={(v) => setForm({ ...form, sectorId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {sectors.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button 
              className="w-full rounded-xl" 
              onClick={handleSubmit} 
              disabled={saving || !photoFile || !form.title}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Camera className="mr-2 h-4 w-4" />
                  Registrar
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Compare Dialog */}
      <Dialog open={compareDialogOpen} onOpenChange={setCompareDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Comparação Antes / Depois</DialogTitle>
          </DialogHeader>
          {selectedIrregularity && (
            <div className="space-y-4 mt-4">
              <h3 className="font-semibold text-center">{selectedIrregularity.title}</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-center text-critical">ANTES</p>
                  <img 
                    src={selectedIrregularity.photo_url} 
                    alt="Antes"
                    className="w-full aspect-square object-cover rounded-xl border-2 border-critical/30"
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-center text-success">DEPOIS</p>
                  <img 
                    src={selectedIrregularity.task_execution?.photo_after_url || ""} 
                    alt="Depois"
                    className="w-full aspect-square object-cover rounded-xl border-2 border-success/30"
                  />
                </div>
              </div>
              
              <div className="flex justify-center pt-2">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 text-success">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">Irregularidade Corrigida</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dispatch Dialog */}
      {dispatchIrregularity && (
        <IrregularityDispatchDialog
          open={dispatchDialogOpen}
          onOpenChange={setDispatchDialogOpen}
          irregularity={dispatchIrregularity}
          onDispatched={fetchData}
        />
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => {
        setEditDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Irregularidade</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Foto da Irregularidade</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhotoCapture}
              />
              {photoPreview ? (
                <div className="relative">
                  <img src={photoPreview} alt="Preview" className="w-full h-48 object-cover rounded-xl" />
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute bottom-2 right-2 rounded-lg"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Trocar
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-48 rounded-xl border-2 border-dashed border-primary/50 flex flex-col items-center justify-center gap-2 text-primary hover:bg-primary/5 transition-colors"
                >
                  <Camera className="h-10 w-10" />
                  <span className="font-medium">Selecionar nova foto</span>
                </button>
              )}
            </div>

            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Setor</Label>
                <Select
                  value={form.sectorId}
                  onValueChange={(v) => setForm({ ...form, sectorId: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {sectors.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              className="w-full rounded-xl"
              onClick={handleEdit}
              disabled={saving || !form.title}
            >
              {saving ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</>
              ) : (
                <><Pencil className="mr-2 h-4 w-4" />Salvar Alterações</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Irregularidade</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a irregularidade "{irregularityToDelete?.title}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
