import { useEffect, useState } from "react";
import { AppLayout } from "@/components/operacional-hub/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEstablishment } from "@/hooks/operacional-hub/useEstablishment";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  Cloud, 
  CloudRain, 
  AlertTriangle, 
  ShieldAlert, 
  Wrench,
  Plus,
  Trash2,
  Power,
  PowerOff,
  Loader2,
  Info,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/operacional-hub/useAuth";
import { format } from "date-fns";

interface Condition {
  id: string;
  type: string;
  name: string;
  description: string | null;
  severity: string;
  affects_outdoor_tasks: boolean;
  is_active: boolean;
  started_at: string;
  expected_end_at: string | null;
}

interface Sector {
  id: string;
  name: string;
}

const typeConfig: Record<string, { icon: any; label: string; color: string }> = {
  weather: { icon: CloudRain, label: "Clima", color: "text-blue-500" },
  access: { icon: ShieldAlert, label: "Acesso", color: "text-orange-500" },
  safety: { icon: AlertTriangle, label: "Segurança", color: "text-red-500" },
  equipment: { icon: Wrench, label: "Equipamento", color: "text-yellow-500" },
  other: { icon: Info, label: "Outro", color: "text-muted-foreground" },
};

const severityConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  info: { label: "Informativo", color: "text-blue-600", bgColor: "bg-blue-100" },
  warning: { label: "Atenção", color: "text-warning", bgColor: "bg-warning/10" },
  critical: { label: "Crítico", color: "text-critical", bgColor: "bg-critical/10" },
};

