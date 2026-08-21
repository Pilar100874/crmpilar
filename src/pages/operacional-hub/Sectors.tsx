import { useEffect, useState } from "react";
import { AppLayout } from "@/components/operacional-hub/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Building2, Trash2, Edit2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEstablishment } from "@/hooks/operacional-hub/useEstablishment";

interface Sector {
  id: string;
  name: string;
  description: string | null;
  color: string;
}

export default function Sectors() {
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const { establishmentId } = useEstablishment();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [form, setForm] = useState({
    name: "",
    description: "",
    color: "#3b82f6",
  });

  const { toast } = useToast();

  useEffect(() => {
    fetchSectors();
  }, []);

  const fetchSectors = async () => {
    try {
      const { data, error } = await supabase
        .from("op_sectors")
        .select("*")
        .order("name");
      
      if (error) throw error;
      setSectors(data || []);
    } catch (error) {
      console.error("Error fetching sectors:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({ name: "", description: "", color: "#3b82f6" });
    setEditingId(null);
  };

  const handleEdit = (sector: Sector) => {
    setForm({
      name: sector.name,
      description: sector.description || "",
      color: sector.color,
    });
    setEditingId(sector.id);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from("op_sectors")
          .update({ name: form.name, description: form.description || null, color: form.color })
          .eq("id", editingId);
        if (error) throw error;
        toast({ title: "Setor atualizado!" });
      } else {
        const { error } = await supabase
          .from("op_sectors")
          .insert({ name: form.name, description: form.description || null, color: form.color, establishment_id: establishmentId });
        if (error) throw error;
        toast({ title: "Setor criado!" });
      }

      setDialogOpen(false);
      resetForm();
      fetchSectors();
    } catch (error) {
      console.error("Error saving sector:", error);
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este setor?")) return;

    try {
      const { error } = await supabase.from("op_sectors").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Setor excluído!" });
      fetchSectors();
    } catch (error) {
      console.error("Error deleting sector:", error);
      toast({ title: "Erro ao excluir", variant: "destructive" });
    }
  };

  const colors = [
    "#22c55e", "#3b82f6", "#f59e0b", "#ec4899", "#8b5cf6", 
    "#14b8a6", "#f97316", "#ef4444", "#6366f1", "#84cc16"
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-[26px] font-semibold tracking-tight">Setores</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Gerencie os setores da empresa
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Setor
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "Editar Setor" : "Novo Setor"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Nome do setor"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Descrição do setor"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cor</Label>
                  <div className="flex flex-wrap gap-2">
                    {colors.map((color) => (
                      <button
                        key={color}
                        onClick={() => setForm({ ...form, color })}
                        className={`h-8 w-8 rounded-full transition-all ${
                          form.color === color 
                            ? "ring-2 ring-offset-2 ring-primary ring-offset-background" 
                            : "hover:scale-110"
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
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
          ) : sectors.length === 0 ? (
            <div className="col-span-full text-center py-12 rounded-xl border border-border bg-card">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Nenhum setor cadastrado</p>
            </div>
          ) : (
            sectors.map((sector) => (
              <div
                key={sector.id}
                className="p-4 rounded-xl border border-border bg-card"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: sector.color + "20" }}
                    >
                      <Building2 className="h-5 w-5" style={{ color: sector.color }} />
                    </div>
                    <div>
                      <p className="font-medium">{sector.name}</p>
                      {sector.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {sector.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(sector)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(sector.id)}>
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
