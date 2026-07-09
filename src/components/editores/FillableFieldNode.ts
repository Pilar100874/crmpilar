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

// Estado por grupo de CNPJ: evita múltiplos prompts simultâneos e re-perguntar
// depois de já ter carregado.
const cnpjGroupState = new Map<string, "asking" | "loaded">();

// Dispara autofill dos demais campos preenchíveis a partir dos dados da Receita.
// Se `group` for informado, apenas os campos com o mesmo data-cnpj-group são afetados.
async function autofillCnpj(cnpjLimpo: string, group?: string) {
  const resp = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
  if (!resp.ok) throw new Error("CNPJ não encontrado");
  const d: any = await resp.json();
  const byKey: Record<string, string> = {
    cnpj: maskCnpj(cnpjLimpo),
    razao_social: d.razao_social || d.nome || "",
    nome_fantasia: d.nome_fantasia || d.fantasia || "",
    logradouro: d.logradouro || "",
    numero: d.numero || "",
    complemento: d.complemento || "",
    bairro: d.bairro || "",
    cep: d.cep || "",
    municipio: d.municipio || "",
    uf: d.uf || "",
    ddd_telefone_1: d.ddd_telefone_1 || "",
    email: d.email || "",
    inscricao_estadual: d.inscricoes_estaduais?.[0]?.inscricao_estadual || "",
    descricao_situacao_cadastral: d.descricao_situacao_cadastral || "",
    data_inicio_atividade: d.data_inicio_atividade || "",
    cnae_fiscal_descricao: d.cnae_fiscal_descricao || "",
  };
  // Aliases por label (fallback para campos legados sem data-cnpj-subfield)
  const src: Record<string, string> = {};
  const put = (aliases: string[], val: string) => { for (const a of aliases) src[norm(a)] = val; };
  put(["cnpj"], byKey.cnpj);
  put(["razao social", "nome", "razaosocial"], byKey.razao_social);
  put(["nome fantasia", "fantasia"], byKey.nome_fantasia);
  put(["logradouro", "endereco", "rua"], byKey.logradouro);
  put(["numero", "num"], byKey.numero);
  put(["complemento"], byKey.complemento);
  put(["bairro"], byKey.bairro);
  put(["municipio", "cidade"], byKey.municipio);
  put(["uf", "estado"], byKey.uf);
  put(["cep"], byKey.cep);
  put(["telefone", "fone"], byKey.ddd_telefone_1);
  put(["email", "e mail"], byKey.email);
  put(["inscricao estadual", "ie"], byKey.inscricao_estadual);
  put(["situacao", "situacao cadastral"], byKey.descricao_situacao_cadastral);
  put(["abertura", "data abertura", "data de abertura"], byKey.data_inicio_atividade);
  put(["cnae principal", "cnae"], byKey.cnae_fiscal_descricao);

  const updates: Record<string, string> = {};
  document.querySelectorAll<HTMLElement>("[data-fillable-field]").forEach((el) => {
    const elGroup = el.getAttribute("data-cnpj-group") || "";
    if (group && elGroup && elGroup !== group) return;
    const token = el.getAttribute("data-fillable-field") || "";
    const label = el.getAttribute("data-label") || "";
    const sub = el.getAttribute("data-cnpj-subfield") || "";
    let val = "";
    if (sub && byKey[sub] != null) val = byKey[sub];
    else {
      const key = norm(label || token);
      if (key && src[key]) val = src[key];
    }
    if (val) updates[token] = val;
  });
  if (Object.keys(updates).length) mergeFillableValues(updates);
}

