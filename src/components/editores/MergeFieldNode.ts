import { Node, mergeAttributes } from "@tiptap/core";
import { getPreviewValue, subscribePreview } from "@/lib/editores/mergePreviewStore";

/**
 * Nó inline atômico (não editável) que representa um campo de merge.
 * Renderiza como um "chip" retangular. O HTML persistido preserva o token
 * original ({{campo}}) — a exibição em tela mostra o VALOR resolvido do
 * primeiro registro (ou do registro selecionado), caindo para o token quando
 * ainda não há dados.
 */
export const MergeField = Node.create({
  name: "mergeField",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  draggable: true,
  marks: "_",

  addAttributes() {
    return {
      token: { default: "" },
      label: { default: "" },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-merge-field]",
        getAttrs: (el) => {
          const e = el as HTMLElement;
          return {
            token: e.getAttribute("data-merge-field") || e.textContent || "",
            label: e.getAttribute("data-label") || e.textContent || "",
          };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const token = String(node.attrs.token ?? "");
    const label = String(node.attrs.label ?? token);
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-merge-field": token,
        "data-label": label,
        class: "doc-field-chip",
        contenteditable: "false",
      }),
      token,
    ];
  },

  renderText({ node }) {
    return String(node.attrs.token ?? "");
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      const token = String(node.attrs.token ?? "");
      const label = String(node.attrs.label ?? token);
      const dom = document.createElement("span");
      dom.setAttribute("data-merge-field", token);
      dom.setAttribute("data-label", label);
      dom.className = "doc-field-chip";
      dom.contentEditable = "false";
      dom.style.position = "relative";

      const render = () => {
        const v = getPreviewValue(token);
        const chipText = document.createElement("span");
        if (v != null && v !== "") {
          chipText.textContent = v;
          dom.classList.add("doc-field-chip-live");
          dom.title = token;
        } else {
          chipText.textContent = token;
          dom.classList.remove("doc-field-chip-live");
          dom.title = "";
        }
        dom.innerHTML = "";
        dom.appendChild(chipText);
      };
      render();
      const unsub = subscribePreview(render);

      // Toolbar flutuante (duplicar / excluir)
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
        toolbar = document.createElement("div");
        toolbar.contentEditable = "false";
        toolbar.style.cssText = "position:absolute;top:-32px;left:0;z-index:50;display:flex;gap:4px;background:#fff;border:1px solid #e5e7eb;border-radius:6px;padding:2px 4px;box-shadow:0 2px 8px rgba(0,0,0,0.15);font-size:11px;white-space:nowrap;";
        toolbar.innerHTML = `
          <button type="button" data-a="dup" style="padding:2px 6px;background:#f3f4f6;border:1px solid #d1d5db;border-radius:4px;cursor:pointer;">Duplicar</button>
          <button type="button" data-a="del" style="padding:2px 6px;background:#fee2e2;color:#b91c1c;border:1px solid #fecaca;border-radius:4px;cursor:pointer;">Excluir</button>
        `;
        dom.appendChild(toolbar);
        toolbar.addEventListener("mousedown", (e) => e.preventDefault());
        toolbar.addEventListener("click", (e) => {
          const t = e.target as HTMLElement;
          const a = t.getAttribute("data-a");
          if (!a) return;
          const pos = typeof getPos === "function" ? getPos() : null;
          if (pos == null) return;
          if (a === "dup") {
            editor.chain().focus().insertContentAt(pos + node.nodeSize, { type: "mergeField", attrs: { ...node.attrs } }).run();
          } else if (a === "del") {
            editor.chain().focus().deleteRange({ from: pos, to: pos + node.nodeSize }).run();
          }
          closeToolbar();
        });
        setTimeout(() => document.addEventListener("mousedown", onDocDown, true), 0);
      };
      dom.addEventListener("click", (e) => { e.stopPropagation(); openToolbar(); });

      return {
        dom,
        destroy: () => { unsub(); closeToolbar(); },
      };
    };
  },
});

export function insertMergeField(
  editor: { chain: () => any } | null | undefined,
  token: string,
  label?: string,
) {
  if (!editor) return;
  editor
    .chain()
    .focus()
    .insertContent({
      type: "mergeField",
      attrs: { token, label: label ?? token },
    })
    .insertContent(" ")
    .run();
}
