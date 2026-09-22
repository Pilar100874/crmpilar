/**
 * Estado global do ramal do Pilar Fone (registrado / conectando).
 * Permite que outras telas (ex.: discador do chat) saibam se o telefone
 * do navegador está pronto para receber a ligação do PABX.
 */
export interface StatusRamalGlobal {
  registrado: boolean;
  conectando: boolean;
}

let atual: StatusRamalGlobal = { registrado: false, conectando: false };
const ouvintes = new Set<(s: StatusRamalGlobal) => void>();

export function definirStatusRamalGlobal(status: StatusRamalGlobal) {
  if (atual.registrado === status.registrado && atual.conectando === status.conectando) return;
  atual = status;
  ouvintes.forEach((fn) => fn(atual));
}

export function obterStatusRamalGlobal(): StatusRamalGlobal {
  return atual;
}

export function ouvirStatusRamalGlobal(fn: (s: StatusRamalGlobal) => void) {
  ouvintes.add(fn);
  fn(atual);
  return () => ouvintes.delete(fn);
}
