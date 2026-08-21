import { useEffect, useState } from "react";
import { AppLayout } from "@/components/operacional-hub/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEstablishment } from "@/hooks/operacional-hub/useEstablishment";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Plus, Wrench, Trash2, Edit2, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Tool {
  id: string;
  name: string;
  description: string | null;
  sector: { id: string; name: string; color: string } | null;
  is_available: boolean;
  needs_repair: boolean;
  repair_reported_at: string | null;
  repair_notes: string | null;
}

interface Sector {
  id: string;
  name: string;
  color: string;
}

export default function Tools() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();
  const { establishmentId } = useEstablishment();

  const [form, setForm] = useState({
    name: "",
    description: "",
    sectorId: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [toolsRes, sectorsRes] = await Promise.all([
        supabase.from("op_tools").select("*, sectors(id, name, color)").order("name"),
        supabase.from("op_sectors").select("*").order("name"),
      ]);

      if (toolsRes.data) {
        setTools(
          toolsRes.data.map((t: any) => ({
            id: t.id,
            name: t.name,
            description: t.description,
            sector: t.sectors,
            is_available: t.is_available,
            needs_repair: t.needs_repair,
            repair_reported_at: t.repair_reported_at,
            repair_notes: t.repair_notes,
          }))
        );
      }
      if (sectorsRes.data) setSectors(sectorsRes.data);
    } catch (error) {
      console.error("Error fetching tools:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({ name: "", description: "", sectorId: "" });
    setEditingId(null);
  };

  const handleEdit = (tool: Tool) => {
    setForm({
      name: tool.name,
      description: tool.description || "",
      sectorId: tool.sector?.id || "",
    });
    setEditingId(tool.id);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const data = {
        name: form.name,
        description: form.description || null,
        sector_id: form.sectorId || null,
        establishment_id: establishmentId,
      };

      if (editingId) {
        const { error } = await supabase.from("op_tools").update(data).eq("id", editingId);
        if (error) throw error;
        toast({ title: "Ferramenta atualizada!" });
      } else {
        const { error } = await supabase.from("op_tools").insert(data);
        if (error) throw error;
        toast({ title: "Ferramenta cadastrada!" });
      }

      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error saving tool:", error);
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      const { error } = await supabase.from("op_tools").delete().eq("id", deletingId);
      if (error) throw error;
      toast({ title: "Ferramenta excluída!" });
      fetchData();
    } catch (error) {
      console.error("Error deleting tool:", error);
      toast({ title: "Erro ao excluir", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const handleMarkRepaired = async (toolId: string) => {
    try {
      const { error } = await supabase
        .from("op_tools")
        .update({
          needs_repair: false,
          is_available: true,
          repair_reported_at: null,
          repair_notes: null,
          repair_reported_by_user_id: null,
        })
        .eq("id", toolId);
      if (error) throw error;
      toast({ title: "✅ Ferramenta marcada como consertada!" });
      fetchData();
    } catch (error) {
      console.error("Error marking repaired:", error);
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    }
  };

  const needsRepairTools = tools.filter((t) => t.needs_repair);
  const availableTools = tools.filter((t) => !t.needs_repair);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Ferramentas</h1>
          <p className="text-muted-foreground">Cadastro e controle de ferramentas e equipamentos</p>
        </div>

        {/* Repair alerts */}
        {needsRepairTools.length > 0 && (
          <Card className="border-warning/50 bg-warning/5 p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <h3 className="font-semibold text-warning">
                {needsRepairTools.length} ferramenta(s) precisam de conserto
              </h3>
            </div>
            <div className="space-y-2">
              {needsRepairTools.map((tool) => (
                <div
                  key={tool.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-background border border-warning/30"
                >
                  <div>
                    <p className="font-medium">{tool.name}</p>
                    {tool.repair_notes && (
                      <p className="text-sm text-muted-foreground">{tool.repair_notes}</p>
                    )}
                    {tool.repair_reported_at && (
                      <p className="text-xs text-muted-foreground">
                        Reportado em {format(new Date(tool.repair_reported_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 border-success text-success hover:bg-success/10"
                    onClick={() => handleMarkRepaired(tool.id)}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Consertada
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Add button */}
        <div className="flex justify-end">
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nova Ferramenta
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar Ferramenta" : "Nova Ferramenta"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Ex: Aspirador Industrial"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Modelo, marca, observações..."
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Setor</Label>
                  <Select value={form.sectorId || "none"} onValueChange={(v) => setForm({ ...form, sectorId: v === "none" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem setor específico</SelectItem>
                      {sectors.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full" onClick={handleSubmit} disabled={saving}>
                  {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</> : "Salvar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Tools list */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
          </div>
        ) : availableTools.length === 0 && needsRepairTools.length === 0 ? (
          <div className="text-center py-12 rounded-xl border border-border bg-card">
            <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhuma ferramenta cadastrada</p>
          </div>
        ) : (
          <div className="space-y-3">
            {availableTools.map((tool) => (
              <div
                key={tool.id}
                className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card"
              >
                <div
                  className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: (tool.sector?.color || "#3b82f6") + "20" }}
                >
                  <Wrench className="h-5 w-5" style={{ color: tool.sector?.color || "#3b82f6" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{tool.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {tool.sector?.name || "Sem setor"} 
                    {tool.description && ` • ${tool.description}`}
                  </p>
                </div>
                <Badge variant={tool.is_available ? "default" : "destructive"} className="shrink-0">
                  {tool.is_available ? "Disponível" : "Indisponível"}
                </Badge>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(tool)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeletingId(tool.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir ferramenta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A ferramenta será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}