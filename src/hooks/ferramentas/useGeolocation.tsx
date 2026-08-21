import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/ferramentas/supabase";
import { useAuth } from "./useAuth";
import { useToast } from "@/hooks/use-toast";

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  error: string | null;
  isLoading: boolean;
  isTracking: boolean;
}

export function useGeolocation() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    error: null,
    isLoading: false,
    isTracking: false,
  });
  const [watchId, setWatchId] = useState<number | null>(null);

  const updateLocationInDb = useCallback(
    async (latitude: number, longitude: number) => {
      if (!profile?.id) return;

      try {
        await supabase
          .from("ferr_profiles")
          .update({
            last_location_lat: latitude,
            last_location_lng: longitude,
            last_location_updated_at: new Date().toISOString(),
          })
          .eq("id", profile.id);
      } catch (error) {
        console.error("Error updating location:", error);
      }
    },
    [profile?.id]
  );

  const getCurrentPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        error: "Geolocalização não é suportada pelo seu navegador",
      }));
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setState({
          latitude,
          longitude,
          accuracy,
          error: null,
          isLoading: false,
          isTracking: false,
        });
        await updateLocationInDb(latitude, longitude);
        toast({ title: "Localização atualizada!" });
      },
      (error) => {
        setState((prev) => ({
          ...prev,
          error: getErrorMessage(error),
          isLoading: false,
        }));
        toast({
          variant: "destructive",
          title: "Erro",
          description: getErrorMessage(error),
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }, [updateLocationInDb, toast]);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        error: "Geolocalização não é suportada pelo seu navegador",
      }));
      return;
    }

    setState((prev) => ({ ...prev, isTracking: true, error: null }));

    const id = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setState((prev) => ({
          ...prev,
          latitude,
          longitude,
          accuracy,
          error: null,
        }));
        await updateLocationInDb(latitude, longitude);
      },
      (error) => {
        setState((prev) => ({
          ...prev,
          error: getErrorMessage(error),
          isTracking: false,
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );

    setWatchId(id);
  }, [updateLocationInDb]);

  const stopTracking = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setState((prev) => ({ ...prev, isTracking: false }));
  }, [watchId]);

  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  return {
    ...state,
    getCurrentPosition,
    startTracking,
    stopTracking,
  };
}

function getErrorMessage(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return "Permissão de localização negada. Ative nas configurações do navegador.";
    case error.POSITION_UNAVAILABLE:
      return "Localização indisponível. Verifique o GPS.";
    case error.TIMEOUT:
      return "Tempo esgotado. Tente novamente.";
    default:
      return "Erro ao obter localização.";
  }
}
