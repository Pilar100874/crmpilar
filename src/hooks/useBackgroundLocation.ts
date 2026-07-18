import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const DEVICE_UUID_KEY = "crm:pwa:device_uuid";

function getOrCreateDeviceUuid(): string {
  try {
    let id = localStorage.getItem(DEVICE_UUID_KEY);
    if (!id) {
      id = (crypto as any)?.randomUUID?.() ?? `pwa-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(DEVICE_UUID_KEY, id);
    }
    return id;
  } catch {
    return `pwa-${Date.now()}`;
  }
}

function getDeviceInfo() {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isStandalone =
    typeof window !== "undefined" &&
    (window.matchMedia?.("(display-mode: standalone)")?.matches ||
      (navigator as any).standalone === true);
  let plataforma = "pwa";
  if (/android/i.test(ua)) plataforma = isStandalone ? "pwa-android" : "web-android";
  else if (/iphone|ipad|ipod/i.test(ua)) plataforma = isStandalone ? "pwa-ios" : "web-ios";
  else plataforma = isStandalone ? "pwa-desktop" : "web";
  const modelo = ua.slice(0, 120);
  return { plataforma, modelo };
}

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

    const deviceUuid = getOrCreateDeviceUuid();
    const deviceInfo = getDeviceInfo();

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
          body: {
            positions,
            device: {
              device_uuid: deviceUuid,
              plataforma: deviceInfo.plataforma,
              modelo: deviceInfo.modelo,
            },
          },
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
