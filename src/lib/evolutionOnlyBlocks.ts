// Validação de compatibilidade entre blocos do bot e provedor WhatsApp.
//
// Existem dois grupos:
//
// 1) EVOLUTION_ONLY_BLOCKS — recursos que NÃO existem na Cloud API oficial (Meta)
//    de jeito nenhum. Bloqueiam totalmente a vinculação a um número Cloud API.
//
// 2) TEMPLATE_REQUIRED_BLOCKS — recursos que existem na Cloud API, mas só dentro
//    de templates pré-aprovados pela Meta. No bloco existe a flag
//    `isApprovedTemplate`. Se estiver marcada, consideramos OK para Cloud API
//    (o usuário declara que já cadastrou o template). Se não marcada, bloqueia.

export const EVOLUTION_ONLY_BLOCKS = [
  "button_pix",
  "buttons_mixed",
  "buttons_media",
  "carousel",
] as const;

export const TEMPLATE_REQUIRED_BLOCKS = [
  "button_url",
  "button_copy",
  "button_call",
] as const;

export type EvolutionOnlyBlockType = (typeof EVOLUTION_ONLY_BLOCKS)[number];
export type TemplateRequiredBlockType = (typeof TEMPLATE_REQUIRED_BLOCKS)[number];

export const EVOLUTION_ONLY_BLOCK_LABELS: Record<string, string> = {
  button_pix: "Botão Pix",
  buttons_mixed: "Botões Mistos",
  buttons_media: "Botões com Mídia",
  carousel: "Carrossel",
  button_url: "Botão URL (sem template aprovado)",
  button_copy: "Botão Copy (sem template aprovado)",
  button_call: "Botão Call (sem template aprovado)",
};

export function isEvolutionOnlyBlock(type?: string | null): boolean {
  if (!type) return false;
  return (EVOLUTION_ONLY_BLOCKS as readonly string[]).includes(type);
}

export function isTemplateRequiredBlock(type?: string | null): boolean {
  if (!type) return false;
  return (TEMPLATE_REQUIRED_BLOCKS as readonly string[]).includes(type);
}

/**
 * Retorna os tipos incompatíveis com a Cloud API encontrados no flow.
 *
 * - Blocos em EVOLUTION_ONLY_BLOCKS sempre entram.
 * - Blocos em TEMPLATE_REQUIRED_BLOCKS só entram se o nó NÃO declarar
 *   `isApprovedTemplate: true` na sua config.
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
    if (!t) continue;
    if (isEvolutionOnlyBlock(t)) {
      found.add(t);
      continue;
    }
    if (isTemplateRequiredBlock(t)) {
      const cfg = n?.data?.config || n?.data || {};
      const approved = cfg?.isApprovedTemplate === true;
      if (!approved) found.add(t);
    }
  }
  return Array.from(found);
}
