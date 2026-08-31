import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Tabelas que alimentam os painéis e relatórios da portaria. */
export const TABELAS_PORTARIA = [
  "cv_vehicle_movements",
  "transp_movimentos",
  "vis_access_records",
  "livro_ocorrencias",
  "livro_encomendas",
] as const;

/**
 * Escuta em tempo real as movimentações da portaria (entradas, saídas,
 * visitantes, ocorrências e encomendas) e dispara o callback com debounce,
 * para que telas como TV Portaria e o relatório por unidade se atualizem
 * sozinhas, sem recarregar a página.
 */
export function usePortariaRealtime(onChange: () => void, debounceMs = 1500) {
  const cbRef = useRef(onChange);
  cbRef.current = onChange;

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const disparar = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => cbRef.current(), debounceMs);
    };

    const canal = supabase.channel(`portaria-realtime-${Math.random().toString(36).slice(2)}`);
    TABELAS_PORTARIA.forEach((table) => {
      canal.on("postgres_changes", { event: "*", schema: "public", table }, disparar);
    });
    canal.subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(canal);
    };
  }, [debounceMs]);
}
