import { useEffect, useRef } from "react";
import { supabase } from "@/lib/ferramentas/supabase";
import { useAuth } from "./useAuth";

/**
 * Hook that automatically sends user location when the app is opened as PWA
 * Updates location every 5 minutes while the app is in the foreground
 */
export function useAutoLocation() {
  const { profile, user } = useAuth();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    // Only run for authenticated users
    if (!user || !profile?.id) return;

    // Check if running as installed PWA
    const isPWA =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes("android-app://");

    // Also send location if user explicitly allowed (could be browser too)
    const shouldTrackLocation = isPWA || localStorage.getItem("autoLocationEnabled") === "true";

    if (!shouldTrackLocation) return;

    const updateLocation = async () => {
      if (!navigator.geolocation) return;

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;

          try {
            await supabase
              .from("ferr_profiles")
              .update({
                last_location_lat: latitude,
                last_location_lng: longitude,
                last_location_updated_at: new Date().toISOString(),
              })
              .eq("id", profile.id);

            console.log("[AutoLocation] Location updated:", latitude, longitude);
          } catch (error) {
            console.error("[AutoLocation] Error updating location:", error);
          }
        },
        (error) => {
          console.warn("[AutoLocation] Geolocation error:", error.message);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000,
        }
      );
    };

    // Send location immediately on first load
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      updateLocation();
    }

    // Update location every 5 minutes
    intervalRef.current = setInterval(updateLocation, 5 * 60 * 1000);

    // Handle visibility change - update when app becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        updateLocation();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [user, profile?.id]);
}

/**
 * Enable auto location tracking (for non-PWA users who want it)
 */
export function enableAutoLocation() {
  localStorage.setItem("autoLocationEnabled", "true");
}

/**
 * Disable auto location tracking
 */
export function disableAutoLocation() {
  localStorage.removeItem("autoLocationEnabled");
}

/**
 * Check if auto location is enabled
 */
export function isAutoLocationEnabled(): boolean {
  const isPWA =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true;

  return isPWA || localStorage.getItem("autoLocationEnabled") === "true";
}
