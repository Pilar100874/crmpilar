import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Envia a localização do usuário para o backend em intervalos regulares
 * enquanto a aba do CRM estiver aberta (PWA/Web). Guarda um buffer local
 * quando offline e faz flush quando a conexão volta.
 */
export function useBackgroundLocation(options?: { enabled?: boolean; intervalMs?: number }) {
  const enabled = options?.enabled ?? true;
  const intervalMs = options?.intervalMs ?? 60_000;
  const [ativo, setAtivo] = useState(false);
  const [ultimaPos, setUltimaPos] = useState<{ lat: number; lng: number; ts: string } | null>(null);
  const watchId = useRef<number | null>(null);
  const bufferRef = useRef<any[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;

    const onPos = (p: GeolocationPosition) => {
      const item = {
        lat: p.coords.latitude,
        lng: p.coords.longitude,
        accuracy: p.coords.accuracy,
        data_hora: new Date(p.timestamp).toISOString(),
        origem: "pwa",
      };
      bufferRef.current.push(item);
      setUltimaPos({ lat: item.lat, lng: item.lng, ts: item.data_hora });
    };

    const onErr = (e: GeolocationPositionError) => {
      console.warn("[useBackgroundLocation] erro geo:", e.message);
    };

    try {
      watchId.current = navigator.geolocation.watchPosition(onPos, onErr, {
        enableHighAccuracy: true,
        maximumAge: 30_000,
        timeout: 60_000,
      });
      setAtivo(true);
    } catch (e) {
      console.warn("[useBackgroundLocation] watchPosition falhou", e);
    }

    const flush = async () => {
      if (bufferRef.current.length === 0) return;
      const positions = bufferRef.current.splice(0);
      try {
        const { error } = await supabase.functions.invoke("registrar-posicao-usuario", {
          body: { positions },
        });
        if (error) {
          // recoloca no buffer para nova tentativa
          bufferRef.current.unshift(...positions);
        }
      } catch (e) {
        bufferRef.current.unshift(...positions);
      }
    };

    timerRef.current = window.setInterval(flush, intervalMs);

    return () => {
      if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
      if (timerRef.current != null) window.clearInterval(timerRef.current);
      setAtivo(false);
    };
  }, [enabled, intervalMs]);

  return { ativo, ultimaPos };
}
