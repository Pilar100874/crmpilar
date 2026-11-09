/** Falas da IA não comprovam transferência; aparelhos antigos devem informar o destino. */
export function destinoTransferencia(corpo: { transferido_para?: unknown }): string | null {
  if (typeof corpo.transferido_para !== 'string') return null;
  const destino = corpo.transferido_para.trim();
  return destino || null;
}