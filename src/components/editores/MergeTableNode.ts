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
    const total = rows.length;
    let from = Math.max(1, attrs.from || 1);
    if (from > total) from = total;
    let to = attrs.to && attrs.to > 0 ? attrs.to : total;
    if (to > total) to = total;
    if (to < from) to = from;
    const slice = rows.slice(from - 1, to);
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
    return ({ node, editor, getPos }) => {
      const wrapper = document.createElement("div");
      wrapper.style.cssText = "position:relative;margin:8px 0;";
      const dom = document.createElement("table");
      dom.setAttribute("data-merge-table", "1");
      dom.setAttribute("data-alias", node.attrs.alias);
      dom.setAttribute("data-cols", (node.attrs.cols || []).join(","));
      dom.setAttribute("data-from", String(node.attrs.from ?? 1));
      dom.setAttribute("data-to", String(node.attrs.to ?? 0));
      dom.style.cssText = "border-collapse:collapse;width:100%;font-size:11pt;cursor:pointer;";
      const render = () => {
        dom.innerHTML = buildInner(node.attrs as MergeTableAttrs);
      };
      render();
      const unsub = subscribePreview(render);

      // Toolbar flutuante ao clicar
      let toolbar: HTMLDivElement | null = null;
      const closeToolbar = () => {
        if (toolbar) { toolbar.remove(); toolbar = null; }
        document.removeEventListener("mousedown", onDocDown, true);
      };
      const onDocDown = (e: MouseEvent) => {
        if (toolbar && !toolbar.contains(e.target as globalThis.Node) && !dom.contains(e.target as globalThis.Node)) closeToolbar();
      };
      const openToolbar = () => {
        closeToolbar();
        const attrs = node.attrs as MergeTableAttrs;
        toolbar = document.createElement("div");
        toolbar.contentEditable = "false";
        toolbar.style.cssText = "position:absolute;top:-40px;left:0;z-index:50;display:flex;gap:6px;align-items:center;background:#fff;border:1px solid #e5e7eb;border-radius:6px;padding:4px 8px;box-shadow:0 2px 8px rgba(0,0,0,0.1);font-size:12px;";
        toolbar.innerHTML = `
          <span style="color:#555;">Linhas:</span>
          <input type="number" min="1" value="${attrs.from ?? 1}" style="width:56px;padding:2px 4px;border:1px solid #ccc;border-radius:4px;" data-k="from" />
          <span style="color:#555;">até</span>
          <input type="number" min="0" value="${attrs.to ?? 0}" placeholder="todas" style="width:56px;padding:2px 4px;border:1px solid #ccc;border-radius:4px;" data-k="to" />
          <button type="button" data-a="apply" style="padding:2px 8px;background:#2563eb;color:#fff;border:none;border-radius:4px;cursor:pointer;">Aplicar</button>
          <button type="button" data-a="dup" style="padding:2px 8px;background:#f3f4f6;border:1px solid #d1d5db;border-radius:4px;cursor:pointer;">Duplicar</button>
          <button type="button" data-a="del" style="padding:2px 8px;background:#fee2e2;color:#b91c1c;border:1px solid #fecaca;border-radius:4px;cursor:pointer;">Excluir</button>
        `;
        wrapper.appendChild(toolbar);
        const getVals = () => {
          const from = Number((toolbar!.querySelector('[data-k="from"]') as HTMLInputElement).value) || 1;
          const to = Number((toolbar!.querySelector('[data-k="to"]') as HTMLInputElement).value) || 0;
          return { from, to };
        };
        toolbar.addEventListener("click", (e) => {
          const t = e.target as HTMLElement;
          const a = t.getAttribute("data-a");
          if (!a) return;
          const pos = typeof getPos === "function" ? getPos() : null;
          if (pos == null) return;
          if (a === "apply") {
            let { from, to } = getVals();
            const previewRows = getPreviewRows((node.attrs as MergeTableAttrs).alias);
            const total = previewRows.length;
            if (from < 1) from = 1;
            if (total >= 2 && from > total - 1) from = total - 1;
            if (to !== 0) {
              if (to < from) to = from;
              if (total > 0 && to > total) to = total;
            }
            (toolbar!.querySelector('[data-k="from"]') as HTMLInputElement).value = String(from);
            (toolbar!.querySelector('[data-k="to"]') as HTMLInputElement).value = String(to);
            editor.chain().focus().command(({ tr }) => {
              tr.setNodeMarkup(pos, undefined, { ...node.attrs, from, to });
              return true;
            }).run();
            closeToolbar();
          } else if (a === "dup") {
            editor.chain().focus().insertContentAt(pos + node.nodeSize, { type: "mergeTable", attrs: { ...node.attrs } }).run();
            closeToolbar();
          } else if (a === "del") {
            editor.chain().focus().deleteRange({ from: pos, to: pos + node.nodeSize }).run();
            closeToolbar();
          }
        });
        setTimeout(() => document.addEventListener("mousedown", onDocDown, true), 0);
      };
      dom.addEventListener("click", (e) => { e.stopPropagation(); openToolbar(); });

      wrapper.appendChild(dom);
      return {
        dom: wrapper,
        update(updated) {
          if (updated.type.name !== "mergeTable") return false;
          dom.setAttribute("data-from", String(updated.attrs.from ?? 1));
          dom.setAttribute("data-to", String(updated.attrs.to ?? 0));
          dom.innerHTML = buildInner(updated.attrs as MergeTableAttrs);
          return true;
        },
        destroy: () => { unsub(); closeToolbar(); },
      };
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
