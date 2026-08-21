import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

// Use typed-safe wrapper for tables not yet in generated types
const db = supabase as any;
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageHeader } from "@/components/ui/page-header";
import { toast } from "@/hooks/use-toast";
import { Plus, Search, Package, FolderOpen, ArrowDownCircle, ArrowUpCircle, FileText, AlertTriangle, Pencil, Trash2, ChevronsUpDown, Check } from "lucide-react";
import { ImageUploadCrop } from "@/components/ImageUploadCrop";
import { ImageZoom } from "@/components/ui/image-zoom";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SupplyGroup {
  id: string;
  name: string;
  description: string | null;
  company_id: string | null;
  is_active: boolean;
  created_at: string;
}

interface Supply {
  id: string;
  name: string;
  description: string | null;
  unit: string;
  group_id: string | null;
  company_id: string | null;
  current_stock: number;
  min_stock: number;
  is_active: boolean;
  photo_url: string | null;
  created_at: string;
}

interface SupplyMovement {
  id: string;
  supply_id: string;
  movement_type: string;
  quantity: number;
  notes: string | null;
  performed_by: string;
  created_at: string;
}

export default function Supplies() {
  const { user, profile, isAdmin, isAlmoxarifado } = useAuth();
  const isStaff = isAdmin || isAlmoxarifado;

  const [groups, setGroups] = useState<SupplyGroup[]>([]);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [movements, setMovements] = useState<(SupplyMovement & { supply_name?: string; supply_photo_url?: string | null; performer_name?: string })[]>([]);
  const [search, setSearch] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [reportFilter, setReportFilter] = useState<string>("all");
  const [reportGroup, setReportGroup] = useState<string>("all");
  const [reportSort, setReportSort] = useState<string>("name");

  // Dialog states
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [supplyDialogOpen, setSupplyDialogOpen] = useState(false);
  const [movementDialogOpen, setMovementDialogOpen] = useState(false);
  const [supplyPopoverOpen, setSupplyPopoverOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<SupplyGroup | null>(null);
  const [editingSupply, setEditingSupply] = useState<Supply | null>(null);

  // Confirm delete states
  const [confirmDelete, setConfirmDelete] = useState<{ type: "group" | "supply" | "movement"; id: string; label: string } | null>(null);

  // Form states
  const [groupForm, setGroupForm] = useState({ name: "", description: "" });
  const [supplyForm, setSupplyForm] = useState({ name: "", description: "", unit: "un", group_id: "", min_stock: "0", photo_url: "" as string | null });
  const [movementForm, setMovementForm] = useState({ supply_id: "", movement_type: "entrada", quantity: "", notes: "" });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setIsLoading(true);
    await Promise.all([fetchGroups(), fetchSupplies(), fetchMovements()]);
    setIsLoading(false);
  };

  const fetchGroups = async () => {
    const { data } = await db.from("supply_groups").select("*").order("name");
    if (data) setGroups(data as SupplyGroup[]);
  };

  const fetchSupplies = async () => {
    const { data } = await db.from("supplies").select("*").order("name");
    if (data) setSupplies(data as Supply[]);
  };

  const fetchMovements = async () => {
    const { data } = await db
      .from("supply_movements")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data) {
      // Enrich with supply names and performer names
      const supplyIds = [...new Set(data.map((m: any) => m.supply_id))] as string[];
      const performerIds = [...new Set(data.map((m: any) => m.performed_by))] as string[];
      
      const [suppliesRes, profilesRes] = await Promise.all([
        db.from("supplies").select("id, name, photo_url").in("id", supplyIds),
        supabase.from("profiles").select("id, full_name").in("id", performerIds as string[]),
      ]);

      const supplyMap = Object.fromEntries((suppliesRes.data || []).map((s: any) => [s.id, { name: s.name, photo_url: s.photo_url }]));
      const profileMap = Object.fromEntries((profilesRes.data || []).map((p: any) => [p.id, p.full_name]));

      setMovements(
        (data as SupplyMovement[]).map((m) => ({
          ...m,
          supply_name: supplyMap[m.supply_id]?.name || "—",
          supply_photo_url: supplyMap[m.supply_id]?.photo_url || null,
          performer_name: profileMap[m.performed_by] || "—",
        }))
      );
    }
  };

  // Group CRUD
  const openGroupDialog = (group?: SupplyGroup) => {
    if (group) {
      setEditingGroup(group);
      setGroupForm({ name: group.name, description: group.description || "" });
    } else {
      setEditingGroup(null);
      setGroupForm({ name: "", description: "" });
    }
    setGroupDialogOpen(true);
  };

  const saveGroup = async () => {
    if (!groupForm.name.trim()) return toast({ title: "Nome obrigatório", variant: "destructive" });
    
    if (editingGroup) {
      const { error } = await db.from("supply_groups").update({ name: groupForm.name, description: groupForm.description || null }).eq("id", editingGroup.id);
      if (error) return toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
      toast({ title: "Grupo atualizado" });
    } else {
      const { error } = await db.from("supply_groups").insert({ name: groupForm.name, description: groupForm.description || null, company_id: profile?.company_id });
      if (error) return toast({ title: "Erro ao criar", description: error.message, variant: "destructive" });
      toast({ title: "Grupo criado" });
    }
    setGroupDialogOpen(false);
    fetchGroups();
  };

  const deleteGroup = async (id: string) => {
    const hasSupplies = supplies.some((s) => s.group_id === id);
    if (hasSupplies) return toast({ title: "Grupo possui insumos vinculados", description: "Remova ou mova os insumos antes de excluir o grupo.", variant: "destructive" });
    const { error } = await db.from("supply_groups").delete().eq("id", id);
    if (error) return toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    toast({ title: "Grupo excluído" });
    fetchGroups();
  };

  // Supply CRUD
  const openSupplyDialog = (supply?: Supply) => {
    if (supply) {
      setEditingSupply(supply);
      setSupplyForm({ name: supply.name, description: supply.description || "", unit: supply.unit, group_id: supply.group_id || "", min_stock: String(supply.min_stock), photo_url: supply.photo_url });
    } else {
      setEditingSupply(null);
      setSupplyForm({ name: "", description: "", unit: "un", group_id: "", min_stock: "0", photo_url: null });
    }
    setSupplyDialogOpen(true);
  };

  const saveSupply = async () => {
    if (!supplyForm.name.trim()) return toast({ title: "Nome obrigatório", variant: "destructive" });
    
    const payload = {
      name: supplyForm.name,
      description: supplyForm.description || null,
      unit: supplyForm.unit,
      group_id: supplyForm.group_id || null,
      min_stock: Number(supplyForm.min_stock) || 0,
      photo_url: supplyForm.photo_url || null,
      company_id: profile?.company_id,
    };

    if (editingSupply) {
      const { error } = await db.from("supplies").update(payload).eq("id", editingSupply.id);
      if (error) return toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
      toast({ title: "Insumo atualizado" });
    } else {
      const { error } = await db.from("supplies").insert(payload);
      if (error) return toast({ title: "Erro ao criar", description: error.message, variant: "destructive" });
      toast({ title: "Insumo cadastrado" });
    }
    setSupplyDialogOpen(false);
    fetchSupplies();
  };

  const deleteSupply = async (id: string) => {
    const supply = supplies.find((s) => s.id === id);
    if (supply && supply.current_stock > 0) {
      return toast({ title: "Insumo possui estoque", description: "Zere o estoque antes de excluir.", variant: "destructive" });
    }
    // Check movements from DB (not just local state limited to 200)
    const { count } = await db.from("supply_movements").select("id", { count: "exact", head: true }).eq("supply_id", id);
    if (count && count > 0) {
      return toast({ title: "Insumo possui movimentações", description: "Não é possível excluir insumo com histórico de movimentação.", variant: "destructive" });
    }
    const { error } = await db.from("supplies").delete().eq("id", id);
    if (error) return toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    toast({ title: "Insumo excluído" });
    fetchSupplies();
  };

  const deleteMovement = async (id: string) => {
    const { error } = await db.from("supply_movements").delete().eq("id", id);
    if (error) return toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    toast({ title: "Movimentação excluída" });
    fetchAll();
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    if (confirmDelete.type === "group") await deleteGroup(confirmDelete.id);
    else if (confirmDelete.type === "supply") await deleteSupply(confirmDelete.id);
    else if (confirmDelete.type === "movement") await deleteMovement(confirmDelete.id);
    setConfirmDelete(null);
  };

  // Movements
  const openMovementDialog = (type: "entrada" | "saida") => {
    setMovementForm({ supply_id: "", movement_type: type, quantity: "", notes: "" });
    setMovementDialogOpen(true);
  };

  const saveMovement = async () => {
    if (!movementForm.supply_id) return toast({ title: "Selecione o insumo", variant: "destructive" });
    const qty = Number(movementForm.quantity);
    if (!qty || qty <= 0) return toast({ title: "Quantidade inválida", variant: "destructive" });

    if (movementForm.movement_type === "saida") {
      const supply = supplies.find((s) => s.id === movementForm.supply_id);
      if (supply && qty > supply.current_stock) {
        return toast({ title: "Estoque insuficiente", description: `Disponível: ${supply.current_stock} ${supply.unit}`, variant: "destructive" });
      }
    }

    const { error } = await db.from("supply_movements").insert({
      supply_id: movementForm.supply_id,
      movement_type: movementForm.movement_type,
      quantity: qty,
      notes: movementForm.notes || null,
      performed_by: user?.id,
      company_id: profile?.company_id,
    });

    if (error) return toast({ title: "Erro ao registrar", description: error.message, variant: "destructive" });
    toast({ title: movementForm.movement_type === "entrada" ? "Entrada registrada" : "Saída registrada" });
    setMovementDialogOpen(false);
    fetchAll();
  };

  // Filtered supplies
  const filteredSupplies = supplies.filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase());
    const matchGroup = selectedGroup === "all" || s.group_id === selectedGroup;
    return matchSearch && matchGroup;
  });

  const lowStockSupplies = supplies.filter((s) => s.current_stock <= s.min_stock && s.is_active);

  const getGroupName = (groupId: string | null) => groups.find((g) => g.id === groupId)?.name || "Sem grupo";

  return (
    <MainLayout>
      <div className="space-y-4 sm:space-y-6">
        <PageHeader title="Insumos" description="Controle de estoque de insumos e materiais" />

        {/* Low stock alerts */}
        {lowStockSupplies.length > 0 && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span className="font-semibold text-sm text-destructive">Insumos com estoque baixo</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {lowStockSupplies.map((s) => (
                  <Badge key={s.id} variant="destructive" className="text-xs">
                    {s.name}: {s.current_stock} {s.unit} (mín: {s.min_stock})
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="supplies" className="w-full">
          <TabsList className="w-full grid grid-cols-4 h-auto gap-1">
            <TabsTrigger value="supplies" className="text-[11px] sm:text-sm py-2 px-1 sm:px-3">
              <Package className="h-4 w-4 sm:mr-1 hidden sm:inline" />Insumos
            </TabsTrigger>
            <TabsTrigger value="groups" className="text-[11px] sm:text-sm py-2 px-1 sm:px-3">
              <FolderOpen className="h-4 w-4 sm:mr-1 hidden sm:inline" />Grupos
            </TabsTrigger>
            <TabsTrigger value="movements" className="text-[11px] sm:text-sm py-2 px-1 sm:px-3">
              <ArrowDownCircle className="h-4 w-4 sm:mr-1 hidden sm:inline" /><span className="sm:hidden">Movim.</span><span className="hidden sm:inline">Movimentações</span>
            </TabsTrigger>
            <TabsTrigger value="report" className="text-[11px] sm:text-sm py-2 px-1 sm:px-3">
              <FileText className="h-4 w-4 sm:mr-1 hidden sm:inline" />Relatório
            </TabsTrigger>
          </TabsList>

          {/* INSUMOS TAB */}
          <TabsContent value="supplies" className="space-y-4 mt-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar insumo..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
              <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Grupo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os grupos</SelectItem>
                  {groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {isStaff && (
                <Button onClick={() => openSupplyDialog()} size="sm" className="flex-1 sm:flex-none">
                  <Plus className="h-4 w-4 mr-1" />Novo
                </Button>
              )}
            </div>

            {/* Mobile: Cards */}
            <div className="space-y-2 md:hidden">
              {filteredSupplies.map((s) => {
                const isLow = s.current_stock <= s.min_stock;
                return (
                  <Card key={s.id}>
                    <CardContent className="p-3 flex items-center gap-3">
                      {s.photo_url ? (
                        <ImageZoom
                          src={s.photo_url}
                          alt={s.name}
                          className="h-12 w-12 shrink-0"
                          thumbnailClassName="h-12 w-12 rounded-lg object-cover border"
                        />
                      ) : (
                        <div className="h-12 w-12 shrink-0 rounded-lg border bg-muted flex items-center justify-center">
                          <Package className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{s.name}</span>
                          {isLow ? <Badge variant="destructive" className="text-[10px] shrink-0">Comprar</Badge> : <Badge variant="secondary" className="text-[10px] shrink-0">OK</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">{getGroupName(s.group_id)}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={cn("text-sm font-bold", isLow && "text-destructive")}>{s.current_stock} <span className="text-xs font-normal text-muted-foreground">{s.unit}</span></span>
                          <span className="text-xs text-muted-foreground">• mín: {s.min_stock}</span>
                        </div>
                      </div>
                      {isStaff && (
                        <div className="flex flex-col gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openSupplyDialog(s)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          {isAdmin && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => {
                              const supply = supplies.find(sup => sup.id === s.id);
                              if (supply && supply.current_stock > 0) {
                                return toast({ title: "Insumo possui estoque", description: "Zere o estoque antes de excluir.", variant: "destructive" });
                              }
                              const hasMovs = movements.some(m => m.supply_id === s.id);
                              if (hasMovs) {
                                return toast({ title: "Insumo possui movimentações", description: "Não é possível excluir insumo com histórico de movimentação.", variant: "destructive" });
                              }
                              setConfirmDelete({ type: "supply", id: s.id, label: s.name });
                            }}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
              {filteredSupplies.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">Nenhum insumo encontrado</div>
              )}
            </div>

            {/* Desktop: Table */}
            <div className="overflow-x-auto rounded-md border hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Insumo</TableHead>
                    <TableHead>Grupo</TableHead>
                    <TableHead className="text-right">Estoque</TableHead>
                    <TableHead className="text-right">Mín.</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    {isStaff && <TableHead className="text-right w-20">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSupplies.map((s) => {
                    const isLow = s.current_stock <= s.min_stock;
                    return (
                      <TableRow key={s.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {s.photo_url ? (
                              <ImageZoom
                                src={s.photo_url}
                                alt={s.name}
                                className="h-10 w-10 shrink-0"
                                thumbnailClassName="h-10 w-10 rounded object-cover border"
                              />
                            ) : (
                              <div className="h-10 w-10 shrink-0 rounded border bg-muted flex items-center justify-center">
                                <Package className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="font-medium text-sm">{s.name}</div>
                              {s.description && <p className="text-xs text-muted-foreground line-clamp-1">{s.description}</p>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{getGroupName(s.group_id)}</TableCell>
                        <TableCell className={cn("text-right font-bold", isLow && "text-destructive")}>
                          {s.current_stock} <span className="text-xs font-normal text-muted-foreground">{s.unit}</span>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">{s.min_stock} {s.unit}</TableCell>
                        <TableCell className="text-center">
                          {isLow ? <Badge variant="destructive" className="text-[10px]">Comprar</Badge> : <Badge variant="secondary" className="text-[10px]">OK</Badge>}
                        </TableCell>
                        {isStaff && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openSupplyDialog(s)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              {isAdmin && (
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => {
                                  const supply = supplies.find(sup => sup.id === s.id);
                                  if (supply && supply.current_stock > 0) {
                                    return toast({ title: "Insumo possui estoque", description: "Zere o estoque antes de excluir.", variant: "destructive" });
                                  }
                                  const hasMovs = movements.some(m => m.supply_id === s.id);
                                  if (hasMovs) {
                                    return toast({ title: "Insumo possui movimentações", description: "Não é possível excluir insumo com histórico de movimentação.", variant: "destructive" });
                                  }
                                  setConfirmDelete({ type: "supply", id: s.id, label: s.name });
                                }}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {filteredSupplies.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">Nenhum insumo encontrado</div>
              )}
            </div>
          </TabsContent>

          {/* GRUPOS TAB */}
          <TabsContent value="groups" className="space-y-4 mt-4">
            {isStaff && (
              <div className="flex justify-end">
                <Button onClick={() => openGroupDialog()} size="sm"><Plus className="h-4 w-4 mr-1" />Novo Grupo</Button>
              </div>
            )}
            {/* Mobile: Cards */}
            <div className="space-y-2 md:hidden">
              {groups.map((g) => {
                const count = supplies.filter((s) => s.group_id === g.id).length;
                return (
                  <Card key={g.id}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="h-10 w-10 shrink-0 rounded-lg border bg-muted flex items-center justify-center">
                        <FolderOpen className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{g.name}</span>
                          <Badge variant="secondary" className="text-[10px]">{count}</Badge>
                        </div>
                        {g.description && <p className="text-xs text-muted-foreground line-clamp-1">{g.description}</p>}
                      </div>
                      {isStaff && (
                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openGroupDialog(g)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          {isAdmin && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => {
                              const hasSuppliesInGroup = supplies.some((s) => s.group_id === g.id);
                              if (hasSuppliesInGroup) {
                                return toast({ title: "Grupo possui insumos vinculados", description: "Remova ou mova os insumos antes de excluir o grupo.", variant: "destructive" });
                              }
                              setConfirmDelete({ type: "group", id: g.id, label: g.name });
                            }}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
              {groups.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">Nenhum grupo cadastrado</div>
              )}
            </div>

            {/* Desktop: Table */}
            <div className="overflow-x-auto rounded-md border hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-center">Insumos</TableHead>
                    {isStaff && <TableHead className="text-right w-20">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groups.map((g) => {
                    const count = supplies.filter((s) => s.group_id === g.id).length;
                    return (
                      <TableRow key={g.id}>
                        <TableCell>
                          <div className="font-medium text-sm">{g.name}</div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{g.description || "—"}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{count}</Badge>
                        </TableCell>
                        {isStaff && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openGroupDialog(g)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              {isAdmin && (
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => {
                                  const hasSuppliesInGroup = supplies.some((s) => s.group_id === g.id);
                                  if (hasSuppliesInGroup) {
                                    return toast({ title: "Grupo possui insumos vinculados", description: "Remova ou mova os insumos antes de excluir o grupo.", variant: "destructive" });
                                  }
                                  setConfirmDelete({ type: "group", id: g.id, label: g.name });
                                }}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {groups.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">Nenhum grupo cadastrado</div>
              )}
            </div>
          </TabsContent>

          {/* MOVIMENTAÇÕES TAB */}
          <TabsContent value="movements" className="space-y-4 mt-4">
            {isStaff && (
              <div className="flex gap-2 justify-end">
                <Button onClick={() => openMovementDialog("entrada")} size="sm" variant="outline">
                  <ArrowDownCircle className="h-4 w-4 mr-1" />Entrada
                </Button>
                <Button onClick={() => openMovementDialog("saida")} size="sm" variant="outline">
                  <ArrowUpCircle className="h-4 w-4 mr-1" />Saída
                </Button>
              </div>
            )}
            <div className="space-y-2">
              {movements.map((m) => (
                <Card key={m.id}>
                  <CardContent className="p-3 flex items-center gap-3">
                    {m.movement_type === "entrada" ? (
                      <ArrowDownCircle className="h-5 w-5 text-green-500 shrink-0" />
                    ) : (
                      <ArrowUpCircle className="h-5 w-5 text-destructive shrink-0" />
                    )}
                    {m.supply_photo_url ? (
                      <ImageZoom
                        src={m.supply_photo_url}
                        alt={m.supply_name || "Insumo"}
                        className="h-10 w-10 shrink-0"
                        thumbnailClassName="h-10 w-10 rounded object-cover border"
                      />
                    ) : (
                      <div className="h-10 w-10 shrink-0 rounded border bg-muted flex items-center justify-center">
                        <Package className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.supply_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.performer_name} • {format(new Date(m.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </p>
                      {m.notes && <p className="text-xs text-muted-foreground mt-0.5">{m.notes}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={m.movement_type === "entrada" ? "default" : "destructive"}>
                        {m.movement_type === "entrada" ? "+" : "-"}{m.quantity}
                      </Badge>
                      {isStaff && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setConfirmDelete({ type: "movement", id: m.id, label: `${m.supply_name} (${m.movement_type === "entrada" ? "+" : "-"}${m.quantity})` })}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {movements.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">Nenhuma movimentação registrada</div>
              )}
            </div>
          </TabsContent>

          {/* RELATÓRIO TAB */}
          <TabsContent value="report" className="space-y-4 mt-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={reportFilter} onValueChange={setReportFilter}>
                <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="low">Estoque baixo</SelectItem>
                  <SelectItem value="ok">Estoque OK</SelectItem>
                </SelectContent>
              </Select>
              <Select value={reportGroup} onValueChange={setReportGroup}>
                <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os grupos</SelectItem>
                  {groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={reportSort} onValueChange={setReportSort}>
                <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Ordenar por nome</SelectItem>
                  <SelectItem value="stock_asc">Menor estoque</SelectItem>
                  <SelectItem value="stock_desc">Maior estoque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Relatório de Estoque</CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  let filtered = supplies.filter(s => s.is_active);
                  if (reportFilter === "low") filtered = filtered.filter(s => s.current_stock <= s.min_stock);
                  if (reportFilter === "ok") filtered = filtered.filter(s => s.current_stock > s.min_stock);
                  if (reportGroup !== "all") filtered = filtered.filter(s => s.group_id === reportGroup);
                  if (reportSort === "name") filtered.sort((a, b) => a.name.localeCompare(b.name));
                  if (reportSort === "stock_asc") filtered.sort((a, b) => a.current_stock - b.current_stock);
                  if (reportSort === "stock_desc") filtered.sort((a, b) => b.current_stock - a.current_stock);

                  if (filtered.length === 0) return (
                    <div className="text-center py-8 text-muted-foreground">Nenhum insumo encontrado</div>
                  );

                  return (
                    <>
                      {/* Mobile: Cards */}
                      <div className="space-y-2 md:hidden">
                        {filtered.map((s) => {
                          const isLow = s.current_stock <= s.min_stock;
                          return (
                            <div key={s.id} className="flex items-center gap-3 p-2 rounded-lg border bg-card">
                              {s.photo_url ? (
                                <ImageZoom
                                  src={s.photo_url}
                                  alt={s.name}
                                  className="h-10 w-10 shrink-0"
                                  thumbnailClassName="h-10 w-10 rounded object-cover border"
                                />
                              ) : (
                                <div className="h-10 w-10 shrink-0 rounded border bg-muted flex items-center justify-center">
                                  <Package className="h-4 w-4 text-muted-foreground" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm truncate">{s.name}</span>
                                  <span className="text-xs text-muted-foreground">({s.unit})</span>
                                </div>
                                <p className="text-xs text-muted-foreground">{getGroupName(s.group_id)}</p>
                              </div>
                              <div className="text-right shrink-0">
                                <div className={cn("text-sm font-bold", isLow && "text-destructive")}>{s.current_stock}/{s.min_stock}</div>
                                {isLow ? <Badge variant="destructive" className="text-[10px]">Comprar</Badge> : <Badge variant="secondary" className="text-[10px]">OK</Badge>}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Desktop: Table */}
                      <div className="overflow-x-auto hidden md:block">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Insumo</TableHead>
                              <TableHead>Grupo</TableHead>
                              <TableHead className="text-right">Estoque</TableHead>
                              <TableHead className="text-right">Mín.</TableHead>
                              <TableHead className="text-center">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filtered.map((s) => {
                              const isLow = s.current_stock <= s.min_stock;
                              return (
                                <TableRow key={s.id}>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      {s.photo_url ? (
                                        <ImageZoom
                                          src={s.photo_url}
                                          alt={s.name}
                                          className="h-10 w-10 shrink-0"
                                          thumbnailClassName="h-10 w-10 rounded object-cover border"
                                        />
                                      ) : (
                                        <div className="h-10 w-10 shrink-0 rounded border bg-muted flex items-center justify-center">
                                          <Package className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                      )}
                                      <div>
                                        <span className="font-medium">{s.name}</span>
                                        <span className="text-muted-foreground text-xs ml-1">({s.unit})</span>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-muted-foreground">{getGroupName(s.group_id)}</TableCell>
                                  <TableCell className={cn("text-right font-bold", isLow && "text-destructive")}>{s.current_stock}</TableCell>
                                  <TableCell className="text-right text-muted-foreground">{s.min_stock}</TableCell>
                                  <TableCell className="text-center">
                                    {isLow ? <Badge variant="destructive" className="text-[10px]">Comprar</Badge> : <Badge variant="secondary" className="text-[10px]">OK</Badge>}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* GROUP DIALOG */}
      <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
        <DialogContent className="max-w-md w-[calc(100%-2rem)] p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>{editingGroup ? "Editar Grupo" : "Novo Grupo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input value={groupForm.name} onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })} />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={groupForm.description} onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2 pt-2">
            <Button variant="outline" onClick={() => setGroupDialogOpen(false)} className="w-full sm:w-auto">Cancelar</Button>
            <Button onClick={saveGroup} className="w-full sm:w-auto">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SUPPLY DIALOG */}
      <Dialog open={supplyDialogOpen} onOpenChange={setSupplyDialogOpen}>
        <DialogContent className="max-w-md w-[calc(100%-2rem)] p-4 sm:p-6" onInteractOutside={(e) => e.preventDefault()} onPointerDownOutside={(e) => e.preventDefault()} onFocusOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{editingSupply ? "Editar Insumo" : "Novo Insumo"}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[65vh] sm:max-h-[70vh]">
            <div className="space-y-4 pr-2">
              <div>
                <Label>Nome *</Label>
                <Input value={supplyForm.name} onChange={(e) => setSupplyForm({ ...supplyForm, name: e.target.value })} />
              </div>
              <div>
                <Label>Grupo</Label>
                <Select value={supplyForm.group_id} onValueChange={(v) => setSupplyForm({ ...supplyForm, group_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Unidade</Label>
                  <Select value={supplyForm.unit} onValueChange={(v) => setSupplyForm({ ...supplyForm, unit: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="un">Unidade</SelectItem>
                      <SelectItem value="kg">Quilograma</SelectItem>
                      <SelectItem value="lt">Litro</SelectItem>
                      <SelectItem value="m">Metro</SelectItem>
                      <SelectItem value="cx">Caixa</SelectItem>
                      <SelectItem value="pc">Peça</SelectItem>
                      <SelectItem value="rl">Rolo</SelectItem>
                      <SelectItem value="pct">Pacote</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Estoque mínimo</Label>
                  <Input type="number" value={supplyForm.min_stock} onChange={(e) => setSupplyForm({ ...supplyForm, min_stock: e.target.value })} min="0" />
                </div>
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea value={supplyForm.description} onChange={(e) => setSupplyForm({ ...supplyForm, description: e.target.value })} rows={2} />
              </div>
              <div>
                <Label>Foto (opcional)</Label>
                <ImageUploadCrop
                  value={supplyForm.photo_url}
                  onChange={(url) => setSupplyForm({ ...supplyForm, photo_url: url })}
                  bucket="tool-photos"
                  folder="supplies"
                />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2 pt-2">
            <Button variant="outline" onClick={() => setSupplyDialogOpen(false)} className="w-full sm:w-auto">Cancelar</Button>
            <Button onClick={saveSupply} className="w-full sm:w-auto">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MOVEMENT DIALOG */}
      <Dialog open={movementDialogOpen} onOpenChange={setMovementDialogOpen}>
        <DialogContent className="max-w-md w-[calc(100%-2rem)] p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>{movementForm.movement_type === "entrada" ? "Registrar Entrada" : "Registrar Saída"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Insumo *</Label>
              <Popover open={supplyPopoverOpen} onOpenChange={setSupplyPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={supplyPopoverOpen} className="w-full justify-between font-normal">
                    {movementForm.supply_id
                      ? (() => { const s = supplies.find(s => s.id === movementForm.supply_id); return s ? `${s.name} (${s.current_stock} ${s.unit})` : "Selecione"; })()
                      : "Pesquisar insumo..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Pesquisar insumo..." />
                    <CommandList>
                      <CommandEmpty>Nenhum insumo encontrado.</CommandEmpty>
                      <CommandGroup>
                        {supplies.filter(s => s.is_active).map((s) => (
                          <CommandItem
                            key={s.id}
                            value={s.name}
                            onSelect={() => {
                              setMovementForm({ ...movementForm, supply_id: s.id });
                              setSupplyPopoverOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", movementForm.supply_id === s.id ? "opacity-100" : "opacity-0")} />
                            {s.name} ({s.current_stock} {s.unit})
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Quantidade *</Label>
              <Input type="number" value={movementForm.quantity} onChange={(e) => setMovementForm({ ...movementForm, quantity: e.target.value })} min="0.01" step="0.01" />
            </div>
            <div>
              <Label>Observação</Label>
              <Textarea value={movementForm.notes} onChange={(e) => setMovementForm({ ...movementForm, notes: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2 pt-2">
            <Button variant="outline" onClick={() => setMovementDialogOpen(false)} className="w-full sm:w-auto">Cancelar</Button>
            <Button onClick={saveMovement} className="w-full sm:w-auto">{movementForm.movement_type === "entrada" ? "Registrar Entrada" : "Registrar Saída"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRM DELETE DIALOG */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{confirmDelete?.label}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
