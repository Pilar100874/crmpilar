// Engine leve tipo Handlebars com extensões para merge avançado:
//   {{campo}} {{obj.campo}}                    -> valor com formatação básica
//   {{#each lista}} ... {{this.x}} ... {{/each}} -> loop com @index/@first/@last
//   {{#if chave}} ... {{/if}}                  -> condicional
//   {{#unless chave}} ... {{/unless}}          -> condicional negativo
//   {{= expressão }}                           -> fórmula (whitelist Math/Number)
//   {{sum lista.campo}} {{avg}} {{count}} {{min}} {{max}}
//   {{moeda valor}} {{data campo}} {{numero campo 2}}
//   {{img:campo}}                              -> <img>
//
// Executa apenas no client.

export type MergeData = Record<string, any>;

// ---------- utils ----------

function getValue(data: MergeData, path: string): any {
  return path.split(".").reduce<any>((acc, key) => {
    if (acc == null) return undefined;
    const k = key.trim();
    // suporte a índices numéricos
    if (Array.isArray(acc) && /^\d+$/.test(k)) return acc[Number(k)];
    return acc[k];
  }, data);
}

function isTruthy(v: any): boolean {
  if (v == null) return false;
  if (typeof v === "string") return v.trim() !== "";
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "number") return v !== 0;
  return Boolean(v);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/'/g, "&#39;");
}

function toNumber(v: any): number {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return v;
  const s = String(v).replace(/[^\d,.-]/g, "").replace(",", ".");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function fmtMoeda(v: any): string {
  return toNumber(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtData(v: any): string {
  if (!v) return "";
  const d = v instanceof Date ? v : new Date(String(v));
  return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString("pt-BR");
}

function fmtNumero(v: any, casas = 2): string {
  return toNumber(v).toLocaleString("pt-BR", {
    minimumFractionDigits: casas, maximumFractionDigits: casas,
  });
}

function formatValue(v: any): string {
  if (v == null) return "";
  if (v instanceof Date) return v.toLocaleDateString("pt-BR");
  return String(v);
}

/** Retorna array da chave `path` (aceita "itens" ou "itens.valor" retornando os valores). */
function resolveArray(data: MergeData, path: string): any[] {
  const parts = path.split(".");
  let cur: any = data;
  for (let i = 0; i < parts.length; i++) {
    if (cur == null) return [];
    if (Array.isArray(cur)) {
      const rest = parts.slice(i).join(".");
      return cur.map((el) => (rest ? getValue(el, rest) : el));
    }
    cur = cur[parts[i].trim()];
  }
  if (Array.isArray(cur)) return cur;
  return [];
}

// ---------- avaliador de fórmula seguro ----------
// Permite: números, + - * / % ( ) , identificadores (variáveis conhecidas + Math.*), comparações.
const FORMULA_TOKEN_RE = /^[\s0-9+\-*/%().,<>=!&|?:_a-zA-Z]*$/;

function evalFormula(expr: string, ctx: Record<string, any>): any {
  const raw = expr.trim();
  if (!raw) return "";
  if (!FORMULA_TOKEN_RE.test(raw)) return "";
  // Coleta identificadores raiz e mapeia para valores numéricos/strings do ctx
  const idents = Array.from(new Set(raw.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) ?? []))
    .filter((k) => k !== "Math" && k !== "Number" && k !== "true" && k !== "false" && k !== "null");
  const args = idents.map((k) => {
    const v = getValue(ctx, k);
    if (typeof v === "number") return v;
    if (typeof v === "string") {
      const n = toNumber(v);
      return v.trim() !== "" && Number.isFinite(n) ? n : v;
    }
    return v ?? 0;
  });
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function(...idents, "Math", "Number", `"use strict"; return (${raw});`);
    return fn(...args, Math, Number);
  } catch {
    return "";
  }
}

// ---------- unwrap Tiptap chips ----------
function unwrapMergeChips(html: string): string {
  return html.replace(
    /<span[^>]*\bdata-merge-field\s*=\s*"([^"]*)"[^>]*>[\s\S]*?<\/span>/gi,
    (_m, token: string) => token,
  );
}

