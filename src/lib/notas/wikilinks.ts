/**
 * Utilitários para notas estilo Obsidian: links [[titulo]] e tags #tag.
 */

export const WIKILINK_REGEX = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
export const TAG_REGEX = /(^|\s)#([\p{L}\p{N}_-]{2,40})/gu;

export function extrairWikiLinks(conteudo: string): string[] {
  const titulos = new Set<string>();
  for (const match of conteudo.matchAll(WIKILINK_REGEX)) {
    const alvo = (match[1] || "").trim();
    if (alvo) titulos.add(alvo);
  }
  return Array.from(titulos);
}

export function extrairTags(conteudo: string): string[] {
  const tags = new Set<string>();
  for (const match of conteudo.matchAll(TAG_REGEX)) {
    const tag = (match[2] || "").trim().toLowerCase();
    if (tag) tags.add(tag);
  }
  return Array.from(tags);
}

export function normalizarTitulo(titulo: string): string {
  return titulo.trim().toLowerCase();
}

export type SegmentoNota =
  | { tipo: "texto"; valor: string }
  | { tipo: "link"; alvo: string; rotulo: string };

/** Divide uma linha em segmentos de texto e wiki-links, preservando a ordem. */
export function segmentarLinha(linha: string): SegmentoNota[] {
  const segmentos: SegmentoNota[] = [];
  let ultimo = 0;
  for (const match of linha.matchAll(WIKILINK_REGEX)) {
    const inicio = match.index ?? 0;
    if (inicio > ultimo) {
      segmentos.push({ tipo: "texto", valor: linha.slice(ultimo, inicio) });
    }
    const alvo = (match[1] || "").trim();
    segmentos.push({ tipo: "link", alvo, rotulo: (match[2] || alvo).trim() });
    ultimo = inicio + match[0].length;
  }
  if (ultimo < linha.length) {
    segmentos.push({ tipo: "texto", valor: linha.slice(ultimo) });
  }
  return segmentos;
}

/** Substitui [[x]] por texto simples (para preview/resumo). */
export function textoSimples(conteudo: string): string {
  return conteudo
    .replace(WIKILINK_REGEX, (_m, alvo, rotulo) => (rotulo || alvo))
    .replace(/[#>*_`]/g, "")
    .trim();
}

export function resumoNota(conteudo: string, limite = 140): string {
  const texto = textoSimples(conteudo).replace(/\s+/g, " ");
  return texto.length > limite ? `${texto.slice(0, limite)}…` : texto;
}
