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
