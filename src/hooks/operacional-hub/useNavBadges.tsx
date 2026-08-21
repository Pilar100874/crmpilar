import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface NavBadges {
  pendingApprovals: number;
  toolsNeedRepair: number;
  lowStockMaterials: number;
}

export function useNavBadges() {
  const [badges, setBadges] = useState<NavBadges>({
    pendingApprovals: 0,
    toolsNeedRepair: 0,
    lowStockMaterials: 0,
  });

  useEffect(() => {
    const fetchBadges = async () => {
      const [approvalsRes, toolsRes, materialsRes] = await Promise.all([
        supabase
          .from("task_templates")
          .select("id", { count: "exact", head: true })
          .eq("is_irregularity_template", true)
          .eq("approval_status", "pending"),
        supabase
          .from("tools")
          .select("id", { count: "exact", head: true })
          .eq("needs_repair", true),
        supabase
          .from("materials")
          .select("id, current_stock, min_stock")
          .gt("min_stock", 0),
      ]);

      const lowStock = (materialsRes.data || []).filter(
        (m) => (m.current_stock ?? 0) <= (m.min_stock ?? 0)
      ).length;

      setBadges({
        pendingApprovals: approvalsRes.count ?? 0,
        toolsNeedRepair: toolsRes.count ?? 0,
        lowStockMaterials: lowStock,
      });
    };

    fetchBadges();
    const interval = setInterval(fetchBadges, 30000);
    return () => clearInterval(interval);
  }, []);

  return badges;
}
