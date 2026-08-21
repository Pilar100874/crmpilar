import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Camera, 
  AlertTriangle,
  Loader2,
  Send,
  MapPin,
  Clock,
  Shield,
  Zap
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";

interface IrregularityTemplate {
  id: string;
  name: string;
  description: string | null;
  estimatedTime: number;
  locationPhotos: string[];
}

interface Sector {
  id: string;
  name: string;
  color: string;
}

interface UserProfile {
  userId: string;
  fullName: string;
}

type Priority = "critical" | "high" | "medium" | "low";

const priorityConfig: Record<Priority, { label: string; description: string; color: string; value: number }> = {
  critical: { 
    label: "Crítica", 
    description: "Resolver imediatamente", 
    color: "bg-red-500",
    value: 10
  },
  high: { 
    label: "Alta", 
    description: "Resolver hoje", 
    color: "bg-orange-500",
    value: 8
  },
  medium: { 
    label: "Média", 
    description: "Resolver esta semana", 
    color: "bg-yellow-500",
    value: 5
  },
  low: { 
    label: "Baixa", 
    description: "Resolver quando possível", 
    color: "bg-gray-400",
    value: 2
  },
};

export default function ReportIrregularity() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { isAdminOrManager, loading: roleLoading } = useUserRole();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [templates, setTemplates] = useState<IrregularityTemplate[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedSectorId, setSelectedSectorId] = useState("");
  const [description, setDescription] = useState("");
  const [locationDescription, setLocationDescription] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  
  // Manager/Admin specific fields
  const [priority, setPriority] = useState<Priority>("medium");
  const [assignedUserId, setAssignedUserId] = useState("");
  const [estimatedTime, setEstimatedTime] = useState(30);
  const [customTitle, setCustomTitle] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [templatesRes, sectorsRes, usersRes] = await Promise.all([
        supabase
          .from("task_templates")
          .select("id, name, description, estimated_time_minutes, location_photos")
          .eq("is_irregularity_template", true)
          .eq("is_active", true)
          .order("name"),
        supabase.from("sectors").select("*").order("name"),
        supabase.from("profiles").select("user_id, full_name").eq("is_active", true).order("full_name"),
      ]);

      if (templatesRes.data) {
        setTemplates(
          templatesRes.data.map((t: any) => ({
            id: t.id,
            name: t.name,
            description: t.description,
            estimatedTime: t.estimated_time_minutes || 30,
            locationPhotos: t.location_photos || [],
          }))
        );
      }
      if (sectorsRes.data) setSectors(sectorsRes.data);
      if (usersRes.data) {
        setUsers(usersRes.data.map((u: any) => ({ userId: u.user_id, fullName: u.full_name })));
      }
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

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  const canSubmit = () => {
    // For admin/manager, template is optional (they can create ad-hoc tasks)
    if (isAdminOrManager) {
      return selectedSectorId && (selectedTemplateId || customTitle);
    }
    // For workers, template and photo are required
    return selectedTemplateId && selectedSectorId && photoFile;
  };

  const handleSubmit = async () => {
    if (!canSubmit() || !user) return;

    setSaving(true);
    try {
      // Upload photo if provided
      let photoUrl = "";
      if (photoFile) {
        const fileName = `irregularity/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("irregularity-photos")
          .upload(fileName, photoFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("irregularity-photos")
          .getPublicUrl(fileName);
        
        photoUrl = publicUrl;
      }

      const today = new Date().toISOString().split("T")[0];
      const taskTitle = customTitle || selectedTemplate?.name || "Irregularidade Reportada";

      // For admin/manager creating an ad-hoc task without template
      if (isAdminOrManager && !selectedTemplateId && customTitle) {
        // Create ad-hoc task execution (we'll use a generic template or create directly)
        // First, we need to find or create a generic irregularity template
        let templateId = selectedTemplateId;
        
        if (!templateId) {
          // Find the first irregularity template to use as base
          const { data: existingTemplate } = await supabase
            .from("task_templates")
            .select("id")
            .eq("is_irregularity_template", true)
            .limit(1)
            .single();
          
          if (existingTemplate) {
            templateId = existingTemplate.id;
          } else {
            // Create a generic template if none exists
            const { data: newTemplate, error: templateError } = await supabase
              .from("task_templates")
              .insert([{
                name: "Tarefa Pontual",
                description: "Tarefa criada por gestor para resolver problema pontual",
                is_irregularity_template: true,
                frequency: "on_demand",
                requires_photo: false,
                estimated_time_minutes: 30,
                is_active: true,
              }])
              .select("id")
              .single();
            
            if (templateError) throw templateError;
            templateId = newTemplate.id;
          }
        }

        // Create task execution with priority
        const { error: taskError } = await supabase
          .from("task_executions")
          .insert([{
            task_template_id: templateId,
            target_sector_id: selectedSectorId,
            assigned_user_id: assignedUserId || null,
            scheduled_date: today,
            status: "pending",
            priority_score: priorityConfig[priority].value * 10,
            photo_before_url: photoUrl || null,
            observations: `📌 ${taskTitle}\n${locationDescription ? `📍 Local: ${locationDescription}\n` : ""}${description ? `📝 ${description}` : ""}`,
          }]);

        if (taskError) throw taskError;

        // Create irregularity record
        await supabase
          .from("irregularities")
          .insert([{
            title: taskTitle,
            description: description || null,
            location_description: locationDescription || null,
            photo_url: photoUrl || null,
            sector_id: selectedSectorId,
            reported_by_user_id: user.id,
            status: "pending",
          }]);

        toast({
          title: "Tarefa criada!",
          description: `Prioridade: ${priorityConfig[priority].label}`,
        });
      } else {
        // Standard flow for workers or admin/manager using a template
        const { error: taskError } = await supabase
          .from("task_executions")
          .insert([{
            task_template_id: selectedTemplateId,
            target_sector_id: selectedSectorId,
            assigned_user_id: isAdminOrManager && assignedUserId ? assignedUserId : null,
            scheduled_date: today,
            status: "pending",
            priority_score: priorityConfig[priority].value * 10,
            photo_before_url: photoUrl,
            observations: `${locationDescription ? `Local: ${locationDescription}\n` : ""}${description}`,
          }]);

        if (taskError) throw taskError;

        // Also create an irregularity record for tracking
        await supabase
          .from("irregularities")
          .insert([{
            title: selectedTemplate?.name || "Irregularidade Reportada",
            description: description || null,
            location_description: locationDescription || null,
            photo_url: photoUrl,
            sector_id: selectedSectorId,
            reported_by_user_id: user.id,
            status: "pending",
          }]);

        toast({
          title: "Irregularidade reportada!",
          description: isAdminOrManager 
            ? `Prioridade: ${priorityConfig[priority].label}` 
            : "O setor responsável foi notificado",
        });
      }

      navigate("/tasks");
    } catch (error) {
      console.error("Error reporting irregularity:", error);
      toast({
        title: "Erro",
        description: "Não foi possível reportar a irregularidade",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading || roleLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin h-10 w-10 border-3 border-primary border-t-transparent rounded-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6 pb-28">
        {/* Back button */}
        <button 
          onClick={() => navigate("/tasks")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Voltar</span>
        </button>

        {/* Header */}
        <div className="bg-warning/10 border border-warning/30 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="h-6 w-6 text-warning" />
            <h1 className="text-xl font-bold text-foreground">
              {isAdminOrManager ? "Criar Tarefa / Reportar Irregularidade" : "Reportar Irregularidade"}
            </h1>
            {isAdminOrManager && (
              <Badge variant="outline" className="ml-auto border-primary/50 text-primary">
                <Shield className="h-3 w-3 mr-1" />
                Gestor
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            {isAdminOrManager 
              ? "Crie uma tarefa pontual ou reporte um problema para o setor responsável"
              : "Informe um problema para que o setor responsável possa resolver"}
          </p>
        </div>

        {/* Admin/Manager: Ad-hoc task creation */}
        {isAdminOrManager && (
          <Card className="border-primary/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Tarefa Pontual
              </CardTitle>
              <CardDescription>
                Crie uma tarefa personalizada sem usar um template
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Título da Tarefa</Label>
                <Input
                  placeholder="Ex: Consertar porta do banheiro 2º andar"
                  value={customTitle}
                  onChange={(e) => {
                    setCustomTitle(e.target.value);
                    if (e.target.value) setSelectedTemplateId("");
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Se preenchido, ignora o template selecionado abaixo
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Template Selection */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">
              {isAdminOrManager ? "Ou use um Template" : "Tipo de Irregularidade"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{isAdminOrManager ? "Template (opcional)" : "Tipo de Irregularidade *"}</Label>
              <Select 
                value={selectedTemplateId} 
                onValueChange={(v) => {
                  setSelectedTemplateId(v);
                  if (v) setCustomTitle("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {templates.length === 0 ? (
                    <SelectItem value="none" disabled>Nenhum template disponível</SelectItem>
                  ) : (
                    templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {selectedTemplate?.description && (
                <p className="text-sm text-muted-foreground">
                  {selectedTemplate.description}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Setor Responsável *</Label>
              <Select value={selectedSectorId} onValueChange={setSelectedSectorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o setor que deve receber" />
                </SelectTrigger>
                <SelectContent>
                  {sectors.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="h-3 w-3 rounded-full" 
                          style={{ backgroundColor: s.color }}
                        />
                        {s.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Priority Selection - available to all users */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Prioridade *</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {(Object.keys(priorityConfig) as Priority[]).map((p) => {
                const config = priorityConfig[p];
                const isSelected = priority === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      isSelected 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-muted-foreground/50"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`h-3 w-3 rounded-full ${config.color}`} />
                      <span className="font-medium">{config.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {config.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Admin/Manager: Assignment & Time */}
        {isAdminOrManager && (
          <Card className="border-primary/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Configurações de Gestão
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Assigned User */}
              <div className="space-y-2">
                <Label>Atribuir a</Label>
                <Select 
                  value={assignedUserId || "none"} 
                  onValueChange={(v) => setAssignedUserId(v === "none" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Qualquer pessoa do setor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Qualquer pessoa do setor</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.userId} value={u.userId}>
                        {u.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Estimated Time */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Tempo Estimado
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={estimatedTime}
                    onChange={(e) => setEstimatedTime(parseInt(e.target.value) || 30)}
                    className="w-24"
                    min={1}
                  />
                  <span className="text-muted-foreground">minutos</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Location & Description */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Detalhes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Localização</Label>
              <Input
                placeholder="Descreva onde está o problema (ex: Banheiro 2º andar)"
                value={locationDescription}
                onChange={(e) => setLocationDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição adicional</Label>
              <Textarea
                placeholder="Descreva o problema com mais detalhes..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Photo */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Foto da Irregularidade
              {!isAdminOrManager && (
                <span className="text-xs text-critical ml-auto">* Obrigatória</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {photoPreview ? (
              <div className="relative">
                <img
                  src={photoPreview}
                  alt="Irregularidade"
                  className="w-full rounded-xl border-2 border-warning/30"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute bottom-3 right-3 rounded-lg"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Trocar
                </Button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-40 rounded-xl border-2 border-dashed border-muted-foreground/30 text-muted-foreground hover:border-warning/50 hover:text-warning hover:bg-warning/5 flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Camera className="h-8 w-8" />
                <span className="font-medium">
                  {isAdminOrManager ? "Adicionar foto (opcional)" : "Tirar foto do problema"}
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
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t border-border lg:left-72">
          <div className="max-w-2xl mx-auto">
            <Button
              size="lg"
              onClick={handleSubmit}
              disabled={!canSubmit() || saving}
              className="w-full h-14 rounded-xl gap-2 text-lg font-semibold bg-warning hover:bg-warning/90 text-warning-foreground"
            >
              {saving ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-5 w-5" />
                  {isAdminOrManager ? "Criar Tarefa" : "Reportar Irregularidade"}
                </>
              )}
            </Button>
            {!canSubmit() && (
              <p className="text-center text-sm text-muted-foreground mt-2">
                {isAdminOrManager 
                  ? "Informe o setor e um título ou template"
                  : "Preencha todos os campos obrigatórios"}
              </p>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
