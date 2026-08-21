import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface WeatherCondition {
  isRaining: boolean;
  conditionId: string | null;
  loading: boolean;
}

export function useWeatherCondition() {
  const { user } = useAuth();
  const [condition, setCondition] = useState<WeatherCondition>({
    isRaining: false,
    conditionId: null,
    loading: true,
  });

  useEffect(() => {
    checkCurrentCondition();
    
    // Subscribe to realtime changes
    const channel = supabase
      .channel('weather-conditions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'operational_conditions',
          filter: "type=eq.weather"
        },
        () => {
          checkCurrentCondition();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const checkCurrentCondition = async () => {
    try {
      const { data, error } = await supabase
        .from("op_operational_conditions")
        .select("id, is_active")
        .eq("type", "weather")
        .eq("name", "Chuva")
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;

      setCondition({
        isRaining: !!data,
        conditionId: data?.id || null,
        loading: false,
      });
    } catch (error) {
      console.error("Error checking weather condition:", error);
      setCondition(prev => ({ ...prev, loading: false }));
    }
  };

  const toggleRain = async () => {
    if (!user) return { error: "Not authenticated" };

    try {
      if (condition.isRaining && condition.conditionId) {
        // Turn off rain - deactivate the condition
        const { error } = await supabase
          .from("op_operational_conditions")
          .update({ is_active: false })
          .eq("id", condition.conditionId);

        if (error) throw error;
      } else {
        // Turn on rain - create or reactivate condition
        const { data: existing } = await supabase
          .from("op_operational_conditions")
          .select("id")
          .eq("type", "weather")
          .eq("name", "Chuva")
          .maybeSingle();

        if (existing) {
          // Reactivate existing condition
          const { error } = await supabase
            .from("op_operational_conditions")
            .update({ 
              is_active: true, 
              started_at: new Date().toISOString(),
              expected_end_at: null 
            })
            .eq("id", existing.id);

          if (error) throw error;
        } else {
          // Create new condition
          const { error } = await supabase
            .from("op_operational_conditions")
            .insert({
              type: "weather",
              name: "Chuva",
              description: "Condição de chuva ativada manualmente",
              severity: "warning",
              is_active: true,
              affects_outdoor_tasks: true,
              created_by_user_id: user.id,
            });

          if (error) throw error;
        }
      }

      await checkCurrentCondition();
      return { error: null };
    } catch (error: any) {
      console.error("Error toggling rain:", error);
      return { error: error.message };
    }
  };

  return {
    ...condition,
    toggleRain,
    refresh: checkCurrentCondition,
  };
}
