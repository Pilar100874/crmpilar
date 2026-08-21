import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase, Profile, UserRole, AppRole, Warehouse } from "@/lib/supabase";
import { Users, Plus, Edit, Shield, ShieldCheck, User, Key, Warehouse as WarehouseIcon, UserCheck, Clock, Ban, RotateCcw, Search } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface UserWarehouseData {
  warehouse_id: string;
}

interface UserWithRole extends Profile {
  user_roles?: UserRole;
  warehouse?: Warehouse;
  user_warehouses?: UserWarehouseData[];
}

const roleLabels: Record<AppRole, string> = {
  admin: "Administrador",
  almoxarifado: "Almoxarifado",
  usuario: "Usuário",
};

const roleIcons: Record<AppRole, React.ElementType> = {
  admin: ShieldCheck,
  almoxarifado: Shield,
  usuario: User,
};

export default function UsersPage() {
  const { isAdmin, profile: currentProfile, session } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [userWarehouses, setUserWarehouses] = useState<{ user_id: string; warehouse_id: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [approvingUser, setApprovingUser] = useState<UserWithRole | null>(null);
  const [passwordUser, setPasswordUser] = useState<UserWithRole | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("approved");
  const [searchTerm, setSearchTerm] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  // Form state for edit
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    role: "usuario" as AppRole,
    allow_relend: false,
    warehouse_ids: [] as string[],
  });

  // Form state for create
  const [createFormData, setCreateFormData] = useState({
    email: "",
    password: "",
    full_name: "",
    phone: "",
    role: "usuario" as AppRole,
    allow_relend: false,
    warehouse_ids: [] as string[],
  });

  // Form state for password
  const [newPassword, setNewPassword] = useState("");

  // Form state for approve
  const [approveFormData, setApproveFormData] = useState({
    warehouse_ids: [] as string[],
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, warehousesRes, rolesRes, userWarehousesRes] = await Promise.all([
        supabase.from("profiles").select("*").order("full_name"),
        supabase.from("warehouses").select("*").order("name"),
        supabase.from("user_roles").select("*"),
        supabase.from("user_warehouses").select("user_id, warehouse_id"),
      ]);

      const usersWithRoles = (usersRes.data || []).map((user) => ({
        ...user,
        user_roles: (rolesRes.data || []).find((r) => r.user_id === user.id),
        user_warehouses: (userWarehousesRes.data || []).filter((uw) => uw.user_id === user.id),
      }));

      setUsers(usersWithRoles as UserWithRole[]);
      setWarehouses((warehousesRes.data as Warehouse[]) || []);
      setRoles((rolesRes.data as UserRole[]) || []);
      setUserWarehouses(userWarehousesRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (user: UserWithRole) => {
    setEditingUser(user);
    const userWarehouseIds = (user.user_warehouses || []).map(uw => uw.warehouse_id);
    setFormData({
      full_name: user.full_name,
      phone: user.phone || "",
      role: user.user_roles?.role || "usuario",
      allow_relend: user.allow_relend,
      warehouse_ids: userWarehouseIds,
    });
    setIsDialogOpen(true);
  };

  const handleCreateUser = async () => {
    if (!createFormData.email || !createFormData.password || !createFormData.full_name) {
      toast({ variant: "destructive", title: "Preencha todos os campos obrigatórios" });
      return;
    }

    if (createFormData.password.length < 6) {
      toast({ variant: "destructive", title: "A senha deve ter pelo menos 6 caracteres" });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await supabase.functions.invoke("admin-create-user", {
        body: {
          ...createFormData,
          warehouse_ids: createFormData.warehouse_ids,
        },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);

      toast({ title: "Usuário criado com sucesso!" });
      setIsCreateDialogOpen(false);
      setCreateFormData({
        email: "",
        password: "",
        full_name: "",
        phone: "",
        role: "usuario",
        allow_relend: false,
        warehouse_ids: [],
      });
      fetchData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!passwordUser || !newPassword) return;

    if (newPassword.length < 6) {
      toast({ variant: "destructive", title: "A senha deve ter pelo menos 6 caracteres" });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await supabase.functions.invoke("admin-update-password", {
        body: { user_id: passwordUser.id, new_password: newPassword },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);

      toast({ title: "Senha alterada com sucesso!" });
      setIsPasswordDialogOpen(false);
      setPasswordUser(null);
      setNewPassword("");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenPasswordDialog = (user: UserWithRole) => {
    setPasswordUser(user);
    setNewPassword("");
    setIsPasswordDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!editingUser) return;

    setIsSubmitting(true);
    try {
      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name,
          phone: formData.phone || null,
          allow_relend: formData.allow_relend,
        })
        .eq("id", editingUser.id);

      if (profileError) throw profileError;

      // Update role
      const { error: roleError } = await supabase
        .from("user_roles")
        .update({ role: formData.role })
        .eq("user_id", editingUser.id);

      if (roleError) throw roleError;

      // Update user warehouses - delete existing and insert new
      const { error: deleteError } = await supabase
        .from("user_warehouses")
        .delete()
        .eq("user_id", editingUser.id);

      if (deleteError) throw deleteError;

      if (formData.warehouse_ids.length > 0) {
        const warehouseInserts = formData.warehouse_ids.map(wid => ({
          user_id: editingUser.id,
          warehouse_id: wid,
        }));

        const { error: insertError } = await supabase
          .from("user_warehouses")
          .insert(warehouseInserts);

        if (insertError) throw insertError;
      }

      toast({ title: "Usuário atualizado com sucesso!" });
      setIsDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleWarehouse = (warehouseId: string, context: "edit" | "create" | "approve" = "edit") => {
    if (context === "create") {
      setCreateFormData(prev => ({
        ...prev,
        warehouse_ids: prev.warehouse_ids.includes(warehouseId)
          ? prev.warehouse_ids.filter(id => id !== warehouseId)
          : [...prev.warehouse_ids, warehouseId],
      }));
    } else if (context === "approve") {
      setApproveFormData(prev => ({
        ...prev,
        warehouse_ids: prev.warehouse_ids.includes(warehouseId)
          ? prev.warehouse_ids.filter(id => id !== warehouseId)
          : [...prev.warehouse_ids, warehouseId],
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        warehouse_ids: prev.warehouse_ids.includes(warehouseId)
          ? prev.warehouse_ids.filter(id => id !== warehouseId)
          : [...prev.warehouse_ids, warehouseId],
      }));
    }
  };

  const getUserWarehouseNames = (user: UserWithRole) => {
    const userWhs = user.user_warehouses || [];
    return userWhs
      .map(uw => warehouses.find(w => w.id === uw.warehouse_id)?.name)
      .filter(Boolean)
      .join(", ") || "-";
  };

  const handleOpenApproveDialog = (user: UserWithRole) => {
    setApprovingUser(user);
    setApproveFormData({ warehouse_ids: [] });
    setIsApproveDialogOpen(true);
  };

  const handleApproveUser = async () => {
    if (!approvingUser || !currentProfile) return;

    if (approveFormData.warehouse_ids.length === 0) {
      toast({ variant: "destructive", title: "Selecione pelo menos um almoxarifado" });
      return;
    }

    setIsSubmitting(true);
    try {
      // Approve the user
      const { error: approveError } = await supabase
        .from("profiles")
        .update({
          is_approved: true,
          approved_at: new Date().toISOString(),
          approved_by: currentProfile.id,
        })
        .eq("id", approvingUser.id);

      if (approveError) throw approveError;

      // Insert warehouse associations
      const warehouseInserts = approveFormData.warehouse_ids.map(wid => ({
        user_id: approvingUser.id,
        warehouse_id: wid,
      }));

      const { error: warehouseError } = await supabase
        .from("user_warehouses")
        .insert(warehouseInserts);

      if (warehouseError) throw warehouseError;

      toast({ title: "Usuário aprovado com sucesso!" });
      setIsApproveDialogOpen(false);
      setApprovingUser(null);
      fetchData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReactivateUser = async (user: UserWithRole) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_active: true })
        .eq("id", user.id);
      if (error) throw error;
      toast({ title: "Usuário reativado com sucesso!" });
      fetchData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    }
  };

  const handleDeactivateUser = async (user: UserWithRole) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_active: false })
        .eq("id", user.id);
      if (error) throw error;
      toast({ title: "Usuário desativado com sucesso!" });
      fetchData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    }
  };

  // Filter users
  const activeApprovedUsers = users.filter(u => u.is_approved && (u as any).is_active !== false);
  const inactiveUsers = users.filter(u => (u as any).is_active === false);
  const pendingUsers = users.filter(u => !u.is_approved && (u as any).is_active !== false);
  
  const filteredActiveUsers = activeApprovedUsers.filter(u =>
    u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredInactiveUsers = inactiveUsers.filter(u =>
    u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredPendingUsers = pendingUsers.filter(u =>
    u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const approvedUsers = showInactive ? filteredInactiveUsers : filteredActiveUsers;
  const totalInactive = inactiveUsers.length;

  if (!isAdmin) {
    return (
      <MainLayout>
        <EmptyState
          icon={Users}
          title="Acesso Restrito"
          description="Apenas administradores podem gerenciar usuários"
        />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageHeader
        title="Usuários"
        description="Gerencie os usuários do sistema"
        action={
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Usuário
          </Button>
        }
      />

      {/* Tabs */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <TabsList>
              <TabsTrigger value="approved" className="gap-2">
                <UserCheck className="h-4 w-4" />
                Aprovados ({activeApprovedUsers.length})
              </TabsTrigger>
              <TabsTrigger value="pending" className="gap-2">
                <Clock className="h-4 w-4" />
                Pendentes ({filteredPendingUsers.length})
              </TabsTrigger>
            </TabsList>
            <div className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar usuários..."
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
                  className="gap-2 shrink-0"
                >
                  <Ban className="h-4 w-4" />
                  {showInactive ? "Ver ativos" : `Desativados (${totalInactive})`}
                </Button>
              )}
            </div>
          </div>

          {/* Approved Users Tab */}
          <TabsContent value="approved">
            {approvedUsers.length === 0 ? (
              <EmptyState
                icon={Users}
                title={showInactive ? "Nenhum usuário desativado" : "Nenhum usuário encontrado"}
                description={showInactive ? "Não há usuários desativados no momento" : "Os usuários aparecerão aqui após serem aprovados"}
              />
            ) : (
              <>
                {/* Mobile Cards */}
                <div className="space-y-3 md:hidden">
                  {approvedUsers.map((user) => {
                    const role = user.user_roles?.role || "usuario";
                    const RoleIcon = roleIcons[role];
                    const warehouseCount = user.user_warehouses?.length || 0;
                    const isInactive = (user as any).is_active === false;
                    return (
                      <div
                        key={user.id}
                        className={`rounded-lg border p-4 ${
                          isInactive ? "border-muted bg-muted/30 opacity-75" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium truncate">{user.full_name}</p>
                              {isInactive && (
                                <Badge variant="secondary" className="gap-1 text-xs">
                                  <Ban className="h-3 w-3" />
                                  Desativado
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                            <div className="mt-2 flex flex-wrap gap-1">
                              <Badge variant="secondary" className="gap-1 text-xs">
                                <RoleIcon className="h-3 w-3" />
                                {roleLabels[role]}
                              </Badge>
                              {!isInactive && (
                                <>
                                  <Badge variant={user.allow_relend ? "default" : "secondary"} className="text-xs">
                                    {user.allow_relend ? "Reempréstimo" : "Sem reempréstimo"}
                                  </Badge>
                                  {warehouseCount > 0 && (
                                    <Badge variant="outline" className="gap-1 text-xs">
                                      <WarehouseIcon className="h-3 w-3" />
                                      {warehouseCount} almox.
                                    </Badge>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            {isInactive ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleReactivateUser(user)}
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
                                  onClick={() => handleOpenDialog(user)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleOpenPasswordDialog(user)}
                                >
                                  <Key className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeactivateUser(user)}
                                  title="Desativar usuário"
                                  disabled={user.id === currentProfile?.id}
                                >
                                  <Ban className="h-4 w-4 text-destructive" />
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
                <div className="hidden md:block rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Função</TableHead>
                        <TableHead>Almoxarifados</TableHead>
                        <TableHead>Reempréstimo</TableHead>
                        <TableHead className="w-32">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {approvedUsers.map((user) => {
                        const role = user.user_roles?.role || "usuario";
                        const RoleIcon = roleIcons[role];
                        const isInactive = (user as any).is_active === false;
                        return (
                          <TableRow
                            key={user.id}
                            className={isInactive ? "bg-muted/30 opacity-75" : ""}
                          >
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {user.full_name}
                                {isInactive && (
                                  <Badge variant="secondary" className="gap-1 text-xs">
                                    <Ban className="h-3 w-3" />
                                    Desativado
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="gap-1">
                                <RoleIcon className="h-3 w-3" />
                                {roleLabels[role]}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {isInactive ? "-" : getUserWarehouseNames(user)}
                            </TableCell>
                            <TableCell>
                              {isInactive ? (
                                <span className="text-muted-foreground">-</span>
                              ) : (
                                <Badge variant={user.allow_relend ? "default" : "secondary"}>
                                  {user.allow_relend ? "Sim" : "Não"}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {isInactive ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleReactivateUser(user)}
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
                                      onClick={() => handleOpenDialog(user)}
                                      title="Editar"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleOpenPasswordDialog(user)}
                                      title="Alterar Senha"
                                    >
                                      <Key className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleDeactivateUser(user)}
                                      title="Desativar usuário"
                                      disabled={user.id === currentProfile?.id}
                                    >
                                      <Ban className="h-4 w-4 text-destructive" />
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
          </TabsContent>

          {/* Pending Users Tab */}
          <TabsContent value="pending">
            {filteredPendingUsers.length === 0 ? (
              <EmptyState
                icon={Clock}
                title="Nenhum usuário pendente"
                description="Quando novos usuários se cadastrarem, aparecerão aqui para aprovação"
              />
            ) : (
              <>
                {/* Mobile Cards */}
                <div className="space-y-3 md:hidden">
                  {filteredPendingUsers.map((user) => (
                    <div key={user.id} className="rounded-lg border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{user.full_name}</p>
                          <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Cadastrado em: {format(new Date(user.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleOpenApproveDialog(user)}
                        >
                          <UserCheck className="mr-2 h-4 w-4" />
                          Aprovar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Data de Cadastro</TableHead>
                        <TableHead className="w-32">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPendingUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.full_name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            {format(new Date(user.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              onClick={() => handleOpenApproveDialog(user)}
                            >
                              <UserCheck className="mr-2 h-4 w-4" />
                              Aprovar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>
              Atualize as informações e permissões do usuário
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nome Completo</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(11) 99999-9999"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Função</Label>
              <Select
                value={formData.role}
                onValueChange={(v) => setFormData({ ...formData, role: v as AppRole })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="almoxarifado">Almoxarifado</SelectItem>
                  <SelectItem value="usuario">Usuário</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Almoxarifados Permitidos</Label>
              <ScrollArea className="h-[150px] rounded-md border p-3">
                <div className="space-y-2">
                  {warehouses.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum almoxarifado cadastrado</p>
                  ) : (
                    warehouses.map((w) => (
                      <div key={w.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`wh-${w.id}`}
                          checked={formData.warehouse_ids.includes(w.id)}
                          onCheckedChange={() => toggleWarehouse(w.id)}
                        />
                        <label
                          htmlFor={`wh-${w.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {w.name}
                        </label>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
              <p className="text-xs text-muted-foreground">
                O usuário só poderá ver e solicitar ferramentas dos almoxarifados selecionados
              </p>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <Label htmlFor="allow_relend" className="cursor-pointer">
                Permitir Reempréstimo
              </Label>
              <Switch
                id="allow_relend"
                checked={formData.allow_relend}
                onCheckedChange={(v) => setFormData({ ...formData, allow_relend: v })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Criar Novo Usuário</DialogTitle>
            <DialogDescription>
              Preencha os dados para criar um novo usuário no sistema
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="create_email">Email *</Label>
              <Input
                id="create_email"
                type="email"
                value={createFormData.email}
                onChange={(e) => setCreateFormData({ ...createFormData, email: e.target.value })}
                placeholder="usuario@email.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create_password">Senha *</Label>
              <Input
                id="create_password"
                type="password"
                value={createFormData.password}
                onChange={(e) => setCreateFormData({ ...createFormData, password: e.target.value })}
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create_full_name">Nome Completo *</Label>
              <Input
                id="create_full_name"
                value={createFormData.full_name}
                onChange={(e) => setCreateFormData({ ...createFormData, full_name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create_phone">Telefone</Label>
              <Input
                id="create_phone"
                value={createFormData.phone}
                onChange={(e) => setCreateFormData({ ...createFormData, phone: e.target.value })}
                placeholder="(11) 99999-9999"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create_role">Função</Label>
              <Select
                value={createFormData.role}
                onValueChange={(v) => setCreateFormData({ ...createFormData, role: v as AppRole })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="almoxarifado">Almoxarifado</SelectItem>
                  <SelectItem value="usuario">Usuário</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Almoxarifados Permitidos</Label>
              <ScrollArea className="h-[150px] rounded-md border p-3">
                <div className="space-y-2">
                  {warehouses.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum almoxarifado cadastrado</p>
                  ) : (
                    warehouses.map((w) => (
                      <div key={w.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`create-wh-${w.id}`}
                          checked={createFormData.warehouse_ids.includes(w.id)}
                          onCheckedChange={() => toggleWarehouse(w.id, "create")}
                        />
                        <label
                          htmlFor={`create-wh-${w.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {w.name}
                        </label>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <Label htmlFor="create_allow_relend" className="cursor-pointer">
                Permitir Reempréstimo
              </Label>
              <Switch
                id="create_allow_relend"
                checked={createFormData.allow_relend}
                onCheckedChange={(v) => setCreateFormData({ ...createFormData, allow_relend: v })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button onClick={handleCreateUser} disabled={isSubmitting}>
              {isSubmitting ? "Criando..." : "Criar Usuário"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Password Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Senha</DialogTitle>
            <DialogDescription>
              Defina uma nova senha para {passwordUser?.full_name}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new_password">Nova Senha</Label>
              <Input
                id="new_password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button onClick={handleUpdatePassword} disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Salvar Senha"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve User Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Aprovar Usuário</DialogTitle>
            <DialogDescription>
              Aprove o usuário <strong>{approvingUser?.full_name}</strong> e defina os almoxarifados que ele poderá acessar
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <p className="text-sm text-muted-foreground">{approvingUser?.email}</p>
            </div>

            <div className="space-y-2">
              <Label>Almoxarifados Permitidos *</Label>
              <ScrollArea className="h-[150px] rounded-md border p-3">
                <div className="space-y-2">
                  {warehouses.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum almoxarifado cadastrado</p>
                  ) : (
                    warehouses.map((w) => (
                      <div key={w.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`approve-wh-${w.id}`}
                          checked={approveFormData.warehouse_ids.includes(w.id)}
                          onCheckedChange={() => toggleWarehouse(w.id, "approve")}
                        />
                        <label
                          htmlFor={`approve-wh-${w.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {w.name}
                        </label>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
              <p className="text-xs text-muted-foreground">
                O usuário terá função "Usuário" e só poderá ver ferramentas dos almoxarifados selecionados
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button onClick={handleApproveUser} disabled={isSubmitting}>
              {isSubmitting ? "Aprovando..." : "Aprovar Usuário"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
