import { createContext, useContext } from "react";
import { Bloco } from "./api";

/** Dados do painel aberto, para elementos que mostram outros elementos dentro de si. */
export interface PainelBlocosValor {
  blocos: Bloco[];
  estados: Record<string, boolean | null>;
  aplicarEstado: (bloco: Bloco, ligado: boolean | null) => void;
  acionar: (bloco: Bloco) => void;
}

export const PainelBlocosContext = createContext<PainelBlocosValor>({
  blocos: [],
  estados: {},
  aplicarEstado: () => {},
  acionar: () => {},
});

export const usePainelBlocos = () => useContext(PainelBlocosContext);

/** IDs dos elementos que só devem aparecer ao abrir um grupo expansível. */
export function idsDentroDeExpansiveis(blocos: Bloco[]): Set<string> {
  const ids = new Set<string>();
  for (const b of blocos) {
    if (b.tipo !== "expansivel") continue;
    const cfg = (b.config ?? {}) as Record<string, any>;
    if (cfg.ocultarFora === false) continue;
    for (const id of (cfg.vinculados ?? []) as string[]) ids.add(id);
  }
  return ids;
}
