/** Chamadas aceitam celular ou fixo; WhatsApp continua usando apenas telefone. */
export function numeroParaChamada(contato: { telefone?: string | null; tel?: string | null }): string | null {
  return [contato.telefone, contato.tel].find(numero => (numero?.replace(/\D/g, '').length ?? 0) >= 8) ?? null;
}