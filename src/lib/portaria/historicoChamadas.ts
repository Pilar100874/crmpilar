import { useCallback, useEffect, useState } from "react";

export type GrupoHistorico = "ramais" | "cadastros" | "whatsapp";

export interface RegistroChamada {
  id: string;
  grupo: GrupoHistorico;
  nome: string;
  numero: string;
  direcao: "saida" | "entrada";
  em: string;
}

const CHAVE = "pilarSipHistorico";
const LIMITE = 60;
const EVENTO = "pilar-sip:historico";

function ler(): RegistroChamada[] {
  try {
    const bruto = localStorage.getItem(CHAVE);
    return bruto ? (JSON.parse(bruto) as RegistroChamada[]) : [];
  } catch {
    return [];
  }
}

/** Registra uma chamada no histórico local do aparelho, separado por grupo. */
export function registrarChamada(entrada: Omit<RegistroChamada, "id" | "em">) {
  const registro: RegistroChamada = {
    ...entrada,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    em: new Date().toISOString(),
  };
  const lista = [registro, ...ler()].slice(0, LIMITE);
  localStorage.setItem(CHAVE, JSON.stringify(lista));
  window.dispatchEvent(new CustomEvent(EVENTO));
}

/** Limpa o histórico de um grupo específico. */
export function limparHistorico(grupo: GrupoHistorico) {
  const lista = ler().filter((r) => r.grupo !== grupo);
  localStorage.setItem(CHAVE, JSON.stringify(lista));
  window.dispatchEvent(new CustomEvent(EVENTO));
}

/** Histórico reativo de chamadas de um grupo (Ramais, Cadastros ou WhatsApp). */
export function useHistoricoChamadas(grupo: GrupoHistorico) {
  const [itens, setItens] = useState<RegistroChamada[]>(() => ler().filter((r) => r.grupo === grupo));

  const atualizar = useCallback(() => {
    setItens(ler().filter((r) => r.grupo === grupo));
  }, [grupo]);

  useEffect(() => {
    atualizar();
    window.addEventListener(EVENTO, atualizar);
    window.addEventListener("storage", atualizar);
    return () => {
      window.removeEventListener(EVENTO, atualizar);
      window.removeEventListener("storage", atualizar);
    };
  }, [atualizar]);

  return { itens, limpar: () => limparHistorico(grupo) };
}

/** Rótulo curto de data/hora para o histórico. */
export function formatarQuando(iso: string) {
  const d = new Date(iso);
  const hoje = new Date();
  const mesmoDia = d.toDateString() === hoje.toDateString();
  return mesmoDia
    ? `Hoje ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
    : d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}
