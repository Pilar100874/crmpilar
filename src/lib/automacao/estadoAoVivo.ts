import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bloco, lerEstadosDosBlocos } from "./api";

/**
 * Mantém os elementos do painel mostrando a situação real dos equipamentos
 * (portão, luz, tomada) sem precisar recarregar a tela:
 * - escuta em tempo real a última situação gravada de cada equipamento;
 * - relê os equipamentos de tempos em tempos (pausando com a tela em segundo plano).
 */
export function useEstadosAoVivo(
  blocos: Bloco[],
  aplicar: (estados: Record<string, boolean | null>) => void,
  intervaloMs = 15000,
) {
  const blocosRef = useRef(blocos);
  blocosRef.current = blocos;
  const aplicarRef = useRef(aplicar);
  aplicarRef.current = aplicar;

  useEffect(() => {
    let ativo = true;

    const reler = async () => {
      if (document.hidden) return;
      const atuais = blocosRef.current.filter((b) => b.device_id);
      if (!atuais.length) return;
      try {
        const e = await lerEstadosDosBlocos(atuais);
        if (ativo) aplicarRef.current(e);
      } catch {
        /* rede instável: mantém a última situação conhecida */
      }
    };

    const timer = setInterval(reler, intervaloMs);
    const aoVoltar = () => { if (!document.hidden) reler(); };
    document.addEventListener("visibilitychange", aoVoltar);

    const canal = supabase
      .channel(`automacao-estado-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "port_devices" },
        (payload) => {
          const linha = payload.new as { id?: string; ultimo_estado?: Record<string, boolean> | null };
          if (!linha?.id) return;
          const memoria = (linha.ultimo_estado ?? {}) as Record<string, boolean>;
          const novos: Record<string, boolean | null> = {};
          for (const b of blocosRef.current) {
            if (b.device_id !== linha.id) continue;
            const valor = memoria[String(b.canal ?? 0)];
            if (typeof valor === "boolean") novos[b.id] = valor;
          }
          if (Object.keys(novos).length) aplicarRef.current(novos);
        },
      )
      .subscribe();

    return () => {
      ativo = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", aoVoltar);
      supabase.removeChannel(canal);
    };
  }, [intervaloMs]);
}
