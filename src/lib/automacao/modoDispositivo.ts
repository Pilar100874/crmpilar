import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ModoSaida = "toggle" | "momentary";

export interface ModoDispositivo {
  modo: ModoSaida;
  /** Tempo do pulso em milissegundos (usado apenas no modo pulso). */
  pulsoMs: number;
}

const cache = new Map<string, ModoDispositivo>();
const pendentes = new Map<string, Promise<ModoDispositivo>>();

/** Lê no cadastro do dispositivo se ele funciona por liga/desliga ou por pulso. */
export async function lerModoDispositivo(deviceId: string): Promise<ModoDispositivo> {
  const emCache = cache.get(deviceId);
  if (emCache) return emCache;
  const jaPedido = pendentes.get(deviceId);
  if (jaPedido) return jaPedido;

  const promessa = (async () => {
    const { data } = await supabase
      .from("port_devices")
      .select("config, pulso_ms")
      .eq("id", deviceId)
      .maybeSingle();
    const cfg = (data?.config ?? {}) as Record<string, unknown>;
    const resultado: ModoDispositivo = {
      modo: cfg.modo_saida === "momentary" ? "momentary" : "toggle",
      pulsoMs: Number(data?.pulso_ms ?? 1000) || 1000,
    };
    cache.set(deviceId, resultado);
    pendentes.delete(deviceId);
    return resultado;
  })();

  pendentes.set(deviceId, promessa);
  return promessa;
}

/** Limpa o cache (usar após mudar a configuração do dispositivo). */
export function limparCacheModos() {
  cache.clear();
  pendentes.clear();
}

/** Hook: devolve o modo configurado no dispositivo do elemento. */
export function useModoDispositivo(deviceId?: string | null): ModoDispositivo | null {
  const [modo, setModo] = useState<ModoDispositivo | null>(
    deviceId ? cache.get(deviceId) ?? null : null,
  );

  useEffect(() => {
    let ativo = true;
    if (!deviceId) {
      setModo(null);
      return;
    }
    lerModoDispositivo(deviceId).then((m) => {
      if (ativo) setModo(m);
    });
    return () => {
      ativo = false;
    };
  }, [deviceId]);

  return modo;
}
