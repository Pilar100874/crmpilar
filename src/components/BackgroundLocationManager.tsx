// Ativa o envio de localização em background do CRM (PWA) quando o usuário
// concede consentimento LGPD (armazenado em localStorage por usuário).
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBackgroundLocation } from "@/hooks/useBackgroundLocation";

const STORAGE_PREFIX = "crm:location:enabled:";

export function getLocationConsentKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`;
}

export function isLocationConsentGranted(userId: string | null | undefined) {
  if (!userId) return false;
  try {
    return localStorage.getItem(getLocationConsentKey(userId)) === "1";
  } catch {
    return false;
  }
}

export function setLocationConsent(userId: string, enabled: boolean) {
  try {
    if (enabled) localStorage.setItem(getLocationConsentKey(userId), "1");
    else localStorage.removeItem(getLocationConsentKey(userId));
    window.dispatchEvent(new CustomEvent("crm:location-consent-changed"));
  } catch {}
}

export default function BackgroundLocationManager() {
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setAuthUserId(data.user?.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_ev, session) => {
      setAuthUserId(session?.user?.id ?? null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const refresh = () => setEnabled(isLocationConsentGranted(authUserId));
    refresh();
    window.addEventListener("crm:location-consent-changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("crm:location-consent-changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [authUserId]);

  useBackgroundLocation({ enabled: !!authUserId && enabled });
  return null;
}
