import { Node, mergeAttributes } from "@tiptap/core";
import { getPreviewRows, subscribePreview, getSystemFieldKeys } from "@/lib/editores/mergePreviewStore";

/**
 * Nó de bloco que renderiza uma tabela vinculada a um alias de dados.
 * Suporta:
 *  - Formatação global (cor, tamanho, fonte, alinhamento) aplicada a todas células
 *  - Colunas calculadas via fórmula: use nomes de colunas de origem (ex: "preco * qtd").
 *  - Linha de totais (SUM por coluna numérica; fórmulas ficam vazias no total, ou usam agregação).
 */
export interface ExtraCol { header: string; formula: string }
export interface MergeTableAttrs {
  alias: string;
  cols: string[];
  from: number;
  to: number;
  color?: string;
  fontSize?: string; // ex "12pt"
  fontFamily?: string;
  align?: "left" | "center" | "right";
  extraCols?: ExtraCol[];
  totalsRow?: boolean;
}

function fmt(v: any): string {
  if (v == null) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
function num(v: any): number {
  if (typeof v === "number") return v;
  const n = parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}
function evalFormula(expr: string, row: Record<string, any>): any {
  try {
    const keys = Object.keys(row);
    const vals = keys.map((k) => num(row[k]));
    // eslint-disable-next-line no-new-func
    const fn = new Function(...keys, `"use strict"; return (${expr});`);
    const v = fn(...vals);
    return typeof v === "number" && Number.isFinite(v) ? v : "";
  } catch { return ""; }
}

function buildInner(attrs: MergeTableAttrs): string {
  const cols = attrs.cols || [];
  const extras = attrs.extraCols || [];
  const cellStyle = `border:1px solid #ccc;padding:4px;text-align:${attrs.align || "left"};` +
    (attrs.color ? `color:${attrs.color};` : "") +
    (attrs.fontSize ? `font-size:${attrs.fontSize};` : "") +
    (attrs.fontFamily ? `font-family:${attrs.fontFamily};` : "");
  const headStyle = cellStyle + "background:#f4f4f4;font-weight:600;";
  const th = [...cols, ...extras.map((e) => e.header || "calc")]
    .map((c) => `<th style="${headStyle}">${esc(c)}</th>`).join("");
  const rows = getPreviewRows(attrs.alias);
  let body = "";
  let displayed: any[] = [];
  if (rows.length) {
    const total = rows.length;
    let from = Math.max(1, attrs.from || 1);
    if (from > total) from = total;
    let to = attrs.to && attrs.to > 0 ? attrs.to : total;
    if (to > total) to = total;
    if (to < from) to = from;
    displayed = rows.slice(from - 1, to);
    body = displayed.map((r) => {
      const base = cols.map((c) => `<td style="${cellStyle}">${esc(fmt(r?.[c]))}</td>`).join("");
      const calc = extras.map((e) => {
        const v = evalFormula(e.formula, r || {});
        return `<td style="${cellStyle}">${esc(fmt(v))}</td>`;
      }).join("");
      return `<tr>${base}${calc}</tr>`;
    }).join("");
  } else {
    const tokenStyle = cellStyle + "font-family:monospace;color:#1e40af;";
    body = `<tr>${cols
      .map((c) => `<td style="${tokenStyle}">{{${esc(attrs.alias)}.${esc(c)}}}</td>`)
      .join("")}${extras.map((e) => `<td style="${cellStyle}">= ${esc(e.formula)}</td>`).join("")}</tr>`;
  }
  if (attrs.totalsRow && displayed.length) {
    const totStyle = cellStyle + "font-weight:700;background:#fafafa;";
    const totBase = cols.map((c, i) => {
      const sum = displayed.reduce((a, r) => a + num(r?.[c]), 0);
      const isNum = displayed.some((r) => num(r?.[c]) !== 0);
      return `<td style="${totStyle}">${i === 0 ? "Total" : (isNum ? esc(fmt(sum)) : "")}</td>`;
    }).join("");
    const totCalc = extras.map((e) => {
      const sum = displayed.reduce((a, r) => a + num(evalFormula(e.formula, r || {})), 0);
      return `<td style="${totStyle}">${esc(fmt(sum))}</td>`;
    }).join("");
    body += `<tr>${totBase}${totCalc}</tr>`;
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
      color: { default: null },
      fontSize: { default: null },
      fontFamily: { default: null },
      align: { default: "left" },
      extraCols: { default: [] },
      totalsRow: { default: false },
    };
  },

  parseHTML() {
    return [
      {
        tag: "table[data-merge-table]",
        getAttrs: (el) => {
          const e = el as HTMLElement;
          const cols = (e.getAttribute("data-cols") || "").split(",").filter(Boolean);
          let extraCols: ExtraCol[] = [];
          try { extraCols = JSON.parse(e.getAttribute("data-extra-cols") || "[]"); } catch { /* noop */ }
          return {
            alias: e.getAttribute("data-alias") || "",
            cols,
            from: Number(e.getAttribute("data-from") || 1),
            to: Number(e.getAttribute("data-to") || 0),
            color: e.getAttribute("data-color") || null,
            fontSize: e.getAttribute("data-font-size") || null,
            fontFamily: e.getAttribute("data-font-family") || null,
            align: (e.getAttribute("data-align") as any) || "left",
            extraCols,
            totalsRow: e.getAttribute("data-totals") === "1",
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
        "data-color": attrs.color || "",
        "data-font-size": attrs.fontSize || "",
        "data-font-family": attrs.fontFamily || "",
        "data-align": attrs.align || "left",
        "data-extra-cols": JSON.stringify(attrs.extraCols || []),
        "data-totals": attrs.totalsRow ? "1" : "0",
        style: "border-collapse:collapse;width:100%;font-size:11pt;",
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
      dom.style.cssText = "border-collapse:collapse;width:100%;font-size:11pt;cursor:pointer;";
      const syncAttrs = (n: any) => {
        dom.setAttribute("data-alias", n.attrs.alias);
        dom.setAttribute("data-cols", (n.attrs.cols || []).join(","));
        dom.setAttribute("data-from", String(n.attrs.from ?? 1));
        dom.setAttribute("data-to", String(n.attrs.to ?? 0));
      };
      syncAttrs(node);
      const render = () => { dom.innerHTML = buildInner(node.attrs as MergeTableAttrs); };
      render();
      const unsub = subscribePreview(render);

      let toolbar: HTMLDivElement | null = null;
      const closeToolbar = () => {
        if (toolbar) { toolbar.remove(); toolbar = null; }
        document.removeEventListener("mousedown", onDocDown, true);
      };
      const onDocDown = (e: MouseEvent) => {
        if (toolbar && !toolbar.contains(e.target as globalThis.Node) && !dom.contains(e.target as globalThis.Node)) closeToolbar();
      };
      const update = (patch: Partial<MergeTableAttrs>) => {
        const pos = typeof getPos === "function" ? getPos() : null;
        if (pos == null) return;
        editor.chain().focus().command(({ tr }) => {
          tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...patch });
          return true;
        }).run();
      };
      const openToolbar = () => {
        closeToolbar();
        const a = node.attrs as MergeTableAttrs;
        toolbar = document.createElement("div");
        toolbar.contentEditable = "false";
        toolbar.style.cssText = "position:absolute;top:-44px;left:0;z-index:50;display:flex;flex-wrap:wrap;gap:6px;align-items:center;background:#fff;border:1px solid #e5e7eb;border-radius:6px;padding:4px 8px;box-shadow:0 2px 8px rgba(0,0,0,0.1);font-size:12px;max-width:720px;";
        toolbar.innerHTML = `
          <span style="color:#555;">Linhas:</span>
          <input type="number" min="1" value="${a.from ?? 1}" style="width:52px;padding:2px 4px;border:1px solid #ccc;border-radius:4px;" data-k="from" />
          <span style="color:#555;">até</span>
          <input type="number" min="0" value="${a.to ?? 0}" placeholder="todas" style="width:52px;padding:2px 4px;border:1px solid #ccc;border-radius:4px;" data-k="to" />
          <span style="width:1px;height:18px;background:#e5e7eb;"></span>
          <input type="color" value="${a.color || "#111111"}" data-a="color" title="Cor" style="width:26px;height:22px;padding:0;border:1px solid #ccc;border-radius:4px;" />
          <input type="text" value="${a.fontSize || ""}" placeholder="12pt" data-a="size" title="Tamanho" style="width:50px;padding:2px 4px;border:1px solid #ccc;border-radius:4px;" />
          <input type="text" value="${a.fontFamily || ""}" placeholder="Fonte" data-a="font" title="Fonte" style="width:80px;padding:2px 4px;border:1px solid #ccc;border-radius:4px;" />
          <select data-a="align" title="Alinhamento" style="padding:2px 4px;border:1px solid #ccc;border-radius:4px;">
            <option value="left" ${a.align==="left"?"selected":""}>Esq</option>
            <option value="center" ${a.align==="center"?"selected":""}>Centro</option>
            <option value="right" ${a.align==="right"?"selected":""}>Dir</option>
          </select>
          <span style="width:1px;height:18px;background:#e5e7eb;"></span>
          <button type="button" data-a="addcol" style="padding:2px 8px;background:#f3f4f6;border:1px solid #d1d5db;border-radius:4px;cursor:pointer;">+ Coluna fórmula</button>
          <label style="display:flex;align-items:center;gap:4px;"><input type="checkbox" data-a="totals" ${a.totalsRow?"checked":""}/> Totais</label>
          <span style="width:1px;height:18px;background:#e5e7eb;"></span>
          <button type="button" data-a="apply" style="padding:2px 8px;background:#2563eb;color:#fff;border:none;border-radius:4px;cursor:pointer;">Aplicar</button>
          <button type="button" data-a="dup" style="padding:2px 8px;background:#f3f4f6;border:1px solid #d1d5db;border-radius:4px;cursor:pointer;">Duplicar</button>
          <button type="button" data-a="del" style="padding:2px 8px;background:#fee2e2;color:#b91c1c;border:1px solid #fecaca;border-radius:4px;cursor:pointer;">Excluir</button>
          <div data-extras style="flex-basis:100%;display:flex;flex-direction:column;gap:4px;margin-top:4px;"></div>
        `;
        wrapper.appendChild(toolbar);

        const renderExtras = () => {
          const box = toolbar!.querySelector("[data-extras]") as HTMLDivElement;
          const extras = (node.attrs.extraCols || []) as ExtraCol[];
          box.innerHTML = extras.map((e, i) => `
            <div style="display:flex;gap:4px;align-items:center;">
              <input data-ex="h" data-i="${i}" value="${esc(e.header)}" placeholder="Cabeçalho" style="width:110px;padding:2px 4px;border:1px solid #ccc;border-radius:4px;" />
              <input data-ex="f" data-i="${i}" value="${esc(e.formula)}" placeholder="ex: preco * qtd" style="flex:1;padding:2px 4px;border:1px solid #ccc;border-radius:4px;font-family:monospace;" />
              <button type="button" data-ex="rm" data-i="${i}" style="padding:2px 6px;background:#fee2e2;color:#b91c1c;border:1px solid #fecaca;border-radius:4px;cursor:pointer;">×</button>
            </div>
          `).join("");
        };
        renderExtras();

        toolbar.addEventListener("click", (e) => {
          const t = e.target as HTMLElement;
          const ex = t.getAttribute("data-ex");
          if (ex === "rm") {
            const i = Number(t.getAttribute("data-i"));
            const list = [...(node.attrs.extraCols || [])];
            list.splice(i, 1);
            update({ extraCols: list });
            setTimeout(() => openToolbar(), 0);
            return;
          }
          const act = t.getAttribute("data-a");
          if (!act) return;
          if (act === "apply") {
            const from = Number((toolbar!.querySelector('[data-k="from"]') as HTMLInputElement).value) || 1;
            const to = Number((toolbar!.querySelector('[data-k="to"]') as HTMLInputElement).value) || 0;
            const color = (toolbar!.querySelector('[data-a="color"]') as HTMLInputElement).value || null;
            const fontSize = (toolbar!.querySelector('[data-a="size"]') as HTMLInputElement).value || null;
            const fontFamily = (toolbar!.querySelector('[data-a="font"]') as HTMLInputElement).value || null;
            const align = (toolbar!.querySelector('[data-a="align"]') as HTMLSelectElement).value as any;
            const totalsRow = (toolbar!.querySelector('[data-a="totals"]') as HTMLInputElement).checked;
            const extras: ExtraCol[] = [];
            toolbar!.querySelectorAll('[data-ex="h"]').forEach((el, i) => {
              const h = (el as HTMLInputElement).value;
              const f = (toolbar!.querySelector(`[data-ex="f"][data-i="${i}"]`) as HTMLInputElement)?.value || "";
              extras.push({ header: h, formula: f });
            });
            update({ from, to, color, fontSize, fontFamily, align, totalsRow, extraCols: extras });
            closeToolbar();
          } else if (act === "addcol") {
            const list = [...(node.attrs.extraCols || []), { header: "Total", formula: "" }];
            update({ extraCols: list });
            setTimeout(() => openToolbar(), 0);
          } else if (act === "dup") {
            const pos = typeof getPos === "function" ? getPos() : null;
            if (pos == null) return;
            editor.chain().focus().insertContentAt(pos + node.nodeSize, { type: "mergeTable", attrs: { ...node.attrs } }).run();
            closeToolbar();
          } else if (act === "del") {
            const pos = typeof getPos === "function" ? getPos() : null;
            if (pos == null) return;
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
          syncAttrs(updated);
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
