import { useEffect, useState } from "react";
import { supabase } from "@/lib/ferramentas/supabase";
import { useAuth } from "./useAuth";

export function usePendingApprovals() {
  const { isAdmin, isAlmoxarifado } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const isStaff = isAdmin || isAlmoxarifado;

  useEffect(() => {
    if (!isStaff) {
      setPendingCount(0);
      setIsLoading(false);
      return;
    }

    const fetchPendingApprovals = async () => {
      try {
        const { count, error } = await supabase
          .from("ferr_profiles")
          .select("id", { count: "exact", head: true })
          .eq("is_approved", false);

        if (error) throw error;
        setPendingCount(count || 0);
      } catch (error) {
        console.error("Error fetching pending approvals:", error);
        setPendingCount(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPendingApprovals();

    // Subscribe to changes in profiles table
    const channel = supabase
      .channel("pending-approvals")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ferr_profiles",
        },
        () => {
          fetchPendingApprovals();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isStaff]);

  return {
    pendingCount,
    hasPending: pendingCount > 0,
    isLoading,
  };
}
