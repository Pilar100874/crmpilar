import { useEffect } from "react";
import type { Editor } from "@tiptap/react";

/**
 * Overlay leve para tabelas normais do Tiptap:
 * - Botão de excluir tabela
 * - Campo de largura (%/px)
 * - Handle de arrasto no canto inferior direito para redimensionar
 */
export function useNormalTableHandles(editor: Editor | null, rootRef: HTMLElement | null) {
  useEffect(() => {
    if (!editor || !rootRef) return;

    let currentTable: HTMLTableElement | null = null;
    let toolbar: HTMLDivElement | null = null;
    let handle: HTMLDivElement | null = null;

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

    const deleteTable = () => {
      editor.chain().focus().deleteTable().run();
      cleanup();
    };

    const position = () => {
      if (!currentTable || !toolbar || !handle) return;
      const r = currentTable.getBoundingClientRect();
      const pr = rootRef.getBoundingClientRect();
      toolbar.style.left = `${r.left - pr.left + rootRef.scrollLeft}px`;
      toolbar.style.top = `${r.top - pr.top + rootRef.scrollTop - 34}px`;
      handle.style.left = `${r.right - pr.left + rootRef.scrollLeft - 8}px`;
      handle.style.top = `${r.bottom - pr.top + rootRef.scrollTop - 8}px`;
    };

    const mount = (table: HTMLTableElement) => {
      cleanup();
      currentTable = table;
      const w = table.style.width || "100%";

      toolbar = document.createElement("div");
      toolbar.contentEditable = "false";
      toolbar.style.cssText =
        "position:absolute;z-index:40;display:flex;gap:6px;align-items:center;background:#fff;border:1px solid #e5e7eb;border-radius:6px;padding:3px 6px;box-shadow:0 2px 8px rgba(0,0,0,0.1);font-size:12px;";
      toolbar.innerHTML = `
        <span style="color:#555;">Largura:</span>
        <input type="text" value="${w}" style="width:70px;padding:2px 4px;border:1px solid #ccc;border-radius:4px;" data-k="w" />
        <button type="button" data-a="del" style="padding:2px 8px;background:#fee2e2;color:#b91c1c;border:1px solid #fecaca;border-radius:4px;cursor:pointer;">Excluir</button>
      `;
      toolbar.addEventListener("mousedown", (e) => e.stopPropagation());
      toolbar.addEventListener("click", (e) => {
        const t = e.target as HTMLElement;
        if (t.getAttribute("data-a") === "del") deleteTable();
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
