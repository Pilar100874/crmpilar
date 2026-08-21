import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/ferramentas/useAuth";

export function usePendingRenewals() {
  const { isAdmin, isAlmoxarifado } = useAuth();
  const isStaff = isAdmin || isAlmoxarifado;

  const { data: pendingCount = 0, isLoading } = useQuery({
    queryKey: ["pending-renewals-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("ferr_loan_renewals")
        .select("*", { count: "exact", head: true })
        .eq("status", "pendente");

      if (error) throw error;
      return count || 0;
    },
    enabled: isStaff,
    refetchInterval: 30000, // Atualiza a cada 30 segundos
  });

  return {
    pendingCount: isStaff ? pendingCount : 0,
    isLoading,
    hasPending: isStaff && pendingCount > 0,
  };
}
