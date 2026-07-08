import { Node, mergeAttributes } from "@tiptap/core";
import { isPreviewActive, subscribePreview } from "@/lib/editores/mergePreviewStore";

/**
 * Nó inline atômico que representa um campo preenchível de formulário
 * (input/checkbox/select/etc). Renderiza o controle real dentro do editor
 * e no HTML exportado, preservando o atributo data-fillable="[[token]]"
 * usado por coletarFillables no mergeEngine.
 */
export const FillableField = Node.create({
  name: "fillableField",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      tipo: { default: "texto" },
      token: { default: "" },
      label: { default: "" },
      opcoes: { default: "" }, // csv
    };
  },

  parseHTML() {
    return [
      { tag: "span[data-fillable-field]" },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const tipo = String(node.attrs.tipo || "texto");
    const token = String(node.attrs.token || "");
    const label = String(node.attrs.label || "");
    const opcoes = String(node.attrs.opcoes || "")
      .split(",").map(s => s.trim()).filter(Boolean);

    const wrapAttrs = mergeAttributes(HTMLAttributes, {
      "data-fillable-field": token,
      "data-tipo": tipo,
      "data-label": label,
      "data-opcoes": opcoes.join(","),
      contenteditable: "false",
      class: "doc-fillable",
      style: "display:inline-block;vertical-align:middle;margin:0 2px",
    });

    const inputStyle =
      "border:1px solid #cbd5e1;border-radius:4px;padding:2px 6px;font:inherit;background:#fefce8;min-width:120px";

    let child: any;
    switch (tipo) {
      case "textarea":
        child = ["textarea", { "data-fillable": token, placeholder: label, rows: "2", style: inputStyle }, ""];
        break;
      case "data":
        child = ["input", { type: "date", "data-fillable": token, style: inputStyle }];
        break;
      case "numero":
        child = ["input", { type: "number", "data-fillable": token, placeholder: label, style: inputStyle }];
        break;
      case "check":
        child = ["label", { style: "display:inline-flex;align-items:center;gap:4px" },
          ["input", { type: "checkbox", "data-fillable": token }],
          ` ${label}`,
        ];
        break;
      case "lista":
        child = ["select", { "data-fillable": token, style: inputStyle },
          ["option", { value: "" }, label || "Selecione"],
          ...opcoes.map(o => ["option", { value: o }, o]),
        ];
        break;
      case "radio":
        child = ["span", {},
          ...opcoes.flatMap(o => [
            ["label", { style: "display:inline-flex;align-items:center;gap:4px;margin-right:8px" },
              ["input", { type: "radio", name: token, value: o, "data-fillable": token }],
              ` ${o}`,
            ],
          ]),
        ];
        break;
      default:
        child = ["input", { type: "text", "data-fillable": token, placeholder: label, style: inputStyle }];
    }

    return ["span", wrapAttrs, child];
  },
});
