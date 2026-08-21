import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Frequency {
  id: string;
  name: string;
  label: string;
  description: string | null;
  interval_days: number | null;
  is_system: boolean;
  is_active: boolean;
}

export function useFrequencies() {
  return useQuery({
    queryKey: ["frequencies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("frequencies")
        .select("*")
        .eq("is_active", true)
        .order("interval_days", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data || []) as Frequency[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Given a frequency name and the frequencies list, determine if a task
 * with that frequency should run on a given date.
 */
export function shouldFrequencyRunOnDate(
  frequencyName: string,
  frequencies: Frequency[],
  date: Date,
  referenceStartDate?: Date,
  workDays?: number[],
  lastExecutionDate?: Date
): boolean {
  // Check work_days availability filter first
  if (workDays && workDays.length > 0) {
    const dayOfWeek = date.getDay();
    if (!workDays.includes(dayOfWeek)) return false;
  }

  // On-demand tasks never auto-run
  if (frequencyName === "on_demand") return false;

  // Find frequency definition
  const freq = frequencies.find((f) => f.name === frequencyName);
  const intervalDays = freq?.interval_days;

  if (!intervalDays) {
    // Fallback for unknown frequencies
    if (frequencyName === "daily") return true;
    return false;
  }

  // Daily tasks always run on work days
  if (intervalDays === 1) return true;

  // If never executed before, make it available immediately
  if (!lastExecutionDate) return true;

  // Check if enough days have passed since last execution
  const daysSince = Math.floor(
    (date.getTime() - lastExecutionDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  return daysSince >= intervalDays;
}