export default function Conditions() {
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState({
    type: "weather",
    name: "",
    description: "",
    severity: "warning",
    affectsOutdoor: true,
    affectedSectors: [] as string[],
    expectedEndAt: "",
  });

  const { toast } = useToast();
  const { establishmentId } = useEstablishment();
  const { user } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [conditionsRes, sectorsRes] = await Promise.all([
        supabase
          .from("op_operational_conditions")
          .select("*")
          .order("is_active", { ascending: false })
          .order("created_at", { ascending: false }),
        supabase.from("op_sectors").select("id, name").order("name"),
      ]);

      if (conditionsRes.data) setConditions(conditionsRes.data);
      if (sectorsRes.data) setSectors(sectorsRes.data);
    } catch (error) {
      console.error("Error fetching conditions:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      type: "weather",
      name: "",
      description: "",
      severity: "warning",
      affectsOutdoor: true,
      affectedSectors: [],
      expectedEndAt: "",
    });
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("op_operational_conditions").insert([{
        type: form.type,
        name: form.name,
        description: form.description || null,
        severity: form.severity,
        affects_outdoor_tasks: form.affectsOutdoor,
        affected_sectors: form.affectedSectors,
        expected_end_at: form.expectedEndAt || null,
        created_by_user_id: user?.id,
        establishment_id: establishmentId,
      }]);

      if (error) throw error;

      toast({ title: "Condição registrada!" });
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error saving condition:", error);
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("op_operational_conditions")
        .update({ is_active: !isActive })
        .eq("id", id);

      if (error) throw error;
      
      toast({ 
        title: isActive ? "Condição desativada" : "Condição ativada",
      });
      fetchData();
    } catch (error) {
      console.error("Error toggling condition:", error);
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta condição?")) return;

    try {
      const { error } = await supabase
        .from("op_operational_conditions")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      toast({ title: "Condição excluída!" });
      fetchData();
    } catch (error) {
      console.error("Error deleting condition:", error);
      toast({ title: "Erro ao excluir", variant: "destructive" });
    }
  };

  const activeConditions = conditions.filter(c => c.is_active);
  const inactiveConditions = conditions.filter(c => !c.is_active);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-[26px] font-semibold tracking-tight text-foreground">Condições Operacionais</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Gerencie condições climáticas, de acesso e segurança que afetam as tarefas
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="gap-2 rounded-xl">
            <Plus className="h-4 w-4" />
            Nova Condição
          </Button>
        </div>

        {/* Active conditions alert */}
        {activeConditions.length > 0 && (
          <div className="bg-warning/10 border border-warning/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <span className="font-semibold text-warning">
                {activeConditions.length} condição(ões) ativa(s)
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Tarefas afetadas terão prioridade reduzida ou serão bloqueadas automaticamente.
            </p>
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Object.entries(typeConfig).map(([type, config]) => {
            const Icon = config.icon;
            const count = conditions.filter(c => c.type === type && c.is_active).length;
            return (
              <div key={type} className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={cn("h-5 w-5", config.color)} />
                  <span className="text-sm font-medium">{config.label}</span>
                </div>
                <p className="text-2xl font-bold">{count}</p>
              </div>
            );
          })}
        </div>

        {/* Conditions list */}
        <div className="space-y-4">
          <h2 className="font-semibold text-lg">Condições Ativas</h2>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
            </div>
          ) : activeConditions.length === 0 ? (
            <div className="text-center py-8 rounded-xl border border-border bg-card">
              <Cloud className="h-12 w-12 text-success mx-auto mb-3" />
              <p className="font-medium text-success">Nenhuma condição ativa</p>
              <p className="text-sm text-muted-foreground">Todas as tarefas podem ser executadas normalmente</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeConditions.map((condition) => {
                const typeInfo = typeConfig[condition.type] || typeConfig.other;
                const severityInfo = severityConfig[condition.severity] || severityConfig.warning;
                const TypeIcon = typeInfo.icon;
                
                return (
                  <div
                    key={condition.id}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-xl border",
                      condition.severity === "critical" 
                        ? "border-critical/50 bg-critical/5"
                        : "border-warning/50 bg-warning/5"
                    )}
                  >
                    <div className={cn("p-3 rounded-xl", severityInfo.bgColor)}>
                      <TypeIcon className={cn("h-6 w-6", typeInfo.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">{condition.name}</h3>
                        <span className={cn("text-xs px-2 py-0.5 rounded-full", severityInfo.bgColor, severityInfo.color)}>
                          {severityInfo.label}
                        </span>
                      </div>
                      {condition.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">{condition.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        {condition.affects_outdoor_tasks && (
                          <span className="flex items-center gap-1">
                            <CloudRain className="h-3 w-3" />
                            Afeta área externa
                          </span>
                        )}
                        {condition.expected_end_at && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Até {format(new Date(condition.expected_end_at), "dd/MM HH:mm")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => toggleActive(condition.id, condition.is_active)}
                        className="text-success border-success/50"
                      >
                        <PowerOff className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(condition.id)}
                      >
                        <Trash2 className="h-4 w-4 text-critical" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Inactive conditions */}
          {inactiveConditions.length > 0 && (
            <>
              <h2 className="font-semibold text-lg mt-8">Histórico</h2>
              <div className="space-y-2">
                {inactiveConditions.slice(0, 5).map((condition) => {
                  const typeInfo = typeConfig[condition.type] || typeConfig.other;
                  const TypeIcon = typeInfo.icon;
                  
                  return (
                    <div
                      key={condition.id}
                      className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/30 opacity-60"
                    >
                      <TypeIcon className={cn("h-5 w-5", typeInfo.color)} />
                      <span className="flex-1 truncate">{condition.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(condition.started_at), "dd/MM/yyyy")}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleActive(condition.id, condition.is_active)}
                      >
                        <Power className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Condição Operacional</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weather">🌧️ Clima</SelectItem>
                    <SelectItem value="access">🚧 Acesso</SelectItem>
                    <SelectItem value="safety">⚠️ Segurança</SelectItem>
                    <SelectItem value="equipment">🔧 Equipamento</SelectItem>
                    <SelectItem value="other">ℹ️ Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Severidade</Label>
                <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Informativo</SelectItem>
                    <SelectItem value="warning">Atenção</SelectItem>
                    <SelectItem value="critical">Crítico (bloqueia tarefas)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Chuva forte"
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Detalhes sobre a condição..."
                rows={2}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
              <div>
                <Label>Afeta tarefas externas</Label>
                <p className="text-xs text-muted-foreground">Reduz prioridade de tarefas ao ar livre</p>
              </div>
              <Switch
                checked={form.affectsOutdoor}
                onCheckedChange={(v) => setForm({ ...form, affectsOutdoor: v })}
              />
            </div>

            <div className="space-y-2">
              <Label>Previsão de término (opcional)</Label>
              <Input
                type="datetime-local"
                value={form.expectedEndAt}
                onChange={(e) => setForm({ ...form, expectedEndAt: e.target.value })}
              />
            </div>

            <Button className="w-full rounded-xl" onClick={handleSubmit} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Registrar Condição"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
