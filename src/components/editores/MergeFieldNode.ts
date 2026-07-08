import { Node, mergeAttributes } from "@tiptap/core";

/**
 * Nó inline atômico (não editável) que representa um campo de merge.
 * Renderiza como um "chip" retangular. O texto interno preserva o token
 * original ([[Campo]] ou {{campo}}) para que o mergeEngine continue funcionando.
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