/**
 * O nó Tiptap FillableField é serializado como
 *   <span data-fillable-field="[[tipo:label]]" ...><input .../></span>
 * O token `[[...]]` fica também dentro do atributo, o que quebraria a regex
 * de applyFillables. Aqui reduzimos o chip inteiro ao seu token cru para que
 * o pipeline de merge/aplicação trate igual ao texto original.
 */
export function unwrapFillableChips(html: string): string {
  return html.replace(
    /<span\b[^>]*\bdata-fillable-field\s*=\s*"([^"]*)"[^>]*>[\s\S]*?<\/span>/gi,
    (_m, token: string) => {
      const decoded = token
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
      return decoded;
    },
  );
}

// ---------- helpers de agregação ----------
const AGG_FNS: Record<string, (list: any[]) => number> = {
  sum: (l) => l.reduce((a, b) => a + toNumber(b), 0),
  avg: (l) => l.length ? l.reduce((a, b) => a + toNumber(b), 0) / l.length : 0,
  count: (l) => l.length,
  min: (l) => l.length ? Math.min(...l.map(toNumber)) : 0,
  max: (l) => l.length ? Math.max(...l.map(toNumber)) : 0,
};

// ---------- render principal ----------
export function renderTemplate(
  html: string,
  data: MergeData,
  opts: { highlightMissing?: boolean } = {},
): { html: string; missing: string[]; used: string[] } {
  const missing: string[] = [];
  const used: string[] = [];
  html = unwrapMergeChips(html);

  // {{#each lista}}...{{/each}} — expandido primeiro
  const eachRe = /\{\{#each\s+([^\}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g;
  html = html.replace(eachRe, (_m, key: string, body: string) => {
    const list = resolveArray(data, key.trim());
    if (!Array.isArray(list) || list.length === 0) return "";
    return list.map((item, i) => {
      const ctx = {
        ...data,
        ...(typeof item === "object" && item !== null ? item : {}),
        this: item,
        "@index": i,
        "@first": i === 0,
        "@last": i === list.length - 1,
        "@number": i + 1,
      };
      return renderTemplate(body, ctx, opts).html;
    }).join("");
  });

  // {{#if x}} / {{#unless x}}
  html = html.replace(/\{\{#if\s+([^\}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_m, key: string, body: string) => isTruthy(getValue(data, key.trim())) ? body : "");
  html = html.replace(/\{\{#unless\s+([^\}]+)\}\}([\s\S]*?)\{\{\/unless\}\}/g,
    (_m, key: string, body: string) => isTruthy(getValue(data, key.trim())) ? "" : body);

  // {{img:key}}
  html = html.replace(/\{\{\s*img:([a-zA-Z0-9_\.]+)\s*\}\}/g, (_m, key: string) => {
    used.push(key);
    const value = getValue(data, key);
    if (value == null || value === "") {
      missing.push(key);
      return opts.highlightMissing
        ? `<span style="background:#fef3c7;border:1px dashed #f59e0b;color:#92400e;padding:0 4px;border-radius:2px;">🖼 {{img:${escapeHtml(key)}}}</span>`
        : "";
    }
    return `<img src="${escapeAttr(String(value))}" style="max-width:100%;height:auto;" />`;
  });

  // {{= expressão }} — fórmula
  html = html.replace(/\{\{\s*=\s*([^}]+?)\s*\}\}/g, (_m, expr: string) => {
    const v = evalFormula(expr, data);
    if (v === "" || v == null || (typeof v === "number" && !Number.isFinite(v))) {
      return opts.highlightMissing
        ? `<span style="background:#fee2e2;color:#991b1b;padding:0 4px;border-radius:2px;">= ${escapeHtml(expr)}</span>`
        : "";
    }
    return escapeHtml(typeof v === "number" ? fmtNumero(v, 2) : String(v));
  });

  // helpers com argumento: {{sum path}} {{moeda campo}} {{data campo}} {{numero campo 2}}
  const helperRe = /\{\{\s*(sum|avg|count|min|max|moeda|data|numero)\s+([a-zA-Z0-9_\.]+)(?:\s+(\d+))?\s*\}\}/g;
  html = html.replace(helperRe, (_m, fn: string, path: string, arg?: string) => {
    if (fn in AGG_FNS) {
      const list = resolveArray(data, path);
      const v = AGG_FNS[fn](list);
      return escapeHtml(fn === "count" ? String(v) : fmtNumero(v, 2));
    }
    used.push(path);
    const v = getValue(data, path);
    if (v == null || v === "") { missing.push(path); return ""; }
    if (fn === "moeda") return escapeHtml(fmtMoeda(v));
    if (fn === "data") return escapeHtml(fmtData(v));
    if (fn === "numero") return escapeHtml(fmtNumero(v, arg ? parseInt(arg) : 2));
    return escapeHtml(String(v));
  });

  // {{campo}} simples
  const varRe = /\{\{\s*([a-zA-Z0-9_\.@]+)\s*\}\}/g;
  const out = html.replace(varRe, (_m, key: string) => {
    used.push(key);
    const value = getValue(data, key);
    const has = value !== undefined && value !== null && value !== "";
    if (!has) {
      missing.push(key);
      if (opts.highlightMissing) {
        return `<span data-doc-missing="${escapeHtml(key)}" style="background:#fef3c7;border:1px dashed #f59e0b;color:#92400e;padding:0 4px;border-radius:2px;">{{${escapeHtml(key)}}}</span>`;
      }
      return "";
    }
    const text = escapeHtml(formatValue(value));
    if (opts.highlightMissing) {
      return `<span data-doc-field="${escapeHtml(key)}" style="background:#dcfce7;border-radius:2px;padding:0 2px;">${text}</span>`;
    }
    return text;
  });

  return { html: out, missing: Array.from(new Set(missing)), used: Array.from(new Set(used)) };
}

export function extractFieldKeys(html: string): string[] {
  const keys = new Set<string>();
  const varRe = /\{\{\s*(?:#(?:if|each|unless)\s+|img:|=\s*|(?:sum|avg|count|min|max|moeda|data|numero)\s+)?([a-zA-Z0-9_\.]+)\s*\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = varRe.exec(html)) !== null) {
    if (m[1] && !m[1].startsWith("@")) keys.add(m[1]);
  }
  return Array.from(keys);
}

// ============ Campos calculados por registro (usados pelo MergeBuilder) ============
export interface CampoCalculado {
  nome: string;
  expressao: string;
}

export function evalCalculados(row: Record<string, any>, calc: CampoCalculado[]): Record<string, any> {
  const out: Record<string, any> = { ...row };
  for (const c of calc) {
    if (!c.nome || !c.expressao) continue;
    out[c.nome] = evalFormula(c.expressao, out);
  }
  return out;
}

// ============ Campos PREENCHÍVEIS [[tipo:label|opts]] ============

const FILLABLE_RE = /\[\[([^\[\]\n]{1,200})\]\]/g;

export type FillableTipo = "texto" | "textarea" | "data" | "numero" | "check" | "lista" | "radio";

export interface FillableToken {
  raw: string;
  tipo: FillableTipo;
  label: string;
  opcoes?: string[];
}

const TIPOS: FillableTipo[] = ["texto", "textarea", "data", "numero", "check", "lista", "radio"];

export function parseFillable(raw: string): FillableToken {
  const trimmed = raw.trim();
  let tipo: FillableTipo = "texto";
  let rest = trimmed;
  const colon = trimmed.indexOf(":");
  if (colon > 0) {
    const cand = trimmed.slice(0, colon).trim().toLowerCase();
    if ((TIPOS as string[]).includes(cand)) {
      tipo = cand as FillableTipo;
      rest = trimmed.slice(colon + 1);
    }
  }
  const pipe = rest.indexOf("|");
  const label = (pipe >= 0 ? rest.slice(0, pipe) : rest).trim();
  const opcoes = pipe >= 0
    ? rest.slice(pipe + 1).split(",").map(s => s.trim()).filter(Boolean)
    : undefined;
  return { raw: trimmed, tipo, label, opcoes };
}

export function serializeFillable(t: Omit<FillableToken, "raw">): string {
  const opts = t.opcoes && t.opcoes.length ? "|" + t.opcoes.join(",") : "";
  return `[[${t.tipo}:${t.label}${opts}]]`;
}

export function extractFillables(html: string): string[] {
  return Array.from(new Set(extractFillableTokens(html).map(t => t.label)));
}

export function extractFillableTokens(html: string): FillableToken[] {
  const out: FillableToken[] = [];
  const seen = new Set<string>();
  const re = new RegExp(FILLABLE_RE.source, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const t = parseFillable(m[1]);
    if (seen.has(t.raw)) continue;
    seen.add(t.raw);
    out.push(t);
  }
  return out;
}

export function applyFillables(
  html: string,
  values: Record<string, string>,
  opts: { highlightEmpty?: boolean; asInput?: boolean } = {},
): string {
  return html.replace(new RegExp(FILLABLE_RE.source, "g"), (_m, raw: string) => {
    const tok = parseFillable(raw);
    const v = values[tok.raw] ?? values[tok.label] ?? "";

    if (opts.asInput) {
      const name = escapeAttr(tok.raw);
      const commonStyle = "border:0;border-bottom:1.5px dashed #2563eb;background:transparent;color:#111;font:inherit;padding:0 4px;outline:none;";
      switch (tok.tipo) {
        case "textarea":
          return `<textarea data-fillable="${name}" placeholder="${escapeAttr(tok.label)}" rows="2" style="${commonStyle}min-width:220px;resize:vertical;border:1px dashed #2563eb;border-radius:4px;padding:4px;">${escapeHtml(v)}</textarea>`;
        case "data":
          return `<input type="date" data-fillable="${name}" value="${escapeAttr(v)}" style="${commonStyle}min-width:130px;" />`;
        case "numero":
          return `<input type="number" data-fillable="${name}" value="${escapeAttr(v)}" placeholder="${escapeAttr(tok.label)}" style="${commonStyle}min-width:100px;" />`;
        case "check": {
          const checked = v === "true" || v === "1" ? "checked" : "";
          return `<label style="display:inline-flex;gap:4px;align-items:center;"><input type="checkbox" data-fillable="${name}" ${checked} /> ${escapeHtml(tok.label)}</label>`;
        }
        case "lista": {
          const opts2 = (tok.opcoes ?? []).map(o =>
            `<option value="${escapeAttr(o)}" ${o === v ? "selected" : ""}>${escapeHtml(o)}</option>`
          ).join("");
          return `<select data-fillable="${name}" style="${commonStyle}min-width:120px;"><option value="">${escapeHtml(tok.label)}</option>${opts2}</select>`;
        }
        case "radio": {
          return (tok.opcoes ?? []).map(o =>
            `<label style="display:inline-flex;gap:3px;align-items:center;margin-right:8px;"><input type="radio" name="${name}" data-fillable="${name}" value="${escapeAttr(o)}" ${o === v ? "checked" : ""} /> ${escapeHtml(o)}</label>`
          ).join("");
        }
        default:
          return `<input type="text" data-fillable="${name}" value="${escapeAttr(v)}" placeholder="${escapeAttr(tok.label)}" style="${commonStyle}min-width:120px;" />`;
      }
    }

    if (v && v.toString().trim() !== "") {
      const disp = tok.tipo === "check" ? (v === "true" || v === "1" ? "☑" : "☐") : v;
      return `<span style="background:#dcfce7;border-radius:2px;padding:0 2px;">${escapeHtml(String(disp))}</span>`;
    }
    if (opts.highlightEmpty) {
      return `<span style="background:#fef3c7;border:1px dashed #f59e0b;color:#92400e;padding:0 4px;border-radius:2px;">${escapeHtml(tok.label)}</span>`;
    }
    return "";
  });
}

export function highlightFillables(html: string): string {
  return html.replace(new RegExp(FILLABLE_RE.source, "g"), (_m, raw: string) => {
    const t = parseFillable(raw);
    return `<span style="background:#dbeafe;color:#1e40af;padding:1px 6px;border-radius:4px;font-family:monospace;font-size:0.9em;">[${t.tipo}] ${escapeHtml(t.label)}</span>`;
  });
}
