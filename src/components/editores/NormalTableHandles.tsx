import { useEffect } from "react";
import type { Editor } from "@tiptap/react";

/**
 * Overlay estilo Word para tabelas normais do Tiptap.
 * Aparece ao clicar dentro de uma tabela e oferece:
 *  - Inserir linha acima/abaixo
 *  - Inserir coluna à esquerda/direita
 *  - Excluir linha / coluna / tabela
 *  - Mesclar / dividir células
 *  - Alternar cabeçalho
 *  - Redimensionar largura (handle no canto inferior direito)
 */
export function useNormalTableHandles(editor: Editor | null, rootRef: HTMLElement | null) {
  useEffect(() => {
    if (!editor || !rootRef) return;

    let currentTable: HTMLTableElement | null = null;
    let toolbar: HTMLDivElement | null = null;
    let handle: HTMLDivElement | null = null;

    const btn = (label: string, action: string, title: string, danger = false) =>
      `<button type="button" data-a="${action}" title="${title}" style="padding:3px 8px;background:${danger ? "#fee2e2" : "#f9fafb"};color:${danger ? "#b91c1c" : "#111"};border:1px solid ${danger ? "#fecaca" : "#d1d5db"};border-radius:4px;cursor:pointer;font-size:12px;">${label}</button>`;
    const sep = `<span style="width:1px;height:18px;background:#e5e7eb;"></span>`;

    const cleanup = () => {
      toolbar?.remove();
      handle?.remove();
      toolbar = null;
      handle = null;
      currentTable = null;
    };

    const applyWidth = (w: string) => {
      if (!currentTable) return;
      currentTable.style.width = w;
      currentTable.setAttribute("data-width", w);
    };

    const position = () => {
      if (!currentTable || !toolbar || !handle) return;
      const r = currentTable.getBoundingClientRect();
      const pr = rootRef.getBoundingClientRect();
      toolbar.style.left = `${r.left - pr.left + rootRef.scrollLeft}px`;
      toolbar.style.top = `${r.top - pr.top + rootRef.scrollTop - 40}px`;
      handle.style.left = `${r.right - pr.left + rootRef.scrollLeft - 8}px`;
      handle.style.top = `${r.bottom - pr.top + rootRef.scrollTop - 8}px`;
    };

    const runAction = (act: string) => {
      const c = editor.chain().focus();
      switch (act) {
        case "row-above": c.addRowBefore().run(); break;
        case "row-below": c.addRowAfter().run(); break;
        case "col-left": c.addColumnBefore().run(); break;
        case "col-right": c.addColumnAfter().run(); break;
        case "del-row": c.deleteRow().run(); break;
        case "del-col": c.deleteColumn().run(); break;
        case "merge": c.mergeCells().run(); break;
        case "split": c.splitCell().run(); break;
        case "header-row": c.toggleHeaderRow().run(); break;
        case "header-col": c.toggleHeaderColumn().run(); break;
        case "del-table": c.deleteTable().run(); cleanup(); return;
      }
      setTimeout(position, 0);
    };

    const mount = (table: HTMLTableElement) => {
      cleanup();
      currentTable = table;
      const w = table.style.width || "100%";

      toolbar = document.createElement("div");
      toolbar.contentEditable = "false";
      toolbar.style.cssText =
        "position:absolute;z-index:40;display:flex;gap:4px;align-items:center;background:#fff;border:1px solid #e5e7eb;border-radius:6px;padding:4px 6px;box-shadow:0 2px 10px rgba(0,0,0,0.12);font-size:12px;flex-wrap:wrap;max-width:720px;";
      toolbar.innerHTML = [
        btn("↑ Linha", "row-above", "Inserir linha acima"),
        btn("↓ Linha", "row-below", "Inserir linha abaixo"),
        btn("← Coluna", "col-left", "Inserir coluna à esquerda"),
        btn("→ Coluna", "col-right", "Inserir coluna à direita"),
        sep,
        btn("− Linha", "del-row", "Excluir linha", true),
        btn("− Coluna", "del-col", "Excluir coluna", true),
        sep,
        btn("Mesclar", "merge", "Mesclar células selecionadas"),
        btn("Dividir", "split", "Dividir célula"),
        sep,
        btn("Cab. linha", "header-row", "Alternar cabeçalho da linha"),
        btn("Cab. coluna", "header-col", "Alternar cabeçalho da coluna"),
        sep,
        `<span style="color:#555;">Larg.:</span><input type="text" value="${w}" style="width:64px;padding:2px 4px;border:1px solid #ccc;border-radius:4px;" data-k="w" />`,
        sep,
        btn("Excluir tabela", "del-table", "Excluir tabela inteira", true),
      ].join("");

      toolbar.addEventListener("mousedown", (e) => e.stopPropagation());
      toolbar.addEventListener("click", (e) => {
        const act = (e.target as HTMLElement).getAttribute("data-a");
        if (act) runAction(act);
      });
      toolbar.addEventListener("change", (e) => {
        const t = e.target as HTMLInputElement;
        if (t.dataset.k === "w") {
          const v = t.value.trim();
          applyWidth(/^\d+$/.test(v) ? `${v}px` : v || "100%");
          position();
        }
      });

      handle = document.createElement("div");
      handle.contentEditable = "false";
      handle.title = "Arraste para redimensionar";
      handle.style.cssText =
        "position:absolute;width:14px;height:14px;background:#2563eb;border:2px solid #fff;border-radius:3px;cursor:nwse-resize;z-index:40;";
      handle.addEventListener("mousedown", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (!currentTable) return;
        const startX = ev.clientX;
        const startW = currentTable.getBoundingClientRect().width;
        const onMove = (m: MouseEvent) => {
          const nw = Math.max(80, startW + (m.clientX - startX));
          applyWidth(`${Math.round(nw)}px`);
          const inp = toolbar?.querySelector('[data-k="w"]') as HTMLInputElement | null;
          if (inp) inp.value = `${Math.round(nw)}px`;
          position();
        };
        const onUp = () => {
          window.removeEventListener("mousemove", onMove);
          window.removeEventListener("mouseup", onUp);
        };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
      });

      rootRef.appendChild(toolbar);
      rootRef.appendChild(handle);
      position();
    };

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const table = target.closest("table") as HTMLTableElement | null;
      if (table && !table.hasAttribute("data-merge-table") && editor.isEditable) {
        if (currentTable !== table) mount(table);
        else position();
      } else if (toolbar && !toolbar.contains(target) && handle !== target) {
        cleanup();
      }
    };

    // Redimensionamento de linhas estilo Word (arrastar borda inferior da célula)
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const cell = target.closest("td, th") as HTMLTableCellElement | null;
      if (!cell) return;
      const table = cell.closest("table") as HTMLTableElement | null;
      if (!table || table.hasAttribute("data-merge-table") || !editor.isEditable) return;
      const rect = cell.getBoundingClientRect();
      if (e.clientY < rect.bottom - 6) return; // só na faixa inferior
      e.preventDefault();
      const row = cell.parentElement as HTMLTableRowElement;
      const startY = e.clientY;
      const startH = row.getBoundingClientRect().height;
      const onMove = (m: MouseEvent) => {
        const nh = Math.max(20, startH + (m.clientY - startY));
        row.style.height = `${Math.round(nh)}px`;
        Array.from(row.children).forEach((c) => {
          (c as HTMLElement).style.height = `${Math.round(nh)}px`;
        });
      };
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    };

    const onScroll = () => position();

    rootRef.addEventListener("click", onClick);
    rootRef.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      rootRef.removeEventListener("click", onClick);
      rootRef.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
      cleanup();
    };
  }, [editor, rootRef]);
}
