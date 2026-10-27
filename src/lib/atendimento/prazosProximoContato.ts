import { addDays } from "date-fns";

/** Origens que definem a data padrão do próximo contato. */
export type OrigemPrazo = "massa_email" | "massa_whatsapp" | "finalizar_atendimento";

export type PrazosProximoContato = Record<OrigemPrazo, number>;

export const PRAZOS_PADRAO: PrazosProximoContato = {
  massa_email: 1,
  massa_whatsapp: 1,
  finalizar_atendimento: 4,
};

export const ROTULOS_PRAZO: Record<OrigemPrazo, string> = {
  massa_email: "Disparo em massa por e-mail",
  massa_whatsapp: "Disparo em massa por WhatsApp",
  finalizar_atendimento: "Ao finalizar atendimento",
};

const CHAVE = "atendimento_prazos_proximo_contato";
export const EVENTO_PRAZOS = "atendimento:prazos-alterados";

function normalizar(v: unknown, padrao: number): number {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= 0 && n <= 365 ? n : padrao;
}

export function lerPrazos(): PrazosProximoContato {
  try {
    const bruto = JSON.parse(localStorage.getItem(CHAVE) || "{}");
    return {
      massa_email: PRAZOS_PADRAO.massa_email, // disparo em massa: sempre 1 dia (personalizado na etapa de agendamento)
      massa_whatsapp: PRAZOS_PADRAO.massa_whatsapp,
      finalizar_atendimento: normalizar(bruto.finalizar_atendimento, PRAZOS_PADRAO.finalizar_atendimento),
    };
  } catch {
    return { ...PRAZOS_PADRAO };
  }
}

export function salvarPrazos(p: PrazosProximoContato) {
  localStorage.setItem(CHAVE, JSON.stringify(p));
  window.dispatchEvent(new Event(EVENTO_PRAZOS));
}

export function origemDoCanalMassa(canal: string | null | undefined): OrigemPrazo {
  return canal === "email" ? "massa_email" : "massa_whatsapp";
}

/** Data padrão do próximo contato para a origem, a partir de `base`. */
export function dataPadraoProximoContato(origem: OrigemPrazo, base: Date = new Date()): Date {
  return addDays(base, lerPrazos()[origem]);
}
