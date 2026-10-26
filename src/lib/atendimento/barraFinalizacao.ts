/** Não promove pendências: a barra pertence exclusivamente ao cartão aberto. */
export function contatoDaBarraFinalizacao(
  contatoClicadoId: string | null,
  contatoAbertoId: string | null | undefined,
  pendencias: readonly string[],
): string | null {
  if (!contatoClicadoId || contatoClicadoId !== contatoAbertoId) return null;
  return pendencias.includes(contatoClicadoId) ? contatoClicadoId : null;
}

/** O contato tem atendimento iniciado e ainda não finalizado (próxima data pendente). */
export function itemNaoFinalizado(
  contactId: string | null | undefined,
  pendencias: readonly string[],
): boolean {
  return !!contactId && pendencias.includes(contactId);
}