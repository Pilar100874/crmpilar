import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { isEstabelecimentoAdmin } from "@/lib/estabelecimentoUtils";

type AppRole = "admin" | "manager" | "worker" | "super_admin";

export function useUserRole() {
  const { user } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }

    const fetchRole = async () => {
      try {
        const { data, error } = await supabase
          .from("op_user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error || !data?.role) {
          // Usuário do CRM sem papel específico no Operacional Hub:
          // libera o menu completo (admin do CRM vira super_admin)
          const crmAdmin = await isEstabelecimentoAdmin().catch(() => false);
          setRole(crmAdmin ? "super_admin" : "admin");
        } else {
          setRole(data.role as AppRole);
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
        setRole("admin");
      } finally {
        setLoading(false);
      }
    };

    fetchRole();
  }, [user]);

  const isSuperAdmin = role === "super_admin";
  const isAdmin = role === "admin" || role === "super_admin";
  const isManager = role === "manager";
  const isAdminOrManager = role === "admin" || role === "manager" || role === "super_admin";

  return { role, loading, isSuperAdmin, isAdmin, isManager, isAdminOrManager };
}
