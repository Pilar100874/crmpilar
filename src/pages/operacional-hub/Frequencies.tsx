import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/operacional-hub/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useEstablishment } from "@/hooks/operacional-hub/useEstablishment";

interface Frequency {
  id: string;
  name: string;
  label: string;
  description: string | null;
  interval_days: number | null;
  is_system: boolean;
  is_active: boolean;
}

interface TemplateUsage {
  id: string;
  name: string;
}

export default function Frequencies() {
  const queryClient = useQueryClient();
  const { establishmentId } = useEstablishment();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFrequency, setEditingFrequency] = useState<Frequency | null>(null);
  const [form, setForm] = useState({ label: "", description: "", interval_days: "" });
  const [blockingTemplates, setBlockingTemplates] = useState<TemplateUsage[]>([]);
  const [blockingDialogOpen, setBlockingDialogOpen] = useState(false);
  const [blockingAction, setBlockingAction] = useState<string>("");

  const { data: frequencies = [], isLoading } = useQuery({
    queryKey: ["frequencies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("op_frequencies")
        .select("*")
        .order("interval_days", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data as Frequency[];
    },
  });

  // Fetch template usage count per frequency name
  const { data: templateUsageMap = {} } = useQuery({
    queryKey: ["frequency-template-usage"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("op_task_templates")
        .select("id, name, frequency");
      if (error) throw error;
      const map: Record<string, TemplateUsage[]> = {};
      for (const t of data || []) {
        if (!map[t.frequency]) map[t.frequency] = [];
        map[t.frequency].push({ id: t.id, name: t.name });
      }
      return map;
    },
  });

  const getTemplatesUsingFrequency = (freqName: string): TemplateUsage[] => {
    return templateUsageMap[freqName] || [];
  };

  const saveMutation = useMutation({
    mutationFn: async (values: typeof form) => {
      const name = editingFrequency
        ? editingFrequency.name
        : values.label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");

      const payload = {
        name,
        label: values.label,
        description: values.description || null,
        interval_days: values.interval_days ? parseInt(values.interval_days) : null,
        establishment_id: editingFrequency ? undefined : establishmentId,
      };

      if (editingFrequency) {
        const { error } = await supabase
          .from("op_frequencies")
          .update(payload)
          .eq("id", editingFrequency.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("op_frequencies")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["frequencies"] });
      toast.success(editingFrequency ? "Frequência atualizada!" : "Frequência criada!");
      resetForm();
    },
    onError: (err: any) => {
      if (err.message?.includes("duplicate")) {
        toast.error("Já existe uma frequência com esse nome.");
      } else {
        toast.error("Erro ao salvar frequência.");
      }
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("op_frequencies")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["frequencies"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("op_frequencies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["frequencies"] });
      toast.success("Frequência removida!");
    },
    onError: () => toast.error("Erro ao remover frequência."),
  });

  const resetForm = () => {
    setForm({ label: "", description: "", interval_days: "" });
    setEditingFrequency(null);
    setDialogOpen(false);
  };

  const openEdit = (freq: Frequency) => {
    setEditingFrequency(freq);
    setForm({
      label: freq.label,
      description: freq.description || "",
      interval_days: freq.interval_days?.toString() || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.label.trim()) {
      toast.error("Informe o nome da frequência.");
      return;
    }
    saveMutation.mutate(form);
  };

  const handleDeleteOrToggle = (freq: Frequency, action: "delete" | "deactivate") => {
    const templates = getTemplatesUsingFrequency(freq.name);
    if (templates.length > 0) {
      setBlockingTemplates(templates);
      setBlockingAction(action === "delete" ? "excluir" : "desativar");
      setBlockingDialogOpen(true);
      return;
    }
    if (action === "delete") {
      if (confirm("Remover esta frequência?")) {
        deleteMutation.mutate(freq.id);
      }
    } else {
      toggleMutation.mutate({ id: freq.id, is_active: false });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Frequências</h1>
            <p className="text-muted-foreground">Gerencie os tipos de frequência para templates de tarefas</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Nova Frequência</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingFrequency ? "Editar Frequência" : "Nova Frequência"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    value={form.label}
                    onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                    placeholder="Ex: Quinzenal"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Intervalo em dias</Label>
                  <Input
                    type="number"
                    value={form.interval_days}
                    onChange={(e) => setForm((f) => ({ ...f, interval_days: e.target.value }))}
                    placeholder="Ex: 15"
                  />
                  <p className="text-xs text-muted-foreground">Deixe vazio para frequências sob demanda.</p>
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Descrição opcional"
                    rows={2}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>
                  <Button type="submit" disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Blocking templates dialog */}
        <Dialog open={blockingDialogOpen} onOpenChange={setBlockingDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Não é possível {blockingAction}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Esta frequência está sendo utilizada nos seguintes templates e não pode ser {blockingAction === "excluir" ? "excluída" : "desativada"}:
              </p>
              <ul className="space-y-1">
                {blockingTemplates.map((t) => (
                  <li key={t.id} className="text-sm flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">Template</Badge>
                    {t.name}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">
                Remova ou altere a frequência desses templates antes de continuar.
              </p>
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setBlockingDialogOpen(false)}>Entendi</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Frequências Cadastradas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-center py-8">Carregando...</p>
            ) : frequencies.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Nenhuma frequência cadastrada.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Intervalo</TableHead>
                    <TableHead>Em uso</TableHead>
                    <TableHead>Ativa</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {frequencies.map((freq) => {
                    const usedIn = getTemplatesUsingFrequency(freq.name);
                    const isUsed = usedIn.length > 0;
                    return (
                      <TableRow key={freq.id}>
                        <TableCell className="font-medium">{freq.label}</TableCell>
                        <TableCell>
                          {freq.interval_days ? `${freq.interval_days} dias` : "—"}
                        </TableCell>
                        <TableCell>
                          {isUsed ? (
                            <Badge variant="secondary">{usedIn.length} template{usedIn.length > 1 ? "s" : ""}</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Nenhum</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={freq.is_active}
                            onCheckedChange={(checked) => {
                              if (!checked) {
                                handleDeleteOrToggle(freq, "deactivate");
                              } else {
                                toggleMutation.mutate({ id: freq.id, is_active: true });
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" onClick={() => openEdit(freq)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() => handleDeleteOrToggle(freq, "delete")}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
