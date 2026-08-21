import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useEstablishment } from "./useEstablishment";

interface ShiftStatus {
  isCheckedIn: boolean;
  hasCheckedOutToday: boolean;
  checkInTime: string | null;
  loading: boolean;
}

export function useShiftStatus() {
  const { user } = useAuth();
  const { establishmentId } = useEstablishment();
  const [status, setStatus] = useState<ShiftStatus>({
    isCheckedIn: false,
    hasCheckedOutToday: false,
    checkInTime: null,
    loading: true,
  });

  useEffect(() => {
    if (user) {
      checkTodayAttendance();
    }
  }, [user]);

  const checkTodayAttendance = async () => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("op_daily_attendance")
        .select("checked_in_at, checked_out_at")
        .eq("user_id", user.id)
        .eq("attendance_date", today)
        .maybeSingle();

      if (error) throw error;

      setStatus({
        isCheckedIn: !!data && !data.checked_out_at,
        hasCheckedOutToday: !!data?.checked_out_at,
        checkInTime: data?.checked_in_at || null,
        loading: false,
      });
    } catch (error) {
      console.error("Error checking attendance:", error);
      setStatus(prev => ({ ...prev, loading: false }));
    }
  };

  const checkIn = async () => {
    if (!user) return { error: "Not authenticated" };

    try {
      const today = new Date().toISOString().split("T")[0];
      
      // Try to get geolocation
      let latitude = null;
      let longitude = null;
      
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 5000,
            enableHighAccuracy: false,
          });
        });
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
      } catch {
        // Geolocation not available or denied, proceed without it
      }

      // Check if there's an existing record for today (previously checked out)
      const { data: existing } = await supabase
        .from("op_daily_attendance")
        .select("id")
        .eq("user_id", user.id)
        .eq("attendance_date", today)
        .maybeSingle();

      if (existing) {
        // Re-open shift: clear checkout time and update check-in time
        const { error } = await supabase
          .from("op_daily_attendance")
          .update({
            checked_in_at: new Date().toISOString(),
            checked_out_at: null,
            latitude,
            longitude,
          })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        // First check-in of the day
        const { error } = await supabase
          .from("op_daily_attendance")
          .insert({
            user_id: user.id,
            attendance_date: today,
            latitude,
            longitude,
            establishment_id: establishmentId,
          });

        if (error) throw error;
      }

      await checkTodayAttendance();
      return { error: null };
    } catch (error: any) {
      console.error("Error checking in:", error);
      return { error: error.message };
    }
  };

  const checkOut = async () => {
    if (!user) return { error: "Not authenticated" };

    try {
      const today = new Date().toISOString().split("T")[0];
      
      const { error } = await supabase
        .from("op_daily_attendance")
        .update({ checked_out_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("attendance_date", today);

      if (error) throw error;

      await checkTodayAttendance();
      return { error: null };
    } catch (error: any) {
      console.error("Error checking out:", error);
      return { error: error.message };
    }
  };

  return {
    ...status,
    checkIn,
    checkOut,
    refresh: checkTodayAttendance,
  };
}
