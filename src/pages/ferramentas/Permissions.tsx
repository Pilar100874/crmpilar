import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase, AppRole } from "@/lib/supabase";
import { 
  Shield, 
  ShieldCheck, 
  User,
  Wrench,
  ClipboardList,
  Users,
  Warehouse,
  BoxesIcon,
  Bell,
  BarChart3,
  Settings,
  MapPin,
  ShoppingCart,
  Package,
  Lock,
  LayoutDashboard,
  RotateCcw,
  AlertTriangle,
  CalendarClock,
  Bot,
  CheckCircle2,
  XCircle
} from "lucide-react";

interface RolePermission {
  id: string;
  role: string;
  route: string;
  can_access: boolean;
}

const routeLabels: Record<string, { label: string; icon: React.ElementType; description: string }> = {
  "/": { label: "Dashboard", icon: LayoutDashboard, description: "Página inicial com estatísticas" },
  "/tools": { label: "Ferramentas", icon: Wrench, description: "Cadastro e gestão de ferramentas" },
  "/users": { label: "Usuários", icon: Users, description: "Gerenciamento de usuários" },
  "/warehouses": { label: "Almoxarifados", icon: Warehouse, description: "Cadastro de almoxarifados" },
  "/kits": { label: "Kits", icon: BoxesIcon, description: "Montagem de kits de ferramentas" },
  "/notifications": { label: "Notificações", icon: Bell, description: "Central de avisos" },
  "/reports": { label: "Relatórios", icon: BarChart3, description: "Relatórios e estatísticas" },
  "/settings": { label: "Configurações", icon: Settings, description: "Preferências do usuário" },
  "/tracking": { label: "Rastreamento", icon: MapPin, description: "Localização de usuários" },
  "/request-tools": { label: "Solicitar Ferramentas", icon: ShoppingCart, description: "Pedidos de empréstimo" },
  "/process-requests": { label: "Processar Solicitações", icon: Package, description: "Aprovar/rejeitar pedidos" },
  "/loan/return": { label: "Devolução", icon: ClipboardList, description: "Registrar devoluções" },
  "/loan/relend": { label: "Reempréstimo", icon: RotateCcw, description: "Transferir ferramentas" },
  "/loan/renewals": { label: "Prorrogações", icon: CalendarClock, description: "Aprovação de prorrogações" },
  "/permissions": { label: "Permissões", icon: Lock, description: "Controle de acesso" },
  "/return-issues": { label: "Ocorrências", icon: AlertTriangle, description: "Gestão de problemas" },
  "/tool-assistant": { label: "Assistente de IA", icon: Bot, description: "Sugestões inteligentes de ferramentas" },
  "/supplies": { label: "Insumos", icon: Package, description: "Controle de estoque de insumos" },
};

const roleLabels: Record<AppRole, { label: string; icon: React.ElementType; description: string; color: string }> = {
  admin: { label: "Administrador", icon: ShieldCheck, description: "Acesso total ao sistema", color: "text-primary" },
  almoxarifado: { label: "Almoxarifado", icon: Shield, description: "Gerencia ferramentas e empréstimos", color: "text-success" },
  usuario: { label: "Usuário", icon: User, description: "Solicita e devolve ferramentas", color: "text-info" },
};

