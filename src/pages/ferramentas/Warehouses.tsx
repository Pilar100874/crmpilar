import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase, Warehouse } from "@/lib/supabase";
import { Warehouse as WarehouseIcon, Plus, Edit, Trash2, MapPin, Ban, RotateCcw, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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

export default function WarehousesPage() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    location: "",
    description: "",
  });
  
  // Filter and delete state
  const [searchTerm, setSearchTerm] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [warehouseToDelete, setWarehouseToDelete] = useState<Warehouse | null>(null);
  const [hasAssociations, setHasAssociations] = useState(false);
  const [isCheckingAssociations, setIsCheckingAssociations] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data } = await supabase.from("warehouses").select("*").order("name");
      setWarehouses((data as Warehouse[]) || []);
    } catch (error) {
      console.error("Error fetching warehouses:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (warehouse?: Warehouse) => {
    if (warehouse) {
      setEditingWarehouse(warehouse);
      setFormData({
        name: warehouse.name,
        location: warehouse.location || "",
        description: warehouse.description || "",
      });
    } else {
      setEditingWarehouse(null);
      setFormData({ name: "", location: "", description: "" });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({ variant: "destructive", title: "Nome é obrigatório" });
      return;
    }

    const warehouseData = {
      name: formData.name,
      location: formData.location || null,
      description: formData.description || null,
    };

    try {
      if (editingWarehouse) {
        const { error } = await supabase
          .from("warehouses")
          .update(warehouseData)
          .eq("id", editingWarehouse.id);
        if (error) throw error;
        toast({ title: "Almoxarifado atualizado com sucesso!" });
      } else {
        const { error } = await supabase.from("warehouses").insert(warehouseData);
        if (error) throw error;
        toast({ title: "Almoxarifado cadastrado com sucesso!" });
      }
      setIsDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    }
  };

  const handleDeleteClick = async (warehouse: Warehouse) => {
    setWarehouseToDelete(warehouse);
    setIsCheckingAssociations(true);
    setDeleteDialogOpen(true);

    // Check if warehouse has tools or users associated
    const [toolsRes, usersRes] = await Promise.all([
      supabase.from("tools").select("*", { count: "exact", head: true }).eq("warehouse_id", warehouse.id),
      supabase.from("user_warehouses").select("*", { count: "exact", head: true }).eq("warehouse_id", warehouse.id),
    ]);
    
    const hasAssoc = ((toolsRes.count || 0) + (usersRes.count || 0)) > 0;
    setHasAssociations(hasAssoc);
    setIsCheckingAssociations(false);
  };

  const handleConfirmDelete = async () => {
    if (!warehouseToDelete) return;

    setIsDeleting(true);
    try {
      if (hasAssociations) {
        // Deactivate instead of delete
        const { error } = await supabase
          .from("warehouses")
          .update({ is_active: false })
          .eq("id", warehouseToDelete.id);
        if (error) throw error;
        toast({ title: "Almoxarifado desativado com sucesso!" });
      } else {
        // Delete permanently
        const { error } = await supabase
          .from("warehouses")
          .delete()
          .eq("id", warehouseToDelete.id);
        if (error) throw error;
        toast({ title: "Almoxarifado excluído com sucesso!" });
      }
      setDeleteDialogOpen(false);
      setWarehouseToDelete(null);
      fetchData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReactivate = async (warehouse: Warehouse) => {
    try {
      const { error } = await supabase
        .from("warehouses")
        .update({ is_active: true })
        .eq("id", warehouse.id);
      if (error) throw error;
      toast({ title: "Almoxarifado reativado com sucesso!" });
      fetchData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    }
  };

  // Filter warehouses
  const activeWarehouses = warehouses.filter((w) => (w as any).is_active !== false);
  const inactiveWarehouses = warehouses.filter((w) => (w as any).is_active === false);
  const filteredWarehouses = (showInactive ? inactiveWarehouses : activeWarehouses).filter((w) =>
    w.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const totalInactive = inactiveWarehouses.length;

  if (!isAdmin) {
    return (
      <MainLayout>
        <EmptyState
          icon={WarehouseIcon}
          title="Acesso Restrito"
          description="Apenas administradores podem gerenciar almoxarifados"
        />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageHeader
        title="Almoxarifados"
        description="Gerencie os locais de armazenamento"
        action={
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Almoxarifado
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingWarehouse ? "Editar Almoxarifado" : "Novo Almoxarifado"}
                </DialogTitle>
                <DialogDescription>
                  Preencha os dados do almoxarifado
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Almoxarifado Central"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Localização</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Ex: Bloco A, Térreo"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Observações sobre o almoxarifado..."
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSubmit}>
                  {editingWarehouse ? "Salvar" : "Cadastrar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar almoxarifados..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        {totalInactive > 0 && (
          <Button
            variant={showInactive ? "default" : "outline"}
            size="sm"
            onClick={() => setShowInactive(!showInactive)}
            className="gap-2"
          >
            <Ban className="h-4 w-4" />
            {showInactive ? "Ver ativos" : `Desativados (${totalInactive})`}
          </Button>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : filteredWarehouses.length === 0 ? (
        <EmptyState
          icon={WarehouseIcon}
          title={showInactive ? "Nenhum almoxarifado desativado" : "Nenhum almoxarifado encontrado"}
          description={showInactive ? "Não há almoxarifados desativados no momento" : "Comece cadastrando seu primeiro almoxarifado"}
          action={
            !showInactive && (
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Cadastrar Almoxarifado
              </Button>
            )
          }
        />
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="space-y-3 md:hidden">
            {filteredWarehouses.map((warehouse) => {
              const isInactive = (warehouse as any).is_active === false;
              return (
                <div
                  key={warehouse.id}
                  className={`rounded-lg border p-4 ${
                    isInactive ? "border-muted bg-muted/30 opacity-75" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{warehouse.name}</p>
                        {isInactive && (
                          <Badge variant="secondary" className="gap-1 text-xs">
                            <Ban className="h-3 w-3" />
                            Desativado
                          </Badge>
                        )}
                      </div>
                      {warehouse.location && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">{warehouse.location}</span>
                        </p>
                      )}
                      {warehouse.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {warehouse.description}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {isInactive ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReactivate(warehouse)}
                          className="gap-1 text-green-600 border-green-200 hover:bg-green-50"
                        >
                          <RotateCcw className="h-4 w-4" />
                          Reativar
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(warehouse)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(warehouse)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Localização</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-32">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWarehouses.map((warehouse) => {
                  const isInactive = (warehouse as any).is_active === false;
                  return (
                    <TableRow
                      key={warehouse.id}
                      className={isInactive ? "bg-muted/30 opacity-75" : ""}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {warehouse.name}
                          {isInactive && (
                            <Badge variant="secondary" className="gap-1 text-xs">
                              <Ban className="h-3 w-3" />
                              Desativado
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {warehouse.location ? (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            {warehouse.location}
                          </span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {warehouse.description || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {isInactive ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReactivate(warehouse)}
                              className="gap-1 text-green-600 border-green-200 hover:bg-green-50"
                            >
                              <RotateCcw className="h-4 w-4" />
                              Reativar
                            </Button>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenDialog(warehouse)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteClick(warehouse)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* Delete/Deactivate Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isCheckingAssociations
                ? "Verificando..."
                : hasAssociations
                ? "Desativar almoxarifado?"
                : "Excluir almoxarifado?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isCheckingAssociations ? (
                "Verificando associações..."
              ) : hasAssociations ? (
                <>
                  O almoxarifado <strong>{warehouseToDelete?.name}</strong> possui ferramentas ou
                  usuários vinculados e não pode ser excluído permanentemente.
                  <br />
                  <br />
                  Ao desativar, ele ficará oculto nas listagens mas os dados serão
                  preservados. Você poderá reativá-lo posteriormente.
                </>
              ) : (
                <>
                  Você está prestes a excluir permanentemente o almoxarifado{" "}
                  <strong>{warehouseToDelete?.name}</strong>.
                  <br />
                  <br />
                  Esta ação não pode ser desfeita.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting || isCheckingAssociations}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting || isCheckingAssociations}
              className={hasAssociations ? "" : "bg-destructive text-destructive-foreground hover:bg-destructive/90"}
            >
              {isDeleting
                ? "Processando..."
                : hasAssociations
                ? "Desativar"
                : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
