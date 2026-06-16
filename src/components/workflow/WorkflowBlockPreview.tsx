import { ReactNode } from "react";

/**
 * Shared visual shell for live block previews across all workflow editors.
 * Matches the style used in the Bot Builder (`LiveBlockPreview`) so changing
 * styles here updates every workflow at once.
 */
export const WorkflowPreviewShell = ({
  children,
  title = "Pré-visualização",
}: {
  children: ReactNode;
  title?: string;
}) => (
  <div className="mt-2 rounded-xl border border-dashed border-border bg-muted/30 p-2.5">
    <div className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground mb-1.5">
      {title}
    </div>
    <div className="max-w-sm text-xs text-foreground">{children}</div>
  </div>
);

export type WorkflowDomain =
  | "omnichannel"
  | "automacao-vendas"
  | "ecommerce"
  | "ads"
  | "logistica";

/** Friendly labels for known config fields per domain (PT-BR). */
const FIELD_LABELS: Record<WorkflowDomain, Record<string, string>> = {
  omnichannel: {
    filaId: "Fila",
    filaNome: "Fila",
    atendenteId: "Atendente",
    atendenteNome: "Atendente",
    skill: "Skill",
    skillNome: "Skill",
    horarioInicio: "Início",
    horarioFim: "Fim",
    diasSemana: "Dias",
    url: "URL",
    metodo: "Método",
    tempo: "Tempo",
    tempoSegundos: "Tempo (s)",
    metrica: "Métrica",
    regras: "Regras",
    condicoes: "Condições",
  },
  "automacao-vendas": {
    campo: "Campo",
    operador: "Operador",
    valor: "Valor",
    logica: "Lógica",
    faixas: "Faixas",
    condicoes: "Condições",
    template: "Template",
    canal: "Canal",
    destinatario: "Destinatário",
    mensagem: "Mensagem",
    aprovador: "Aprovador",
    tempoEspera: "Espera",
  },
  ecommerce: {
    percentual: "Desconto %",
    valor: "Valor R$",
    codigo: "Código",
    tipo: "Tipo",
    minimo: "Mín. pedido",
    faixas: "Faixas",
    produto: "Produto",
    categoria: "Categoria",
    cupom: "Cupom",
  },
  ads: {
    plataforma: "Plataforma",
    metrica: "Métrica",
    operador: "Operador",
    valor: "Valor",
    periodo: "Período",
    acao: "Ação",
    campanha: "Campanha",
    orcamento: "Orçamento",
    audiencia: "Audiência",
  },
  logistica: {
    tempo: "Tempo",
    tempoSegundos: "Tempo (s)",
    velocidade: "Velocidade",
    raio: "Raio (m)",
    local: "Local",
    destinatario: "Destinatário",
    mensagem: "Mensagem",
    canal: "Canal",
    condicao: "Condição",
    marcadores: "Marcadores",
    geofences: "Geofences",
  },
};

function formatValue(v: any): string {
  if (v == null || v === "") return "—";
  if (Array.isArray(v)) return `${v.length} item${v.length === 1 ? "" : "s"}`;
  if (typeof v === "object") {
    const keys = Object.keys(v);
    if (keys.length === 0) return "—";
    return `${keys.length} campo${keys.length === 1 ? "" : "s"}`;
  }
  if (typeof v === "boolean") return v ? "Sim" : "Não";
  const s = String(v);
  return s.length > 40 ? s.slice(0, 37) + "…" : s;
}

interface WorkflowBlockPreviewProps {
  domain: WorkflowDomain;
  type: string;
  config: Record<string, any> | null | undefined;
  /** Extra rows to render (already formatted strings). */
  extra?: Array<{ label: string; value: string }>;
  /** Maximum rows to render (default 5). */
  maxRows?: number;
  title?: string;
}

/**
 * Generic live preview that summarises a block's configuration. Renders
 * nothing if there is no useful config and no extras — keeps the node
 * compact for "trigger-style" blocks.
 */
export const WorkflowBlockPreview = ({
  domain,
  type,
  config,
  extra = [],
  maxRows = 5,
  title,
}: WorkflowBlockPreviewProps) => {
  const labels = FIELD_LABELS[domain] || {};
  const cfg = config || {};

  const rows: Array<{ label: string; value: string }> = [];

  // Prefer known fields in defined order
  for (const key of Object.keys(labels)) {
    if (key in cfg && cfg[key] !== "" && cfg[key] != null) {
      rows.push({ label: labels[key], value: formatValue(cfg[key]) });
    }
  }
  // Then any remaining primitive/array fields
  for (const [key, value] of Object.entries(cfg)) {
    if (key in labels) continue;
    if (value == null || value === "" || typeof value === "function") continue;
    if (key.startsWith("_") || key === "nota" || key === "note") continue;
    rows.push({
      label: key.replace(/_/g, " "),
      value: formatValue(value),
    });
  }

  const allRows = [...rows, ...extra];
  if (allRows.length === 0) return null;

  const visible = allRows.slice(0, maxRows);
  const hidden = allRows.length - visible.length;

  return (
    <WorkflowPreviewShell title={title}>
      <div className="space-y-1">
        {visible.map((r, i) => (
          <div key={i} className="flex items-baseline gap-2">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground shrink-0">
              {r.label}
            </span>
            <span className="text-xs font-medium text-foreground truncate">
              {r.value}
            </span>
          </div>
        ))}
        {hidden > 0 && (
          <div className="text-[10px] text-muted-foreground italic">
            +{hidden} campo{hidden === 1 ? "" : "s"}
          </div>
        )}
      </div>
    </WorkflowPreviewShell>
  );
};

export default WorkflowBlockPreview;
