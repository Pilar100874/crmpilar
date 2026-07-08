import { Node, mergeAttributes } from "@tiptap/core";
import { getPreviewRows, subscribePreview } from "@/lib/editores/mergePreviewStore";

/**
 * Nó de bloco que renderiza uma tabela vinculada a um alias de dados.
 * - Quando o preview está INATIVO (sem linhas no store) mostra o cabeçalho
 *   e uma linha com os tokens `{{alias.campo}}` (variáveis).
 * - Quando ATIVO, mostra as linhas reais recortadas pelo intervalo from/to.
 * O HTML persistido guarda apenas os atributos data-*; a renderização é feita
 * em runtime pelo NodeView.
 */
export interface MergeTableAttrs {
  alias: string;
  cols: string[];
  from: number; // 1-indexed inclusivo
  to: number;   // 0 = todas
}

function fmt(v: any): string {
  if (v == null) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function buildInner(attrs: MergeTableAttrs): string {
  const cols = attrs.cols || [];
  const th = cols.map((c) => `<th style="border:1px solid #ccc;padding:4px;background:#f4f4f4;text-align:left;">${esc(c)}</th>`).join("");
  const rows = getPreviewRows(attrs.alias);
  let body = "";
  if (rows.length) {
    const from = Math.max(0, (attrs.from || 1) - 1);
    const to = attrs.to && attrs.to > 0 ? Math.min(rows.length, attrs.to) : rows.length;
    const slice = rows.slice(from, to);
    body = slice
      .map((r) => `<tr>${cols.map((c) => `<td style="border:1px solid #ccc;padding:4px;">${esc(fmt(r?.[c]))}</td>`).join("")}</tr>`)
      .join("");
  } else {
    body = `<tr>${cols
      .map((c) => `<td style="border:1px solid #ccc;padding:4px;font-family:monospace;color:#1e40af;">{{${esc(attrs.alias)}.${esc(c)}}}</td>`)
      .join("")}</tr>`;
  }
  return `<thead><tr>${th}</tr></thead><tbody>${body}</tbody>`;
}

export const MergeTable = Node.create({
  name: "mergeTable",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      alias: { default: "" },
      cols: { default: [] },
      from: { default: 1 },
      to: { default: 0 },
    };
  },

  parseHTML() {
    return [
      {
        tag: "table[data-merge-table]",
        getAttrs: (el) => {
          const e = el as HTMLElement;
          const cols = (e.getAttribute("data-cols") || "").split(",").filter(Boolean);
          return {
            alias: e.getAttribute("data-alias") || "",
            cols,
            from: Number(e.getAttribute("data-from") || 1),
            to: Number(e.getAttribute("data-to") || 0),
          };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const attrs = node.attrs as MergeTableAttrs;
    return [
      "table",
      mergeAttributes(HTMLAttributes, {
        "data-merge-table": "1",
        "data-alias": attrs.alias,
        "data-cols": (attrs.cols || []).join(","),
        "data-from": String(attrs.from ?? 1),
        "data-to": String(attrs.to ?? 0),
        style: "border-collapse:collapse;width:100%;font-size:11pt;",
        // O HTML persistido inclui uma renderização inicial só para exportações
        // simples (o NodeView substitui isso em runtime).
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      0 as any,
    ];
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement("table");
      dom.setAttribute("data-merge-table", "1");
      dom.setAttribute("data-alias", node.attrs.alias);
      dom.setAttribute("data-cols", (node.attrs.cols || []).join(","));
      dom.setAttribute("data-from", String(node.attrs.from ?? 1));
      dom.setAttribute("data-to", String(node.attrs.to ?? 0));
      dom.style.cssText = "border-collapse:collapse;width:100%;font-size:11pt;";
      const render = () => {
        dom.innerHTML = buildInner(node.attrs as MergeTableAttrs);
      };
      render();
      const unsub = subscribePreview(render);
      return { dom, destroy: () => unsub() };
    };
  },
});

export function insertMergeTable(
  editor: { chain: () => any } | null | undefined,
  attrs: MergeTableAttrs,
) {
  if (!editor) return;
  editor.chain().focus().insertContent({ type: "mergeTable", attrs }).run();
}
