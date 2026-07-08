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
    return ({ node }) => {
      const token = String(node.attrs.token ?? "");
      const label = String(node.attrs.label ?? token);
      const dom = document.createElement("span");
      dom.setAttribute("data-merge-field", token);
      dom.setAttribute("data-label", label);
      dom.className = "doc-field-chip";
      dom.contentEditable = "false";

      const render = () => {
        const v = getPreviewValue(token);
        if (v != null && v !== "") {
          dom.textContent = v;
          dom.classList.add("doc-field-chip-live");
          dom.title = token;
        } else {
          dom.textContent = token;
          dom.classList.remove("doc-field-chip-live");
          dom.title = "";
        }
      };
      render();
      const unsub = subscribePreview(render);
      return {
        dom,
        destroy: () => unsub(),
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
