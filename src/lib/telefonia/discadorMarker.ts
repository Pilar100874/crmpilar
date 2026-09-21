/**
 * Marcador de ligação iniciada pelo discador (click-to-call).
 *
 * Quando o chat dispara uma ligação pelo PABX, o ramal do usuário toca primeiro.
 * Este marcador (em localStorage, compartilhado entre abas/janelas do sistema)
 * permite que o Pilar Fone reconheça essa chamada e toque uma campainha
 * diferente, avisando que, ao atender, o cliente já será discado.
 */

const CHAVE = "pilar.discador.chamada";
const JANELA_MS = 3 * 60 * 1000; // 3 minutos

export interface MarcadorDiscador {
  em: number;
  destino: string;
  /** Nome do cliente, quando quem disparou já conhece. */
  nome?: string;
}

/** Registra que uma ligação pelo discador acabou de ser iniciada. */
export function marcarChamadaDiscador(destino: string, nome?: string) {
  try {
    const marcador: MarcadorDiscador = { em: Date.now(), destino, ...(nome ? { nome } : {}) };
    localStorage.setItem(CHAVE, JSON.stringify(marcador));
  } catch {
    /* armazenamento indisponível — a detecção por ramal ainda funciona */
  }
}

/** Limpa o marcador (chamada atendida/encerrada). */
export function limparChamadaDiscador() {
  try {
    localStorage.removeItem(CHAVE);
  } catch {
    /* ignore */
  }
}

/** Devolve o marcador recente (dentro da janela de 3 minutos), se houver. */
export function obterMarcadorDiscador(): MarcadorDiscador | null {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return null;
    const marcador = JSON.parse(bruto) as MarcadorDiscador;
    if (Date.now() - marcador.em >= JANELA_MS) return null;
    return marcador;
  } catch {
    return null;
  }
}

/**
 * Indica se a chamada recebida parece vir do discador:
 * há um disparo recente pelo click-to-call OU a origem é o próprio ramal
 * (o PABX liga para o ramal usando ele mesmo como chamador).
 */
export function chamadaPareceDiscador(origem: string, ramalProprio?: string): boolean {
  if (ramalProprio && origem && origem === ramalProprio) return true;
  return obterMarcadorDiscador() !== null;
}