/** Sem popup: foca o sub-campo CNPJ do grupo (que tem máscara + autofill no blur). */
function focusCnpjInputForGroup(group: string): boolean {
  if (!group) return false;
  if (cnpjGroupState.get(group)) return false;
  const cnpjEl = document.querySelector<HTMLInputElement>(
    `[data-cnpj-group="${CSS.escape(group)}"][data-cnpj-subfield="cnpj"] input[data-cnpj-autofill="1"]`
  );
  if (!cnpjEl) return false;
  cnpjGroupState.set(group, "asking");
  const prevBg = cnpjEl.style.background;
  cnpjEl.style.background = "#fde68a";
  cnpjEl.focus();
  try { cnpjEl.scrollIntoView({ block: "center", behavior: "smooth" }); } catch {}
  setTimeout(() => { cnpjEl.style.background = prevBg; }, 1200);
  return true;
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
      cnpjSubfield: {
        default: "",
        parseHTML: (el: HTMLElement) => el.getAttribute("data-cnpj-subfield") || "",
        renderHTML: (attrs: any) => attrs.cnpjSubfield ? { "data-cnpj-subfield": attrs.cnpjSubfield } : {},
      },
      cnpjGroup: {
        default: "",
        parseHTML: (el: HTMLElement) => el.getAttribute("data-cnpj-group") || "",
        renderHTML: (attrs: any) => attrs.cnpjGroup ? { "data-cnpj-group": attrs.cnpjGroup } : {},
      },
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
    const cnpjSubfield = String(node.attrs.cnpjSubfield || "");
    const cnpjGroup = String(node.attrs.cnpjGroup || "");

    const extra: Record<string, string> = {};
    if (cnpjSubfield) extra["data-cnpj-subfield"] = cnpjSubfield;
    if (cnpjGroup) extra["data-cnpj-group"] = cnpjGroup;

    const wrapAttrs = mergeAttributes(HTMLAttributes, {
      "data-fillable-field": token,
      "data-tipo": tipo,
      "data-label": label,
      "data-opcoes": opcoes.join(","),
      ...extra,
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
      case "cnpj":
        child = ["input", { type: "text", "data-fillable": token, "data-cnpj-autofill": "1", placeholder: label || "CNPJ", style: inputStyle + ";min-width:180px" }];
        break;
      default:
        child = ["input", { type: "text", "data-fillable": token, placeholder: label, style: inputStyle }];
    }

    return ["span", wrapAttrs, child];
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      const tipo = String(node.attrs.tipo || "texto");
      const token = String(node.attrs.token || "");
      const label = String(node.attrs.label || "");
      const opcoes = String(node.attrs.opcoes || "")
        .split(",").map(s => s.trim()).filter(Boolean);
      const cnpjSubfield = String(node.attrs.cnpjSubfield || "");
      const cnpjGroup = String(node.attrs.cnpjGroup || "");

      const dom = document.createElement("span");
      dom.setAttribute("data-fillable-field", token);
      dom.setAttribute("data-tipo", tipo);
      dom.setAttribute("data-label", label);
      dom.setAttribute("data-opcoes", opcoes.join(","));
      if (cnpjSubfield) dom.setAttribute("data-cnpj-subfield", cnpjSubfield);
      if (cnpjGroup) dom.setAttribute("data-cnpj-group", cnpjGroup);
      dom.contentEditable = "false";
      dom.className = "doc-fillable group/fillable";
      dom.style.cssText = "display:inline-flex;align-items:center;gap:2px;vertical-align:middle;margin:0 2px;position:relative";

      let currentValue = getFillableValue(token, label);

      // Hook: no primeiro foco de um sub-campo do grupo CNPJ ainda vazio,
      // pergunta o CNPJ e autopreenche todos os sub-campos vazios do grupo.
      const attachCnpjGroupFocus = (input: HTMLElement) => {
        if (!cnpjGroup || !cnpjSubfield) return;
        // Não redireciona se este próprio campo é o CNPJ do grupo
        if (cnpjSubfield === "cnpj") return;
        input.addEventListener("focus", () => {
          const v = (input as HTMLInputElement | HTMLTextAreaElement).value;
          if (v && v.trim()) return;
          if (cnpjGroupState.get(cnpjGroup)) return;
          focusCnpjInputForGroup(cnpjGroup);
        }, { once: false });
      };

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
          case "cnpj": {
            const i = document.createElement("input");
            i.type = "text";
            i.setAttribute("data-fillable", token);
            i.setAttribute("data-cnpj-autofill", "1");
            i.placeholder = label || "CNPJ";
            i.style.cssText = inputStyle + ";min-width:180px;pointer-events:auto";
            i.value = currentValue ? maskCnpj(currentValue) : "";
            i.addEventListener("mousedown", (ev) => ev.stopPropagation());
            i.addEventListener("input", () => {
              i.value = maskCnpj(i.value);
              currentValue = i.value;
            });
            i.addEventListener("blur", async () => {
              const clean = i.value.replace(/\D/g, "");
              if (clean.length !== 14) return;
              const prev = i.style.background;
              i.style.background = "#fef3c7";
              try {
                await autofillCnpj(clean, cnpjGroup || undefined);
                if (cnpjGroup) cnpjGroupState.set(cnpjGroup, "loaded");
              } catch (e) {
                console.warn("[cnpj autofill]", e);
              } finally {
                i.style.background = prev;
              }
            });
            attachCnpjGroupFocus(i);
            el = i; break;
          }
          default: {
            const i = document.createElement("input");
            i.type = "text"; i.setAttribute("data-fillable", token); i.placeholder = label; i.style.cssText = inputStyle;
            i.value = currentValue;
            i.addEventListener("input", () => { currentValue = i.value; });
            attachCnpjGroupFocus(i);
            el = i;
          }
        }
        wrap.appendChild(el);
        return wrap;
      };

      const render = () => {
        dom.innerHTML = "";
        const grip = document.createElement("span");
        grip.setAttribute("data-drag-handle", "");
        grip.className = "fillable-ctrl fillable-grip";
        grip.title = "Arraste para mover";
        grip.style.cssText = "cursor:grab;user-select:none;color:#94a3b8;font-size:12px;padding:0 2px;line-height:1";
        grip.textContent = "⋮⋮";
        dom.appendChild(grip);
        dom.appendChild(buildInput());
        const del = document.createElement("button");
        del.type = "button";
        del.className = "fillable-ctrl fillable-del";
        del.title = "Remover campo";
        del.textContent = "×";
        del.style.cssText = "cursor:pointer;border:none;background:transparent;color:#dc2626;font-size:14px;line-height:1;padding:0 4px";
        del.addEventListener("mousedown", (ev) => ev.preventDefault());
        del.addEventListener("click", (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          if (editor?.isEditable === false) return;
          const pos = typeof getPos === "function" ? getPos() : null;
          if (pos == null || !editor) return;
          editor.chain().focus().deleteRange({ from: pos, to: pos + node.nodeSize }).run();
        });
        dom.appendChild(del);
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
