import { useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cacheData, getCachedData } from "@/lib/operacional-hub/offlineDb";

/**
 * Caches essential task data to IndexedDB when online,
 * so it can be read when offline.
 */
export function useOfflineTaskCache(userId: string | undefined, establishmentId: string | null) {
  const cacheKey = `tasks_${userId}_${establishmentId}`;
  const templateCacheKey = `templates_${establishmentId}`;

  const cacheTasksData = useCallback(async () => {
    if (!userId || !establishmentId || !navigator.onLine) return;

    try {
      // Cache today's task executions with template info
      const today = new Date().toISOString().split("T")[0];
      const { data: executions } = await supabase
        .from("op_task_executions")
        .select(`
          *,
          task_template:task_templates(
            id, name, description, frequency, estimated_time_minutes,
            requires_photo, requires_before_after_photo, checklist,
            min_execution_minutes, is_outdoor, sla_minutes, priority,
            required_workers, location_photos, sector_id,
            sector:sectors(id, name, color),
            job_function:job_functions(id, name)
          )
        `)
        .eq("scheduled_date", today)
        .eq("establishment_id", establishmentId);

      if (executions) {
        await cacheData(cacheKey, executions);
      }

      // Cache profiles for team member display
      const { data: profiles } = await supabase
        .from("op_profiles")
        .select("id, user_id, full_name")
        .eq("establishment_id", establishmentId);

      if (profiles) {
        await cacheData(`profiles_${establishmentId}`, profiles);
      }
    } catch (err) {
      console.warn("Failed to cache task data:", err);
    }
  }, [userId, establishmentId, cacheKey]);

  // Cache on mount and periodically
  useEffect(() => {
    cacheTasksData();
    const interval = setInterval(cacheTasksData, 5 * 60 * 1000); // every 5 min
    return () => clearInterval(interval);
  }, [cacheTasksData]);

  const getCachedTasks = useCallback(async () => {
    return getCachedData<any[]>(cacheKey);
  }, [cacheKey]);

  const getCachedProfiles = useCallback(async () => {
    return getCachedData<any[]>(`profiles_${establishmentId}`);
  }, [establishmentId]);

  return { cacheTasksData, getCachedTasks, getCachedProfiles };
}
