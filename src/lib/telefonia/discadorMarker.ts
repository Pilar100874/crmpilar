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

interface MarcadorDiscador {
  em: number;
  destino: string;
}

/** Registra que uma ligação pelo discador acabou de ser iniciada. */
export function marcarChamadaDiscador(destino: string) {
  try {
    const marcador: MarcadorDiscador = { em: Date.now(), destino };
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

/**
 * Indica se a chamada recebida parece vir do discador:
 * há um disparo recente pelo click-to-call OU a origem é o próprio ramal
 * (o PABX liga para o ramal usando ele mesmo como chamador).
 */
export function chamadaPareceDiscador(origem: string, ramalProprio?: string): boolean {
  if (ramalProprio && origem && origem === ramalProprio) return true;
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return false;
    const marcador = JSON.parse(bruto) as MarcadorDiscador;
    return Date.now() - marcador.em < JANELA_MS;
  } catch {
    return false;
  }
}
