import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useAppBadge() {
  const { user } = useAuth();

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["unread-notifications-count", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      
      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
    refetchInterval: 30000, // Atualiza a cada 30 segundos
  });

  useEffect(() => {
    // Atualiza o badge do PWA quando o contador muda
    const nav = navigator as any;
    if (typeof nav.setAppBadge === "function") {
      if (unreadCount > 0) {
        nav.setAppBadge(unreadCount).catch(console.error);
      } else if (typeof nav.clearAppBadge === "function") {
        nav.clearAppBadge().catch(console.error);
      }
    }
  }, [unreadCount]);

  return { unreadCount };
}

// Função utilitária para atualizar o badge manualmente
export async function updateAppBadge(count: number) {
  const nav = navigator as any;
  if (typeof nav.setAppBadge === "function") {
    try {
      if (count > 0) {
        await nav.setAppBadge(count);
      } else if (typeof nav.clearAppBadge === "function") {
        await nav.clearAppBadge();
      }
    } catch (error) {
      console.error("Error updating app badge:", error);
    }
  }
}

// Função para limpar o badge
export async function clearAppBadge() {
  const nav = navigator as any;
  if (typeof nav.clearAppBadge === "function") {
    try {
      await nav.clearAppBadge();
    } catch (error) {
      console.error("Error clearing app badge:", error);
    }
  }
}
