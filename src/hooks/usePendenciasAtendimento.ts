import { useEffect, useState } from "react";
import { EVENTO_PENDENCIAS, lerPendencias } from "@/lib/atendimento/finalizarAtendimento";

/** Clientes com interação registrada que ainda precisam da data do próximo contato. */
export function usePendenciasAtendimento() {
  const [ids, setIds] = useState<string[]>(() => lerPendencias());
  useEffect(() => {
    const h = () => setIds(lerPendencias());
    window.addEventListener(EVENTO_PENDENCIAS, h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener(EVENTO_PENDENCIAS, h);
      window.removeEventListener("storage", h);
    };
  }, []);
  return ids;
}

/** Ordena a lista colocando primeiro os clientes com atendimento a finalizar. */
export function ordenarPendentesPrimeiro<T>(lista: T[], getId: (item: T) => string | null | undefined, pendencias: string[]): T[] {
  if (!pendencias.length) return lista;
  const set = new Set(pendencias);
  return [...lista].sort((a, b) => Number(set.has(getId(b) || "")) - Number(set.has(getId(a) || "")));
}
