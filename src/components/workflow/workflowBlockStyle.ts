/**
 * Estilo visual compartilhado para os cards de bloco de TODOS os workflows.
 * Editar este arquivo afeta: Bot, Omnichannel, Ads, Automação Vendas,
 * E-commerce Rules e Logística (padrão visual do Bot Builder).
 */

export interface WorkflowBlockCardOptions {
  selected?: boolean;
  isBreakpoint?: boolean;
  isSkipped?: boolean;
  isHighlighted?: boolean;
  /** "default" 260-300px (Bot/Omni/Vendas), "wide" 260-320px (Ecom), "compact" 220-280px (Ads/Logística), "collapsed" 120-160px */
  size?: "default" | "wide" | "compact" | "collapsed";
}

const SIZE_CLASSES: Record<NonNullable<WorkflowBlockCardOptions["size"]>, string> = {
  default: "min-w-[260px] max-w-[300px]",
  wide: "min-w-[260px] max-w-[320px]",
  compact: "min-w-[220px] max-w-[280px]",
  collapsed: "min-w-[120px] max-w-[160px]",
};

export function getWorkflowBlockCardClass(opts: WorkflowBlockCardOptions = {}): string {
  const {
    selected = false,
    isBreakpoint = false,
    isSkipped = false,
    isHighlighted = false,
    size = "default",
  } = opts;

  const base = `${SIZE_CLASSES[size]} transition-all duration-200 shadow-md hover:shadow-lg rounded-2xl`;

  if (isHighlighted) {
    return `${base} bg-card border-2 border-green-500 ring-4 ring-green-500/40 ring-offset-2 shadow-xl scale-[1.02]`;
  }
  if (isBreakpoint) {
    return `${base} bg-card border-2 border-orange-500 ${selected ? "ring-2 ring-primary" : ""}`;
  }
  if (isSkipped) {
    return `${base} bg-card/60 border-2 border-border opacity-60 ${selected ? "ring-2 ring-primary" : ""}`;
  }
  return `${base} bg-card border border-border ${
    selected ? "ring-2 ring-primary border-primary" : "hover:border-primary/40"
  }`;
}

/** Classe padrão dos handles (pontos de conexão) */
export const WORKFLOW_HANDLE_CLASS =
  "!bg-primary !w-3 !h-3 !border-2 !border-background";

/** Classe do botão "mais" (três pontinhos) do cabeçalho do card */
export const WORKFLOW_HEADER_MENU_BTN_CLASS =
  "p-1 hover:bg-muted rounded transition-colors";