export default function PermissionsPage() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<AppRole>("almoxarifado");

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      const { data } = await supabase
        .from("role_permissions")
        .select("*")
        .order("route");
      
      setPermissions(data || []);
    } catch (error) {
      console.error("Error fetching permissions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePermission = async (permissionId: string, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from("role_permissions")
        .update({ can_access: !currentValue })
        .eq("id", permissionId);

      if (error) throw error;

      setPermissions((prev) =>
        prev.map((p) =>
          p.id === permissionId ? { ...p, can_access: !currentValue } : p
        )
      );

      toast({ title: "Permissão atualizada!" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    }
  };

  const getRolePermissions = (role: AppRole) => {
    return permissions.filter((p) => p.role === role);
  };

  if (!isAdmin) {
    return (
      <MainLayout>
        <EmptyState
          icon={Lock}
          title="Acesso Restrito"
          description="Apenas administradores podem gerenciar permissões"
        />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageHeader
        title="Permissões de Acesso"
        description="Configure quais telas cada tipo de usuário pode acessar"
      />

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : (
        <Tabs value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
          {/* Role Selector */}
          <div className="mb-6 grid grid-cols-3 gap-2 sm:gap-3">
            {(Object.keys(roleLabels) as AppRole[]).map((role) => {
              const { label, icon: Icon, color } = roleLabels[role];
              const isSelected = selectedRole === role;
              const isDisabled = role === "admin";
              
              return (
                <button
                  key={role}
                  onClick={() => !isDisabled && setSelectedRole(role)}
                  disabled={isDisabled}
                  className={`
                    relative flex flex-col items-center gap-2 rounded-2xl border-2 p-3 sm:p-4 transition-all
                    ${isSelected 
                      ? "border-primary bg-primary/5 shadow-md" 
                      : "border-transparent bg-card hover:bg-muted/50"
                    }
                    ${isDisabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}
                  `}
                >
                  <div className={`flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl ${
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}>
                    <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <span className={`text-xs sm:text-sm font-medium ${isSelected ? "text-primary" : ""}`}>
                    {label}
                  </span>
                  {isSelected && (
                    <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                      <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {(Object.keys(roleLabels) as AppRole[]).map((role) => {
            const { label, description, icon: Icon } = roleLabels[role];
            const rolePerms = getRolePermissions(role);

            return (
              <TabsContent key={role} value={role} className="mt-0">
                {role === "admin" ? (
                  <Card className="border-2 border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                        <ShieldCheck className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="text-lg font-semibold">Acesso Total</h3>
                      <p className="mt-1 text-sm text-muted-foreground max-w-sm">
                        Administradores têm acesso irrestrito a todas as funcionalidades do sistema
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {rolePerms.map((permission) => {
                      const routeInfo = routeLabels[permission.route];
                      if (!routeInfo) return null;
                      const { label: routeLabel, icon: RouteIcon, description: routeDesc } = routeInfo;

                      return (
                        <div
                          key={permission.id}
                          className={`
                            flex items-center gap-3 rounded-2xl border p-3 sm:p-4 transition-all
                            ${permission.can_access 
                              ? "bg-card border-border" 
                              : "bg-muted/30 border-transparent"
                            }
                          `}
                        >
                          {/* Icon */}
                          <div className={`
                            flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl transition-colors
                            ${permission.can_access 
                              ? "bg-primary/10 text-primary" 
                              : "bg-muted text-muted-foreground"
                            }
                          `}>
                            <RouteIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                          </div>
                          
                          {/* Content */}
                          <div className="min-w-0 flex-1">
                            <p className={`font-medium text-sm sm:text-base ${
                              !permission.can_access ? "text-muted-foreground" : ""
                            }`}>
                              {routeLabel}
                            </p>
                            <p className="text-xs text-muted-foreground truncate hidden sm:block">
                              {routeDesc}
                            </p>
                          </div>
                          
                          {/* Status & Switch */}
                          <div className="flex items-center gap-2 sm:gap-3">
                            <div className={`
                              hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                              ${permission.can_access 
                                ? "bg-success/10 text-success" 
                                : "bg-muted text-muted-foreground"
                              }
                            `}>
                              {permission.can_access ? (
                                <>
                                  <CheckCircle2 className="h-3 w-3" />
                                  Permitido
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-3 w-3" />
                                  Bloqueado
                                </>
                              )}
                            </div>
                            <Switch
                              checked={permission.can_access}
                              onCheckedChange={() =>
                                togglePermission(permission.id, permission.can_access)
                              }
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      )}
    </MainLayout>
  );
}
