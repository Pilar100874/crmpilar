import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  isPushSupported,
  pushPermissionStatus,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/pushRegister";

export interface UsePushOptions {
  usuarioId?: string | null;
  contatoId?: string | null;
}

export function usePushNotifications(opts: UsePushOptions = {}) {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<"default" | "granted" | "denied" | "unsupported">("default");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setSupported(isPushSupported());
    setPermission(await pushPermissionStatus());
    try {
      const reg = await navigator.serviceWorker?.getRegistration("/push-sw.js");
      const sub = await reg?.pushManager.getSubscription();
      setSubscribed(!!sub);
    } catch {
      setSubscribed(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const ativar = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    setLoading(true);
    try {
      const res = await subscribeToPush({ usuarioId: opts.usuarioId, contatoId: opts.contatoId });
      await refresh();
      return res;
    } finally {
      setLoading(false);
    }
  }, [opts.usuarioId, opts.contatoId, refresh]);

  const desativar = useCallback(async () => {
    setLoading(true);
    try {
      await unsubscribeFromPush();
      await refresh();
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  const testar = useCallback(async () => {
    const { error } = await supabase.functions.invoke("push-send", {
      body: {
        destinatario_tipo: opts.usuarioId ? "usuario" : "contato",
        usuario_ids: opts.usuarioId ? [opts.usuarioId] : undefined,
        contato_ids: opts.contatoId ? [opts.contatoId] : undefined,
        titulo: "Teste de push ✅",
        corpo: "Se você recebeu essa notificação, está tudo funcionando!",
        url: "/",
      },
    });
    return { ok: !error, error: error?.message };
  }, [opts.usuarioId, opts.contatoId]);

  return { supported, permission, subscribed, loading, ativar, desativar, testar, refresh };
}
