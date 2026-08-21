import { useEffect, useState, useMemo } from "react";
import { AppLayout } from "@/components/operacional-hub/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEstablishment } from "@/hooks/operacional-hub/useEstablishment";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus, Package, Trash2, Edit2, Loader2, AlertTriangle,
  ArrowUpCircle, ArrowDownCircle, History, Bell
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/operacional-hub/useAuth";
import { MaterialForecast } from "@/components/operacional-hub/dashboard/MaterialForecast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Material {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  minStock: number;
  sector: { id: string; name: string; color: string } | null;
}

interface Sector {
  id: string;
  name: string;
  color: string;
}

interface Movement {
  id: string;
  material_id: string;
  movement_type: "entry" | "exit";
  quantity: number;
  reason: string | null;
  notes: string | null;
  user_id: string | null;
  created_at: string;
  material_name?: string;
}

const units = ["un", "kg", "L", "m", "m²", "m³", "pç", "cx", "pct"];

const movementReasons = {
  entry: ["Compra", "Devolução", "Transferência recebida", "Ajuste de inventário", "Doação", "Outro"],
  exit: ["Consumo em tarefa", "Perda/Avaria", "Transferência enviada", "Ajuste de inventário", "Descarte", "Outro"],
};

export default function Materials() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [stockTotals, setStockTotals] = useState<Record<string, { entries: number; exits: number }>>({});
  const [loading, setLoading] = useState(true);
  const [movementsLoading, setMovementsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [movementDialogOpen, setMovementDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("cadastro");
  const [deletingMovementId, setDeletingMovementId] = useState<string | null>(null);

  const { user } = useAuth();
  const { toast } = useToast();
  const { establishmentId } = useEstablishment();

  const [form, setForm] = useState({
    name: "",
    unit: "un",
    minStock: 0,
    sectorId: "",
  });

  const [movForm, setMovForm] = useState({
    materialId: "",
    movementType: "entry" as "entry" | "exit",
    quantity: "",
    reason: "",
    notes: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeTab === "movimentacao") fetchMovements();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      const [materialsRes, sectorsRes, movTotalsRes] = await Promise.all([
        supabase.from("op_materials").select(`*, sectors:op_sectors(id, name, color)`).order("name"),
        supabase.from("op_sectors").select("*").order("name"),
        supabase.from("op_material_movements").select("material_id, movement_type, quantity"),
      ]);

      if (materialsRes.data) {
        setMaterials(
          materialsRes.data.map((m: any) => ({
            id: m.id,
            name: m.name,
            unit: m.unit,
            currentStock: Number(m.current_stock),
            minStock: Number(m.min_stock),
            sector: m.sectors,
          }))
        );
      }
      if (sectorsRes.data) setSectors(sectorsRes.data);

      // Compute stock totals from movements
      const totals: Record<string, { entries: number; exits: number }> = {};
      for (const mov of movTotalsRes.data || []) {
        if (!totals[mov.material_id]) totals[mov.material_id] = { entries: 0, exits: 0 };
        if (mov.movement_type === "entry") totals[mov.material_id].entries += Number(mov.quantity);
        else totals[mov.material_id].exits += Number(mov.quantity);
      }
      setStockTotals(totals);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMovements = async () => {
    setMovementsLoading(true);
    try {
      const { data, error } = await supabase
        .from("op_material_movements")
        .select("*, materials:op_materials(name)")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      setMovements(
        (data || []).map((m: any) => ({
          ...m,
          material_name: m.materials?.name || "—",
        }))
      );
    } catch (error) {
      console.error("Error fetching movements:", error);
    } finally {
      setMovementsLoading(false);
    }
  };

  const resetForm = () => {
    setForm({ name: "", unit: "un", minStock: 0, sectorId: "" });
    setEditingId(null);
  };

  const handleEdit = (material: Material) => {
    setForm({
      name: material.name,
      unit: material.unit,
      minStock: material.minStock,
      sectorId: material.sector?.id || "",
    });
    setEditingId(material.id);
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
        unit: form.unit,
        min_stock: form.minStock,
        sector_id: form.sectorId || null,
        establishment_id: establishmentId,
      };

      if (editingId) {
        const { error } = await supabase.from("op_materials").update(data).eq("id", editingId);
        if (error) throw error;
        toast({ title: "Material atualizado!" });
      } else {
        const { error } = await supabase.from("op_materials").insert(data);
        if (error) throw error;
        toast({ title: "Material criado!" });
      }

      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error saving material:", error);
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este material?")) return;

    try {
      const { error } = await supabase.from("op_materials").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Material excluído!" });
      fetchData();
    } catch (error) {
      console.error("Error deleting material:", error);
      toast({ title: "Erro ao excluir", variant: "destructive" });
    }
  };

  const handleMovementSubmit = async () => {
    if (!movForm.materialId || !movForm.quantity || parseFloat(movForm.quantity) <= 0) {
      toast({ title: "Selecione o material e informe a quantidade", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("op_material_movements").insert({
        material_id: movForm.materialId,
        movement_type: movForm.movementType,
        quantity: parseFloat(movForm.quantity),
        reason: movForm.reason || null,
        notes: movForm.notes || null,
        user_id: user?.id || null,
        establishment_id: establishmentId,
      });

      if (error) throw error;

      toast({
        title: movForm.movementType === "entry" ? "Entrada registrada!" : "Saída registrada!",
      });

      setMovementDialogOpen(false);
      setMovForm({ materialId: "", movementType: "entry", quantity: "", reason: "", notes: "" });
      fetchData();
      fetchMovements();
    } catch (error: any) {
      console.error("Error saving movement:", error);
      toast({ title: "Erro ao registrar movimentação", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMovement = async () => {
    if (!deletingMovementId) return;
    try {
      const { error } = await supabase
        .from("op_material_movements")
        .delete()
        .eq("id", deletingMovementId);
      if (error) throw error;
      toast({ title: "Movimentação excluída com sucesso!" });
      fetchData();
      fetchMovements();
    } catch (error) {
      console.error("Error deleting movement:", error);
      toast({ title: "Erro ao excluir movimentação", variant: "destructive" });
    } finally {
      setDeletingMovementId(null);
    }
  };

  const lowStockMaterials = useMemo(
    () => materials.filter((m) => {
      const totals = stockTotals[m.id] || { entries: 0, exits: 0 };
      const stock = totals.entries - totals.exits;
      return stock <= m.minStock && m.minStock > 0;
    }).map((m) => {
      const totals = stockTotals[m.id] || { entries: 0, exits: 0 };
      return { ...m, calculatedStock: totals.entries - totals.exits };
    }),
    [materials, stockTotals]
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Materiais</h1>
          <p className="text-muted-foreground">Cadastro, movimentação e controle de estoque</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="cadastro" className="gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Cadastro</span>
            </TabsTrigger>
            <TabsTrigger value="movimentacao" className="gap-2">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">Movimentação</span>
            </TabsTrigger>
            <TabsTrigger value="alertas" className="gap-2 relative">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Alertas</span>
              {lowStockMaterials.length > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
                  {lowStockMaterials.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ===== CADASTRO TAB ===== */}
          <TabsContent value="cadastro" className="space-y-4 mt-4">
            <div className="flex justify-end">
              <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Novo Material
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingId ? "Editar Material" : "Novo Material"}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Nome *</Label>
                      <Input
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="Nome do material"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Unidade</Label>
                        <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {units.map((u) => (
                              <SelectItem key={u} value={u}>{u}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Setor</Label>
                        <Select value={form.sectorId} onValueChange={(v) => setForm({ ...form, sectorId: v })}>
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>
                            {sectors.map((s) => (
                              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Estoque Mínimo</Label>
                      <Input
                        type="number"
                        value={form.minStock}
                        onChange={(e) => setForm({ ...form, minStock: parseFloat(e.target.value) || 0 })}
                        placeholder="0"
                      />
                      <p className="text-xs text-muted-foreground">Alerta será gerado quando o estoque ficar abaixo deste valor</p>
                    </div>
                    <Button className="w-full" onClick={handleSubmit} disabled={saving}>
                      {saving ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</>) : "Salvar"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <MaterialForecast />

            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
                </div>
              ) : materials.length === 0 ? (
                <div className="text-center py-12 rounded-xl border border-border bg-card">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhum material cadastrado</p>
                </div>
              ) : (
                materials.map((material) => {
                  const totals = stockTotals[material.id] || { entries: 0, exits: 0 };
                  const calculatedStock = totals.entries - totals.exits;
                  const isCritical = calculatedStock <= material.minStock && material.minStock > 0;
                  return (
                    <div
                      key={material.id}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-xl border bg-card",
                        isCritical ? "border-destructive/50 bg-destructive/5" : "border-border"
                      )}
                    >
                      <div
                        className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: (material.sector?.color || "#3b82f6") + "20" }}
                      >
                        <Package className="h-5 w-5" style={{ color: material.sector?.color || "#3b82f6" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{material.name}</p>
                          {isCritical && <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />}
                        </div>
                        <p className="text-sm text-muted-foreground">{material.sector?.name || "Sem setor"}</p>
                      </div>
                      <div className="text-right space-y-0.5">
                        <p className={cn("text-lg font-mono font-bold", isCritical ? "text-destructive" : "text-foreground")}>
                          {calculatedStock} {material.unit}
                        </p>
                        <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-0.5">
                            <ArrowDownCircle className="h-3 w-3 text-emerald-500" />{totals.entries}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <ArrowUpCircle className="h-3 w-3 text-destructive" />{totals.exits}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">Mín: {material.minStock} {material.unit}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(material)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(material.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </TabsContent>

          {/* ===== MOVIMENTAÇÃO TAB ===== */}
          <TabsContent value="movimentacao" className="space-y-4 mt-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <p className="text-muted-foreground">Registre entradas e saídas de materiais do estoque</p>
              <Dialog open={movementDialogOpen} onOpenChange={setMovementDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Nova Movimentação
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nova Movimentação</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    {/* Type toggle */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant={movForm.movementType === "entry" ? "default" : "outline"}
                        className={cn("gap-2", movForm.movementType === "entry" && "bg-emerald-600 hover:bg-emerald-700")}
                        onClick={() => setMovForm({ ...movForm, movementType: "entry", reason: "" })}
                      >
                        <ArrowDownCircle className="h-4 w-4" />
                        Entrada
                      </Button>
                      <Button
                        type="button"
                        variant={movForm.movementType === "exit" ? "default" : "outline"}
                        className={cn("gap-2", movForm.movementType === "exit" && "bg-destructive hover:bg-destructive/90")}
                        onClick={() => setMovForm({ ...movForm, movementType: "exit", reason: "" })}
                      >
                        <ArrowUpCircle className="h-4 w-4" />
                        Saída
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Label>Material *</Label>
                      <Select value={movForm.materialId} onValueChange={(v) => setMovForm({ ...movForm, materialId: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione o material" /></SelectTrigger>
                        <SelectContent>
                          {materials.map((m) => {
                            const t = stockTotals[m.id] || { entries: 0, exits: 0 };
                            return (
                              <SelectItem key={m.id} value={m.id}>
                                {m.name} ({t.entries - t.exits} {m.unit})
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Quantidade *</Label>
                        <Input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={movForm.quantity}
                          onChange={(e) => setMovForm({ ...movForm, quantity: e.target.value })}
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Motivo</Label>
                        <Select value={movForm.reason} onValueChange={(v) => setMovForm({ ...movForm, reason: v })}>
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>
                            {movementReasons[movForm.movementType].map((r) => (
                              <SelectItem key={r} value={r}>{r}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Observações</Label>
                      <Textarea
                        value={movForm.notes}
                        onChange={(e) => setMovForm({ ...movForm, notes: e.target.value })}
                        placeholder="Observações opcionais"
                        rows={2}
                      />
                    </div>

                    <Button className="w-full" onClick={handleMovementSubmit} disabled={saving}>
                      {saving ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Registrando...</>) : "Registrar Movimentação"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Histórico de Movimentações</CardTitle>
              </CardHeader>
              <CardContent>
                {movementsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
                  </div>
                ) : movements.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Nenhuma movimentação registrada.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Material</TableHead>
                          <TableHead>Qtd</TableHead>
                          <TableHead>Motivo</TableHead>
                          <TableHead>Obs</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {movements.map((mov) => (
                          <TableRow key={mov.id}>
                            <TableCell className="text-sm whitespace-nowrap">
                              {format(new Date(mov.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                            </TableCell>
                            <TableCell>
                              {mov.movement_type === "entry" ? (
                                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                                  <ArrowDownCircle className="h-3 w-3 mr-1" />Entrada
                                </Badge>
                              ) : (
                                <Badge variant="destructive">
                                  <ArrowUpCircle className="h-3 w-3 mr-1" />Saída
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="font-medium">{mov.material_name}</TableCell>
                            <TableCell className="font-mono">{mov.quantity}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{mov.reason || "—"}</TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{mov.notes || "—"}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-destructive h-8 w-8"
                                onClick={() => setDeletingMovementId(mov.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== ALERTAS TAB ===== */}
          <TabsContent value="alertas" className="space-y-4 mt-4">
            <p className="text-muted-foreground">Materiais com estoque abaixo do mínimo configurado</p>

            {lowStockMaterials.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Package className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium text-foreground">Tudo em ordem!</p>
                  <p className="text-muted-foreground">Nenhum material com estoque abaixo do mínimo.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {lowStockMaterials.map((material) => {
                  const percentage = material.minStock > 0
                    ? Math.round((material.calculatedStock / material.minStock) * 100)
                    : 0;
                  const isZero = material.calculatedStock <= 0;

                  return (
                    <Card key={material.id} className={cn("border-l-4", isZero ? "border-l-destructive" : "border-l-amber-500")}>
                      <CardContent className="flex items-center gap-4 py-4">
                        <div className={cn(
                          "h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0",
                          isZero ? "bg-destructive/10" : "bg-amber-500/10"
                        )}>
                          <AlertTriangle className={cn("h-6 w-6", isZero ? "text-destructive" : "text-amber-500")} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold">{material.name}</p>
                          <p className="text-sm text-muted-foreground">{material.sector?.name || "Sem setor"}</p>
                        </div>
                        <div className="text-right">
                          <p className={cn("text-xl font-mono font-bold", isZero ? "text-destructive" : "text-amber-500")}>
                            {material.calculatedStock} {material.unit}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Mín: {material.minStock} {material.unit} ({percentage}%)
                          </p>
                        </div>
                        <Badge variant={isZero ? "destructive" : "outline"} className={cn(!isZero && "border-amber-500 text-amber-600")}>
                          {isZero ? "Esgotado" : "Baixo"}
                        </Badge>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={!!deletingMovementId} onOpenChange={(open) => { if (!open) setDeletingMovementId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta movimentação? O estoque calculado será atualizado automaticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMovement} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
