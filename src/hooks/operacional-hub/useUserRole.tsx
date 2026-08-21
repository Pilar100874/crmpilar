import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

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
          .single();

        if (error) {
          console.error("Error fetching user role:", error);
          setRole("worker");
        } else {
          setRole(data?.role as AppRole || "worker");
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
        setRole("worker");
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
