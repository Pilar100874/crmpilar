import Image from "@tiptap/extension-image";

/**
 * Image estendida com NodeView próprio que adiciona handles nos cantos
 * para redimensionar arrastando as bordas (estilo Word/Google Docs).
 */
export const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (el) => {
          const e = el as HTMLElement;
          return e.style.width || e.getAttribute("width") || null;
        },
        renderHTML: (attrs) => (attrs.width ? { style: `width:${attrs.width}` } : {}),
      },
      height: {
        default: null,
        parseHTML: (el) => {
          const e = el as HTMLElement;
          return e.style.height || e.getAttribute("height") || null;
        },
        renderHTML: (attrs) => (attrs.height ? { style: `height:${attrs.height}` } : {}),
      },
    };
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      const wrapper = document.createElement("span");
      wrapper.className = "doc-img-wrap";
      wrapper.style.display = "inline-block";
      wrapper.style.position = "relative";
      wrapper.style.lineHeight = "0";
      wrapper.style.maxWidth = "100%";

      const img = document.createElement("img");
      const setImgAttrs = (n: typeof node) => {
        img.src = n.attrs.src ?? "";
        if (n.attrs.alt) img.alt = n.attrs.alt;
        if (n.attrs.title) img.title = n.attrs.title;
        img.style.width = n.attrs.width ? String(n.attrs.width) : "";
        img.style.height = n.attrs.height ? String(n.attrs.height) : "";
        img.style.display = "block";
        img.style.maxWidth = "100%";
      };
      setImgAttrs(node);
      wrapper.appendChild(img);

      const handles = ["nw", "ne", "sw", "se"] as const;
      const handleEls: HTMLElement[] = [];
      handles.forEach((pos) => {
        const h = document.createElement("span");
        h.className = `doc-img-handle doc-img-handle-${pos}`;
        h.dataset.pos = pos;
        wrapper.appendChild(h);
        handleEls.push(h);

        h.addEventListener("mousedown", (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          if (!editor.isEditable) return;
          const startX = ev.clientX;
          const startY = ev.clientY;
          const rect = img.getBoundingClientRect();
          const startW = rect.width;
          const startH = rect.height;
          const ratio = startH > 0 ? startW / startH : 1;
          const dirX = pos.includes("e") ? 1 : -1;
          const dirY = pos.includes("s") ? 1 : -1;

          const onMove = (m: MouseEvent) => {
            const dx = (m.clientX - startX) * dirX;
            const dy = (m.clientY - startY) * dirY;
            // Se shift, mantém proporção
            let w = Math.max(40, startW + dx);
            let h = Math.max(40, startH + dy);
            if (m.shiftKey || Math.abs(dx) > Math.abs(dy)) {
              h = w / ratio;
            } else {
              w = h * ratio;
            }
            img.style.width = `${Math.round(w)}px`;
            img.style.height = `${Math.round(h)}px`;
          };
          const onUp = () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
            const finalW = img.style.width;
            const finalH = img.style.height;
            if (typeof getPos === "function") {
              editor
                .chain()
                .command(({ tr }) => {
                  tr.setNodeMarkup(getPos(), undefined, {
                    ...node.attrs,
                    width: finalW,
                    height: finalH,
                  });
                  return true;
                })
                .run();
            }
          };
          window.addEventListener("mousemove", onMove);
          window.addEventListener("mouseup", onUp);
        });
      });

      const toggleHandles = (show: boolean) => {
        wrapper.classList.toggle("doc-img-selected", show);
      };

      img.addEventListener("click", () => toggleHandles(true));
      wrapper.addEventListener("blur", () => toggleHandles(false), true);

      return {
        dom: wrapper,
        update(updated) {
          if (updated.type.name !== "image") return false;
          setImgAttrs(updated);
          return true;
        },
        selectNode() {
          toggleHandles(true);
        },
        deselectNode() {
          toggleHandles(false);
        },
        destroy() {
          handleEls.forEach((h) => h.remove());
        },
      };
    };
  },
});
