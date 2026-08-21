import { useEffect, useState, useCallback } from "react";
import { supabase, AppRole } from "@/lib/ferramentas/supabase";
import { useAuth } from "@/hooks/ferramentas/useAuth";

interface RolePermission {
  id: string;
  role: string;
  route: string;
  can_access: boolean;
}

export function usePermissions() {
  const { role } = useAuth();
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      const { data } = await supabase
        .from("ferr_role_permissions")
        .select("*")
        .order("route");
      
      setPermissions(data || []);
    } catch (error) {
      console.error("Error fetching permissions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const canAccess = useCallback((route: string): boolean => {
    if (!role) return false;
    
    // Admin sempre tem acesso
    if (role === "admin") return true;
    
    const permission = permissions.find(
      (p) => p.role === role && p.route === route
    );
    
    // Se não há permissão definida, nega acesso por padrão
    return permission?.can_access ?? false;
  }, [role, permissions]);

  const getPermissionsByRole = useCallback((targetRole: AppRole) => {
    return permissions.filter((p) => p.role === targetRole);
  }, [permissions]);

  return {
    permissions,
    isLoading,
    canAccess,
    getPermissionsByRole,
    refetch: fetchPermissions,
  };
}
