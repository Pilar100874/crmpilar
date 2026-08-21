import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEstablishment } from "@/hooks/useEstablishment";
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
import { Plus, Briefcase, Trash2, Edit2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface JobFunction {
  id: string;
  name: string;
  description: string | null;
  sector: { id: string; name: string; color: string } | null;
}

interface Sector {
  id: string;
  name: string;
  color: string;
}

export default function Functions() {
  const [functions, setFunctions] = useState<JobFunction[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const { establishmentId } = useEstablishment();
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [form, setForm] = useState({
    name: "",
    description: "",
    sectorId: "",
  });

  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [functionsRes, sectorsRes] = await Promise.all([
        supabase
          .from("job_functions")
          .select(`*, sectors (id, name, color)`)
          .order("name"),
        supabase.from("sectors").select("*").order("name"),
      ]);

      if (functionsRes.data) {
        setFunctions(
          functionsRes.data.map((f) => ({
            id: f.id,
            name: f.name,
            description: f.description,
            sector: f.sectors,
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

  const resetForm = () => {
    setForm({ name: "", description: "", sectorId: "" });
    setEditingId(null);
  };

  const handleEdit = (fn: JobFunction) => {
    setForm({
      name: fn.name,
      description: fn.description || "",
      sectorId: fn.sector?.id || "",
    });
    setEditingId(fn.id);
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
        const { error } = await supabase.from("job_functions").update(data).eq("id", editingId);
        if (error) throw error;
        toast({ title: "Função atualizada!" });
      } else {
        const { error } = await supabase.from("job_functions").insert(data);
        if (error) throw error;
        toast({ title: "Função criada!" });
      }

      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error saving function:", error);
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta função?")) return;

    try {
      const { error } = await supabase.from("job_functions").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Função excluída!" });
      fetchData();
    } catch (error) {
      console.error("Error deleting function:", error);
      toast({ title: "Erro ao excluir", variant: "destructive" });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">Funções</h1>
            <p className="text-muted-foreground">
              Gerencie as funções de trabalho
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nova Função
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "Editar Função" : "Nova Função"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Nome da função"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Input
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Descrição"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Setor</Label>
                  <Select value={form.sectorId} onValueChange={(v) => setForm({ ...form, sectorId: v })}>
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
                <Button className="w-full" onClick={handleSubmit} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* List */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <div className="col-span-full text-center py-12">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
            </div>
          ) : functions.length === 0 ? (
            <div className="col-span-full text-center py-12 rounded-xl border border-border bg-card">
              <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhuma função cadastrada</p>
            </div>
          ) : (
            functions.map((fn) => (
              <div
                key={fn.id}
                className="p-4 rounded-xl border border-border bg-card"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: (fn.sector?.color || "#3b82f6") + "20" }}
                    >
                      <Briefcase className="h-5 w-5" style={{ color: fn.sector?.color || "#3b82f6" }} />
                    </div>
                    <div>
                      <p className="font-medium">{fn.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {fn.sector?.name || "Sem setor"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(fn)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(fn.id)}>
                      <Trash2 className="h-4 w-4 text-critical" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}
