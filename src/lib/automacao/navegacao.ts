import { createContext, useContext } from "react";
import { Ambiente } from "./api";

/** Permite que um elemento do painel troque de aba (ambiente). */
export interface NavegacaoAmbientes {
  ambientes: Ambiente[];
  ambienteId: string;
  trocar: (id: string) => void;
}

export const AmbientesNavContext = createContext<NavegacaoAmbientes>({
  ambientes: [],
  ambienteId: "",
  trocar: () => {},
});

export const useNavegacaoAmbientes = () => useContext(AmbientesNavContext);
