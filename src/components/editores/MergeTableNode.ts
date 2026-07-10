import { Node, mergeAttributes } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
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
  width?: string; // ex "100%", "560px"
  colWidths?: (string | null)[];
  rowHeights?: (string | null)[];
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
  const totalCols = cols.length + extras.length;
  const cw = attrs.colWidths || [];
  const rh = attrs.rowHeights || [];
  const cellStyle = `border:1px solid #ccc;padding:4px;text-align:${attrs.align || "left"};` +
    (attrs.color ? `color:${attrs.color};` : "") +
    (attrs.fontSize ? `font-size:${attrs.fontSize};` : "") +
    (attrs.fontFamily ? `font-family:${attrs.fontFamily};` : "");
  const headStyle = cellStyle + "background:#f4f4f4;font-weight:600;";
  let colgroup = "";
  if (cw.length) {
    colgroup = "<colgroup>" + Array.from({ length: totalCols }).map((_, i) => {
      const w = cw[i];
      return w ? `<col style="width:${esc(w)};" />` : "<col />";
    }).join("") + "</colgroup>";
  }
  const rowStyle = (idx: number) => rh[idx] ? ` style="height:${esc(rh[idx]!)};"` : "";
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
    body = displayed.map((r, ri) => {
      const base = cols.map((c) => `<td style="${cellStyle}">${esc(fmt(r?.[c]))}</td>`).join("");
      const calc = extras.map((e) => {
        const v = evalFormula(e.formula, r || {});
        return `<td style="${cellStyle}">${esc(fmt(v))}</td>`;
      }).join("");
      return `<tr${rowStyle(ri + 1)}>${base}${calc}</tr>`;
    }).join("");
  } else {
    const tokenStyle = cellStyle + "font-family:monospace;color:#1e40af;";
    body = `<tr${rowStyle(1)}>${cols
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
    body += `<tr${rowStyle(displayed.length + 1)}>${totBase}${totCalc}</tr>`;
  }
  return `${colgroup}<thead><tr${rowStyle(0)}>${th}</tr></thead><tbody>${body}</tbody>`;
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
      width: { default: "100%" },
      colWidths: { default: [] },
      rowHeights: { default: [] },
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
            width: e.style.width || e.getAttribute("data-width") || "100%",

          };
        },
      },
    ];
  },

  renderHTML({ node }) {
    const attrs = node.attrs as MergeTableAttrs;
    const table = document.createElement("table");
    table.setAttribute("data-merge-table", "1");
    table.setAttribute("data-alias", attrs.alias || "");
    table.setAttribute("data-cols", (attrs.cols || []).join(","));
    table.setAttribute("data-from", String(attrs.from ?? 1));
    table.setAttribute("data-to", String(attrs.to ?? 0));
    table.setAttribute("data-color", attrs.color || "");
    table.setAttribute("data-font-size", attrs.fontSize || "");
    table.setAttribute("data-font-family", attrs.fontFamily || "");
    table.setAttribute("data-align", attrs.align || "left");
    table.setAttribute("data-extra-cols", JSON.stringify(attrs.extraCols || []));
      table.setAttribute("data-totals", attrs.totalsRow ? "1" : "0");
      table.setAttribute("data-width", attrs.width || "100%");
      table.setAttribute("style", `border-collapse:collapse;width:${attrs.width || "100%"};font-size:11pt;`);
      table.innerHTML = buildInner(attrs);

    return table;
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      const wrapper = document.createElement("div");
      wrapper.style.cssText = "position:relative;margin:8px 0;display:block;";
      const dom = document.createElement("table");
      dom.setAttribute("data-merge-table", "1");
      const applyWidth = (w?: string) => {
        const width = w || "100%";
        dom.style.cssText = `border-collapse:collapse;width:${width};font-size:11pt;cursor:pointer;table-layout:fixed;`;
        wrapper.style.width = width.endsWith("%") ? width : width;
      };

      applyWidth(node.attrs.width);
      const syncAttrs = (n: any) => {
        dom.setAttribute("data-alias", n.attrs.alias);
        dom.setAttribute("data-cols", (n.attrs.cols || []).join(","));
        dom.setAttribute("data-from", String(n.attrs.from ?? 1));
        dom.setAttribute("data-to", String(n.attrs.to ?? 0));
        dom.setAttribute("data-width", n.attrs.width || "100%");
        applyWidth(n.attrs.width);
      };
      syncAttrs(node);
      const render = () => { dom.innerHTML = buildInner(node.attrs as MergeTableAttrs); };
      render();
      const unsub = subscribePreview(render);

      // Handle de redimensionamento (canto inferior direito)
      const resizeHandle = document.createElement("div");
      resizeHandle.contentEditable = "false";
      resizeHandle.title = "Arraste para redimensionar";
      resizeHandle.style.cssText = "position:absolute;right:-6px;bottom:-6px;width:14px;height:14px;background:#2563eb;border:2px solid #fff;border-radius:3px;cursor:nwse-resize;z-index:20;opacity:0;transition:opacity .15s;";
      wrapper.addEventListener("mouseenter", () => { resizeHandle.style.opacity = "1"; });
      wrapper.addEventListener("mouseleave", () => { if (!toolbar) resizeHandle.style.opacity = "0"; });
      resizeHandle.addEventListener("mousedown", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (!editor.isEditable) return;
        const startX = ev.clientX;
        const startW = dom.getBoundingClientRect().width;
        const parentW = (wrapper.parentElement?.getBoundingClientRect().width || startW);
        const onMove = (m: MouseEvent) => {
          const w = Math.max(80, startW + (m.clientX - startX));
          dom.style.width = `${Math.round(w)}px`;
          wrapper.style.width = `${Math.round(w)}px`;
          void parentW;
        };
        const onUp = () => {
          window.removeEventListener("mousemove", onMove);
          window.removeEventListener("mouseup", onUp);
          update({ width: dom.style.width });
        };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
      });

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

      // Redimensionamento de linhas/colunas estilo Word
      const EDGE = 6;
      dom.addEventListener("mousemove", (e) => {
        const cell = (e.target as HTMLElement).closest("td, th") as HTMLTableCellElement | null;
        if (!cell) { dom.style.cursor = "pointer"; return; }
        const r = cell.getBoundingClientRect();
        const nearRight = r.right - e.clientX < EDGE;
        const nearBottom = r.bottom - e.clientY < EDGE;
        dom.style.cursor = nearRight ? "col-resize" : nearBottom ? "row-resize" : "pointer";
      });
      dom.addEventListener("mousedown", (e) => {
        if (!editor.isEditable) return;
        const cell = (e.target as HTMLElement).closest("td, th") as HTMLTableCellElement | null;
        if (!cell) return;
        const r = cell.getBoundingClientRect();
        const nearRight = r.right - e.clientX < EDGE;
        const nearBottom = r.bottom - e.clientY < EDGE;
        if (!nearRight && !nearBottom) return;
        e.preventDefault();
        e.stopPropagation();
        const row = cell.parentElement as HTMLTableRowElement;
        const rowIdx = row.rowIndex;
        const colIdx = cell.cellIndex;
        const startX = e.clientX, startY = e.clientY;
        const startW = r.width, startH = r.height;
        let lastW = startW, lastH = startH;
        const onMove = (m: MouseEvent) => {
          if (nearRight) {
            lastW = Math.max(30, startW + (m.clientX - startX));
            Array.from(dom.querySelectorAll("tr")).forEach((tr) => {
              const c = (tr as HTMLTableRowElement).cells[colIdx];
              if (c) c.style.width = `${Math.round(lastW)}px`;
            });
          }
          if (nearBottom) {
            lastH = Math.max(18, startH + (m.clientY - startY));
            row.style.height = `${Math.round(lastH)}px`;
          }
        };
        const onUp = () => {
          window.removeEventListener("mousemove", onMove);
          window.removeEventListener("mouseup", onUp);
          const patch: Partial<MergeTableAttrs> = {};
          if (nearRight) {
            const cw = [...((node.attrs.colWidths || []) as (string | null)[])];
            cw[colIdx] = `${Math.round(lastW)}px`;
            patch.colWidths = cw;
          }
          if (nearBottom) {
            const rh = [...((node.attrs.rowHeights || []) as (string | null)[])];
            rh[rowIdx] = `${Math.round(lastH)}px`;
            patch.rowHeights = rh;
          }
          update(patch);
        };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
      });


      const openFormulaPicker = (
        initial: string,
        target: "extra" | "row",
        idx: number,
        onSave: (v: string) => void,
      ) => {
        const cols = (node.attrs.cols || []) as string[];
        const sysKeys = getSystemFieldKeys();
        const overlay = document.createElement("div");
        overlay.contentEditable = "false";
        overlay.style.cssText = "position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;";
        overlay.innerHTML = `
          <div style="background:#fff;border-radius:8px;box-shadow:0 10px 30px rgba(0,0,0,0.2);padding:16px;width:560px;max-width:92vw;max-height:80vh;overflow:auto;font-size:13px;">
            <div style="font-weight:600;margin-bottom:8px;">Editor de fórmula</div>
            <textarea data-f style="width:100%;height:80px;border:1px solid #d1d5db;border-radius:6px;padding:6px 8px;font-family:monospace;font-size:12px;">${esc(initial)}</textarea>
            <div style="color:#6b7280;font-size:11px;margin:6px 0 10px;">Ex.: <code>preco * qtd</code> · use <code>+ - * / ()</code> · <code>Math.round(x*100)/100</code></div>
            <div style="margin-bottom:6px;font-weight:600;color:#374151;">Colunas da tabela</div>
            <div data-cols style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:12px;">
              ${cols.map((c) => `<button type="button" data-ins="${esc(c)}" style="padding:2px 8px;background:#dbeafe;border:1px solid #93c5fd;border-radius:4px;font-family:monospace;font-size:11px;cursor:pointer;">${esc(c)}</button>`).join("")}
              ${cols.length ? "" : '<span style="color:#9ca3af;font-size:11px;">Sem colunas.</span>'}
            </div>
            <div style="margin-bottom:6px;font-weight:600;color:#374151;">Campos do sistema (registro atual)</div>
            <div data-sys style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:12px;max-height:160px;overflow:auto;">
              ${sysKeys.length ? sysKeys.map((k) => `<button type="button" data-ins="${esc(k)}" style="padding:2px 8px;background:#dcfce7;border:1px solid #86efac;border-radius:4px;font-family:monospace;font-size:11px;cursor:pointer;">${esc(k)}</button>`).join("") : '<span style="color:#9ca3af;font-size:11px;">Ative a visualização para listar campos.</span>'}
            </div>
            <div style="display:flex;justify-content:flex-end;gap:6px;">
              <button type="button" data-a="cancel" style="padding:4px 12px;background:#f3f4f6;border:1px solid #d1d5db;border-radius:4px;cursor:pointer;">Cancelar</button>
              <button type="button" data-a="ok" style="padding:4px 12px;background:#2563eb;color:#fff;border:none;border-radius:4px;cursor:pointer;">OK</button>
            </div>
          </div>`;
        document.body.appendChild(overlay);
        const ta = overlay.querySelector("[data-f]") as HTMLTextAreaElement;
        ta.focus();
        const insertAtCursor = (text: string) => {
          const s = ta.selectionStart ?? ta.value.length;
          const e = ta.selectionEnd ?? ta.value.length;
          ta.value = ta.value.slice(0, s) + text + ta.value.slice(e);
          ta.selectionStart = ta.selectionEnd = s + text.length;
          ta.focus();
        };
        overlay.addEventListener("click", (ev) => {
          const t = ev.target as HTMLElement;
          const ins = t.getAttribute("data-ins");
          if (ins) { insertAtCursor(ins); return; }
          const act = t.getAttribute("data-a");
          if (act === "cancel" || t === overlay) { overlay.remove(); return; }
          if (act === "ok") { onSave(ta.value); overlay.remove(); }
        });
        // referencia target/idx para futuras extensões (não usadas por enquanto)
        void target; void idx;
      };

      const openToolbar = () => {
        closeToolbar();
        const a = node.attrs as MergeTableAttrs;
        toolbar = document.createElement("div");
        toolbar.contentEditable = "false";
        toolbar.style.cssText = "position:absolute;top:-40px;left:0;z-index:50;display:flex;flex-wrap:wrap;gap:6px;align-items:center;background:#fff;border:1px solid #e5e7eb;border-radius:6px;padding:4px 8px;box-shadow:0 2px 8px rgba(0,0,0,0.1);font-size:12px;max-width:720px;";
        toolbar.innerHTML = `
          <span style="color:#555;">Alinh.:</span>
          <button type="button" data-a="al-left" title="Esquerda" style="padding:2px 6px;background:${a.align==="left"?"#dbeafe":"#f9fafb"};border:1px solid #d1d5db;border-radius:4px;cursor:pointer;">⬅</button>
          <button type="button" data-a="al-center" title="Centro" style="padding:2px 6px;background:${a.align==="center"?"#dbeafe":"#f9fafb"};border:1px solid #d1d5db;border-radius:4px;cursor:pointer;">↔</button>
          <button type="button" data-a="al-right" title="Direita" style="padding:2px 6px;background:${a.align==="right"?"#dbeafe":"#f9fafb"};border:1px solid #d1d5db;border-radius:4px;cursor:pointer;">➡</button>
          <span style="width:1px;height:18px;background:#e5e7eb;"></span>
          <span style="color:#555;">Cor:</span>
          <input type="color" value="${a.color || "#111111"}" data-k="color" style="width:28px;height:22px;border:1px solid #ccc;border-radius:4px;padding:0;cursor:pointer;" />
          <span style="color:#555;">Tam.:</span>
          <input type="text" value="${esc(a.fontSize || "11pt")}" placeholder="11pt" data-k="fontSize" style="width:52px;padding:2px 4px;border:1px solid #ccc;border-radius:4px;" />
          <span style="color:#555;">Fonte:</span>
          <select data-k="fontFamily" style="padding:2px 4px;border:1px solid #ccc;border-radius:4px;font-size:11px;">
            ${["", "Arial", "Helvetica", "Times New Roman", "Georgia", "Courier New", "Verdana", "Tahoma"].map(f => `<option value="${esc(f)}" ${((a.fontFamily||"")===f)?"selected":""}>${f||"Padrão"}</option>`).join("")}
          </select>
          <span style="width:1px;height:18px;background:#e5e7eb;"></span>
          <span style="color:#555;">Linhas:</span>
          <input type="number" min="1" value="${a.from ?? 1}" style="width:52px;padding:2px 4px;border:1px solid #ccc;border-radius:4px;" data-k="from" />
          <span style="color:#555;">até</span>
          <input type="number" min="0" value="${a.to ?? 0}" placeholder="todas" style="width:52px;padding:2px 4px;border:1px solid #ccc;border-radius:4px;" data-k="to" />
          <span style="width:1px;height:18px;background:#e5e7eb;"></span>
          <span style="color:#555;">Largura:</span>
          <input type="text" value="${esc(a.width || "100%")}" placeholder="100% ou 500px" style="width:72px;padding:2px 4px;border:1px solid #ccc;border-radius:4px;" data-k="width" />
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
              <button type="button" data-ex="edit" data-i="${i}" style="flex:1;text-align:left;padding:2px 8px;background:#f9fafb;border:1px dashed #9ca3af;border-radius:4px;cursor:pointer;font-family:monospace;color:${e.formula ? "#111" : "#9ca3af"};">${e.formula ? esc(e.formula) : "clique para montar a fórmula"}</button>
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
          if (ex === "edit") {
            const i = Number(t.getAttribute("data-i"));
            const list = [...(node.attrs.extraCols || [])] as ExtraCol[];
            openFormulaPicker(list[i]?.formula || "", "extra", i, (val) => {
              list[i] = { ...list[i], formula: val };
              update({ extraCols: list });
              setTimeout(() => openToolbar(), 0);
            });
            return;
          }
          const act = t.getAttribute("data-a");
          if (!act) return;
          if (act === "al-left" || act === "al-center" || act === "al-right") {
            const align = act.replace("al-", "") as "left" | "center" | "right";
            update({ align });
            setTimeout(() => openToolbar(), 0);
            return;
          }
          if (act === "apply") {
            const from = Number((toolbar!.querySelector('[data-k="from"]') as HTMLInputElement).value) || 1;
            const to = Number((toolbar!.querySelector('[data-k="to"]') as HTMLInputElement).value) || 0;
            const widthRaw = ((toolbar!.querySelector('[data-k="width"]') as HTMLInputElement).value || "100%").trim();
            const width = /^\d+$/.test(widthRaw) ? `${widthRaw}px` : widthRaw;
            const totalsRow = (toolbar!.querySelector('[data-a="totals"]') as HTMLInputElement).checked;
            const color = (toolbar!.querySelector('[data-k="color"]') as HTMLInputElement).value || null;
            const fontSize = ((toolbar!.querySelector('[data-k="fontSize"]') as HTMLInputElement).value || "").trim() || null;
            const fontFamily = ((toolbar!.querySelector('[data-k="fontFamily"]') as HTMLSelectElement).value || "").trim() || null;
            const extras: ExtraCol[] = [];
            const existing = (node.attrs.extraCols || []) as ExtraCol[];
            toolbar!.querySelectorAll('[data-ex="h"]').forEach((el, i) => {
              const h = (el as HTMLInputElement).value;
              extras.push({ header: h, formula: existing[i]?.formula || "" });
            });
            update({ from, to, width, totalsRow, extraCols: extras, color, fontSize, fontFamily });
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
      dom.addEventListener("click", (e) => {
        e.stopPropagation();
        if (editor.isEditable) {
          const pos = typeof getPos === "function" ? getPos() : null;
          if (pos != null) {
            const { view } = editor;
            try {
              view.dispatch(view.state.tr.setSelection(NodeSelection.create(view.state.doc, pos)));
              view.focus();
            } catch { /* noop */ }
          }
        }
        openToolbar();
      });

      wrapper.appendChild(dom);
      wrapper.appendChild(resizeHandle);

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
