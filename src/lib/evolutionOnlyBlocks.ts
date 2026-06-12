// Blocos exclusivos da Evolution API — não suportados pela Cloud API (Meta oficial).
// Quando um bot que usa esses tipos for vinculado a um número Cloud API, o sistema
// deve bloquear a vinculação até a correção.

export const EVOLUTION_ONLY_BLOCKS = [
  "button_url",
  "button_copy",
  "button_call",
  "button_pix",
  "buttons_mixed",
  "buttons_media",
  "carousel",
] as const;

export type EvolutionOnlyBlockType = (typeof EVOLUTION_ONLY_BLOCKS)[number];

export const EVOLUTION_ONLY_BLOCK_LABELS: Record<string, string> = {
  button_url: "Botão URL",
  button_copy: "Botão Copy (Cupom)",
  button_call: "Botão Call (Ligação)",
  button_pix: "Botão Pix",
  buttons_mixed: "Botões Mistos",
  buttons_media: "Botões com Mídia",
  carousel: "Carrossel",
};

export function isEvolutionOnlyBlock(type?: string | null): boolean {
  if (!type) return false;
  return (EVOLUTION_ONLY_BLOCKS as readonly string[]).includes(type);
}

/**
 * Recebe um flow (pode ser { nodes: [...] } ou array direto) e retorna a lista
 * de tipos Evolution-only encontrados (deduplicada).
 */
export function detectEvolutionOnlyBlocks(flow: any): string[] {
  if (!flow) return [];
  const nodes: any[] = Array.isArray(flow)
    ? flow
    : Array.isArray(flow?.nodes)
      ? flow.nodes
      : [];
  const found = new Set<string>();
  for (const n of nodes) {
    const t = n?.data?.type || n?.type;
    if (isEvolutionOnlyBlock(t)) found.add(t);
  }
  return Array.from(found);
}
