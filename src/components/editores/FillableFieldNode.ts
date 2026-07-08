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

  addNodeView() {
    return ({ node }) => {
      const tipo = String(node.attrs.tipo || "texto");
      const token = String(node.attrs.token || "");
      const label = String(node.attrs.label || "");
      const opcoes = String(node.attrs.opcoes || "")
        .split(",").map(s => s.trim()).filter(Boolean);

      const dom = document.createElement("span");
      dom.setAttribute("data-fillable-field", token);
      dom.setAttribute("data-tipo", tipo);
      dom.setAttribute("data-label", label);
      dom.setAttribute("data-opcoes", opcoes.join(","));
      dom.contentEditable = "false";
      dom.className = "doc-fillable";
      dom.style.cssText = "display:inline-block;vertical-align:middle;margin:0 2px";

      let currentValue = "";

      const inputStyle =
        "border:1px solid #cbd5e1;border-radius:4px;padding:2px 6px;font:inherit;background:#fefce8;min-width:120px";

      const buildInput = (): HTMLElement => {
        const wrap = document.createElement("span");
        let el: HTMLElement;
        switch (tipo) {
          case "textarea": {
            const t = document.createElement("textarea");
            t.setAttribute("data-fillable", token);
            t.placeholder = label; t.rows = 2; t.style.cssText = inputStyle;
            t.value = currentValue;
            t.addEventListener("input", () => { currentValue = t.value; });
            el = t; break;
          }
          case "data": {
            const i = document.createElement("input");
            i.type = "date"; i.setAttribute("data-fillable", token); i.style.cssText = inputStyle;
            i.value = currentValue;
            i.addEventListener("input", () => { currentValue = i.value; });
            el = i; break;
          }
          case "numero": {
            const i = document.createElement("input");
            i.type = "number"; i.setAttribute("data-fillable", token); i.placeholder = label; i.style.cssText = inputStyle;
            i.value = currentValue;
            i.addEventListener("input", () => { currentValue = i.value; });
            el = i; break;
          }
          case "check": {
            const lab = document.createElement("label");
            lab.style.cssText = "display:inline-flex;align-items:center;gap:4px";
            const i = document.createElement("input");
            i.type = "checkbox"; i.setAttribute("data-fillable", token);
            i.checked = currentValue === "true";
            i.addEventListener("change", () => { currentValue = i.checked ? "true" : ""; });
            lab.appendChild(i); lab.appendChild(document.createTextNode(" " + label));
            el = lab; break;
          }
          case "lista": {
            const s = document.createElement("select");
            s.setAttribute("data-fillable", token); s.style.cssText = inputStyle;
            const opt0 = document.createElement("option"); opt0.value = ""; opt0.textContent = label || "Selecione";
            s.appendChild(opt0);
            for (const o of opcoes) { const op = document.createElement("option"); op.value = o; op.textContent = o; s.appendChild(op); }
            s.value = currentValue;
            s.addEventListener("change", () => { currentValue = s.value; });
            el = s; break;
          }
          case "radio": {
            const span = document.createElement("span");
            for (const o of opcoes) {
              const lab = document.createElement("label");
              lab.style.cssText = "display:inline-flex;align-items:center;gap:4px;margin-right:8px";
              const i = document.createElement("input");
              i.type = "radio"; i.name = token; i.value = o; i.setAttribute("data-fillable", token);
              i.checked = currentValue === o;
              i.addEventListener("change", () => { if (i.checked) currentValue = o; });
              lab.appendChild(i); lab.appendChild(document.createTextNode(" " + o));
              span.appendChild(lab);
            }
            el = span; break;
          }
          default: {
            const i = document.createElement("input");
            i.type = "text"; i.setAttribute("data-fillable", token); i.placeholder = label; i.style.cssText = inputStyle;
            i.value = currentValue;
            i.addEventListener("input", () => { currentValue = i.value; });
            el = i;
          }
        }
        wrap.appendChild(el);
        return wrap;
      };

      const buildChip = (): HTMLElement => {
        const chip = document.createElement("span");
        chip.className = "doc-field-chip";
        if (currentValue && currentValue !== "true") {
          chip.classList.add("doc-field-chip-live");
          chip.textContent = currentValue;
        } else if (currentValue === "true") {
          chip.classList.add("doc-field-chip-live");
          chip.textContent = "✓ " + label;
        } else {
          chip.textContent = `[[${label || token}]]`;
        }
        return chip;
      };

      const render = () => {
        dom.innerHTML = "";
        dom.appendChild(isPreviewActive() ? buildChip() : buildInput());
      };
      render();
      const unsub = subscribePreview(render);

      return { dom, destroy: () => unsub() };
    };
  },
});
