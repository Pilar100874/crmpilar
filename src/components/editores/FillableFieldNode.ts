import { Node, mergeAttributes } from "@tiptap/core";
import { getFillableValue, subscribeFillable, mergeFillableValues } from "@/lib/editores/fillableValuesStore";
import { fetchDynamicOptions, isDynamicOpcoes, parseDynamic } from "@/lib/editores/dynamicOptions";

// Normaliza label (sem acento, minúsculo, sem pontuação) para casar campos do formulário
// com as chaves retornadas pela BrasilAPI de CNPJ.
const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const maskCnpj = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
};

// Dispara autofill dos demais campos preenchíveis a partir dos dados da Receita.
async function autofillCnpj(cnpjLimpo: string) {
  const resp = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
  if (!resp.ok) throw new Error("CNPJ não encontrado");
  const d: any = await resp.json();
  // Aliases (rótulos normalizados) → valor
  const src: Record<string, string> = {};
  const put = (aliases: string[], val: any) => {
    const v = val == null ? "" : String(val);
    for (const a of aliases) src[norm(a)] = v;
  };
  put(["cnpj"], cnpjLimpo);
  put(["razao social", "nome", "razaosocial"], d.razao_social || d.nome);
  put(["nome fantasia", "fantasia"], d.nome_fantasia || d.fantasia);
  put(["logradouro", "endereco", "rua"], d.logradouro);
  put(["numero", "num"], d.numero);
  put(["complemento"], d.complemento);
  put(["bairro"], d.bairro);
  put(["municipio", "cidade"], d.municipio);
  put(["uf", "estado"], d.uf);
  put(["cep"], d.cep);
  put(["telefone", "fone"], d.ddd_telefone_1);
  put(["email", "e mail"], d.email);
  put(["inscricao estadual", "ie"], d.inscricoes_estaduais?.[0]?.inscricao_estadual);
  put(["situacao", "situacao cadastral"], d.descricao_situacao_cadastral);
  put(["abertura", "data abertura", "data de abertura"], d.data_inicio_atividade);
  put(["cnae principal", "cnae"], d.cnae_fiscal_descricao);

  // Percorre todos os fillables no documento e casa pelo label
  const updates: Record<string, string> = {};
  document.querySelectorAll<HTMLElement>("[data-fillable-field]").forEach((el) => {
    const token = el.getAttribute("data-fillable-field") || "";
    const label = el.getAttribute("data-label") || "";
    const tipo = el.getAttribute("data-tipo") || "";
    if (tipo === "cnpj") return;
    const key = norm(label || token);
    if (key && key in src && src[key]) updates[token] = src[key];
  });
  if (Object.keys(updates).length) mergeFillableValues(updates);
}



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
  marks: "_",

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

      let currentValue = getFillableValue(token, label);

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
            s.setAttribute("data-fillable", token); s.style.cssText = inputStyle + ";pointer-events:auto";
            s.addEventListener("mousedown", (ev) => ev.stopPropagation());
            const rebuild = (list: string[], loading = false) => {
              s.innerHTML = "";
              const opt0 = document.createElement("option");
              opt0.value = "";
              opt0.textContent = loading ? "Carregando…" : (label || "Selecione");
              s.appendChild(opt0);
              for (const o of list) { const op = document.createElement("option"); op.value = o; op.textContent = o; s.appendChild(op); }
              s.value = currentValue;
            };
            const dyn = parseDynamic(opcoes);
            if (dyn) {
              rebuild([], true);
              fetchDynamicOptions(dyn.tabela, dyn.coluna).then(list => rebuild(list));
              s.addEventListener("focus", () => {
                fetchDynamicOptions(dyn.tabela, dyn.coluna).then(list => rebuild(list));
              });
            } else {
              rebuild(opcoes);
            }
            s.addEventListener("change", () => { currentValue = s.value; });
            el = s; break;
          }
          case "radio": {
            const span = document.createElement("span");
            span.style.cssText = "pointer-events:auto";
            span.addEventListener("mousedown", (ev) => ev.stopPropagation());
            const fill = (list: string[]) => {
              span.innerHTML = "";
              for (const o of list) {
                const lab = document.createElement("label");
                lab.style.cssText = "display:inline-flex;align-items:center;gap:4px;margin-right:8px";
                const i = document.createElement("input");
                i.type = "radio"; i.name = token; i.value = o; i.setAttribute("data-fillable", token);
                i.checked = currentValue === o;
                i.addEventListener("change", () => { if (i.checked) currentValue = o; });
                lab.appendChild(i); lab.appendChild(document.createTextNode(" " + o));
                span.appendChild(lab);
              }
            };
            const dyn = parseDynamic(opcoes);
            if (dyn) { fetchDynamicOptions(dyn.tabela, dyn.coluna).then(fill); } else { fill(opcoes); }
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

      const render = () => {
        dom.innerHTML = "";
        dom.appendChild(buildInput());
      };
      render();
      const unsub = subscribeFillable(() => {
        currentValue = getFillableValue(token, label);
        render();
      });

      return { dom, destroy: () => unsub() };
    };
  },
});
