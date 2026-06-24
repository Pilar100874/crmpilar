// Fila offline de marcações de ponto: armazena no localStorage e
// sincroniza automaticamente quando a rede volta.
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PendingPunch {
  id: string;
  payload: any;
  criado_em: string;
  tentativas: number;
}

const KEY = "ponto_offline_queue_v1";

function load(): PendingPunch[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}
function save(q: PendingPunch[]) {
  localStorage.setItem(KEY, JSON.stringify(q));
}

export function usePontoOfflineQueue() {
  const [queue, setQueue] = useState<PendingPunch[]>(load());
  const [online, setOnline] = useState<boolean>(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [sincronizando, setSincronizando] = useState(false);

  const refresh = useCallback(() => setQueue(load()), []);

  const enqueue = useCallback((payload: any) => {
    const item: PendingPunch = {
      id: crypto.randomUUID(),
      payload,
      criado_em: new Date().toISOString(),
      tentativas: 0,
    };
    const q = [...load(), item];
    save(q);
    setQueue(q);
    return item;
  }, []);

  const remove = useCallback((id: string) => {
    const q = load().filter((p) => p.id !== id);
    save(q);
    setQueue(q);
  }, []);

  const sincronizar = useCallback(async () => {
    if (sincronizando) return;
    const q = load();
    if (!q.length) return;
    setSincronizando(true);
    let okCount = 0;
    let failCount = 0;
    for (const item of q) {
      try {
        const { data, error } = await supabase.functions.invoke("ponto-validar-marcacao", {
          body: {
            ...item.payload,
            sincronizado_offline: true,
            criado_em_cliente: item.criado_em,
          },
        });
        if (error) throw error;
        if ((data as any)?.error) throw new Error((data as any).error);
        remove(item.id);
        okCount++;
      } catch (_) {
        failCount++;
        const all = load();
        const idx = all.findIndex((p) => p.id === item.id);
        if (idx >= 0) {
          all[idx].tentativas++;
          save(all);
        }
      }
    }
    setSincronizando(false);
    refresh();
    if (okCount) toast.success(`${okCount} marcação(ões) offline sincronizada(s)`);
    if (failCount) toast.error(`${failCount} marcação(ões) falharam ao sincronizar`);
  }, [remove, refresh, sincronizando]);

  useEffect(() => {
    const onOnline = () => {
      setOnline(true);
      sincronizar();
    };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    // Sincroniza no mount se houver pendentes e estiver online
    if (online && load().length) sincronizar();
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { queue, online, sincronizando, enqueue, remove, sincronizar, refresh };
}
