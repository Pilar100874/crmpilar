import { useEffect, useState } from "react";
import { AppLayout } from "@/components/operacional-hub/layout/AppLayout";
import { Users as UsersIcon, User, Edit2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/hooks/operacional-hub/useUserRole";
import { CreateUserDialog } from "@/components/operacional-hub/users/CreateUserDialog";
import { EditUserDialog } from "@/components/operacional-hub/users/EditUserDialog";
import { Button } from "@/components/ui/button";

interface UserProfile {
  id: string;
  userAuthId: string;
  fullName: string;
  email: string;
  phone: string | null;
  jobFunction: string | null;
  jobFunctionId: string | null;
  shift: string | null;
  shiftId: string | null;
  role: string;
  isActive: boolean;
  isOnVacation: boolean;
}

export default function Users() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from("op_profiles")
        .select(`
          id,
          user_id,
          full_name,

          is_active,
          is_on_vacation,
          job_function_id,
          shift_id,
          job_functions:op_job_functions(name),
          shifts:op_shifts(name)
        `)
        .order("full_name");

      if (error) throw error;

      // Get roles for each user
      const userIds = profiles?.map((p) => p.user_id) || [];
      const { data: roles } = await supabase
        .from("op_user_roles")
        .select("user_id, role")
        .in("user_id", userIds);

      const rolesMap = new Map(roles?.map((r) => [r.user_id, r.role]) || []);

      setUsers(
        (profiles || []).map((p) => ({
          id: p.id,
          userAuthId: p.user_id,
          fullName: p.full_name,
          email: "",
          phone: null,

          jobFunction: p.job_functions?.name || null,
          jobFunctionId: p.job_function_id,
          shift: p.shifts?.name || null,
          shiftId: p.shift_id,
          role: rolesMap.get(p.user_id) || "worker",
          isActive: p.is_active || false,
          isOnVacation: p.is_on_vacation || false,
        }))
      );
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const roleLabels: Record<string, string> = {
    admin: "Administrador",
    manager: "Gestor",
    worker: "Colaborador",
  };

  const roleColors: Record<string, string> = {
    admin: "bg-primary text-primary-foreground",
    manager: "bg-warning text-warning-foreground",
    worker: "bg-muted text-muted-foreground",
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">Usuários</h1>
            <p className="text-muted-foreground">
              Gerencie os colaboradores do sistema
            </p>
          </div>
          {!roleLoading && isAdmin && (
            <CreateUserDialog onUserCreated={fetchUsers} />
          )}
        </div>

        {/* Info */}
        <div className="bg-muted/50 border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">
            💡 <strong>Dica:</strong> Vincule cada colaborador a uma <strong>Função</strong> para que as tarefas sejam atribuídas automaticamente.
          </p>
        </div>

        {/* List */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 rounded-xl border border-border bg-card">
              <UsersIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum usuário cadastrado</p>
              {isAdmin && (
                <p className="text-sm text-muted-foreground mt-2">
                  Clique em "Novo Usuário" para adicionar colaboradores
                </p>
              )}
            </div>
          ) : (
            users.map((user) => (
              <div
                key={user.id}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-xl border bg-card",
                  !user.isActive && "opacity-50"
                )}
              >
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{user.fullName}</p>
                    {user.isOnVacation && (
                      <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-accent text-accent-foreground">
                        🏖️ Férias
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {user.jobFunction ? (
                      <span className="text-primary font-medium">{user.jobFunction}</span>
                    ) : (
                      <span className="text-warning">Sem função</span>
                    )}
                    {user.shift && (
                      <>
                        <span>•</span>
                        <span>{user.shift}</span>
                      </>
                    )}
                  </div>
                </div>
                <span
                  className={cn(
                    "px-2 py-1 rounded-md text-xs font-medium",
                    roleColors[user.role]
                  )}
                >
                  {roleLabels[user.role]}
                </span>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditingUser(user)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      {editingUser && (
        <EditUserDialog
          open={!!editingUser}
          onOpenChange={(open) => !open && setEditingUser(null)}
          userId={editingUser.id}
          userAuthId={editingUser.userAuthId}
          userName={editingUser.fullName}
          currentJobFunctionId={editingUser.jobFunctionId}
          currentShiftId={editingUser.shiftId}
          currentIsOnVacation={editingUser.isOnVacation}
          onUserUpdated={fetchUsers}
        />
      )}
    </AppLayout>
  );
}
