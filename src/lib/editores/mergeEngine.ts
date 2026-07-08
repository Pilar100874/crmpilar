// Engine leve tipo Handlebars: {{campo}}, {{#if chave}}...{{/if}}, {{#each lista}}...{{/each}}
// Suporta acesso aninhado {{cliente.nome}}. Executa apenas no client.

export type MergeData = Record<string, any>;

function getValue(data: MergeData, path: string): any {
  return path.split(".").reduce<any>((acc, key) => {
    if (acc == null) return undefined;
    return acc[key.trim()];
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

function formatValue(v: any): string {
  if (v == null) return "";
  if (v instanceof Date) return v.toLocaleDateString("pt-BR");
  if (typeof v === "number") return String(v);
  return String(v);
}

export function renderTemplate(
  html: string,
  data: MergeData,
  opts: { highlightMissing?: boolean } = {},
): { html: string; missing: string[]; used: string[] } {
  const missing: string[] = [];
  const used: string[] = [];

  const eachRe = /\{\{#each\s+([^\}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g;
  html = html.replace(eachRe, (_m, key: string, body: string) => {
    const list = getValue(data, key.trim());
    if (!Array.isArray(list)) return "";
    return list
      .map((item) => renderTemplate(body, { ...data, ...item, this: item }, opts).html)
      .join("");
  });

  const ifRe = /\{\{#if\s+([^\}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
  html = html.replace(ifRe, (_m, key: string, body: string) => {
    return isTruthy(getValue(data, key.trim())) ? body : "";
  });

  // {{img:key}} — insere <img src="{value}">
  const imgRe = /\{\{\s*img:([a-zA-Z0-9_\.]+)\s*\}\}/g;
  html = html.replace(imgRe, (_m, key: string) => {
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

  const varRe = /\{\{\s*([a-zA-Z0-9_\.]+)\s*\}\}/g;
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
  const varRe = /\{\{\s*(?:#(?:if|each)\s+|img:)?([a-zA-Z0-9_\.]+)\s*\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = varRe.exec(html)) !== null) {
    if (m[1] !== undefined) keys.add(m[1]);
  }
  return Array.from(keys);
}

// ============ Campos calculados ============
export interface CampoCalculado {
  nome: string;       // ex: "total"
  expressao: string;  // ex: "preco * quantidade * (1 - desconto/100)"
}

/**
 * Avalia expressões usando as chaves do row como variáveis.
 * Ex: expressao "preco * quantidade" com row {preco:10, quantidade:3} => 30.
 * Segurança: `Function` sem acesso a globals sensíveis (fornece Math/Number).
 */
export function evalCalculados(row: Record<string, any>, calc: CampoCalculado[]): Record<string, any> {
  const out: Record<string, any> = { ...row };
  for (const c of calc) {
    if (!c.nome || !c.expressao) continue;
    try {
      const keys = Object.keys(out);
      const values = keys.map(k => out[k]);
      // eslint-disable-next-line no-new-func
      const fn = new Function(...keys, "Math", "Number", `"use strict"; return (${c.expressao});`);
      out[c.nome] = fn(...values, Math, Number);
    } catch {
      out[c.nome] = null;
    }
  }
  return out;
}

// ============ Campos PREENCHÍVEIS [[tipo:label|opts]] ============
// Sintaxe:
//   [[Nome]]                    -> texto (default)
//   [[texto:Nome]]              -> texto
//   [[textarea:Observações]]    -> textarea
//   [[data:Vencimento]]         -> input type=date
//   [[numero:Valor]]            -> input type=number
//   [[check:Aceito]]            -> checkbox
//   [[lista:UF|SP,RJ,MG]]       -> select
//   [[radio:Sexo|M,F]]          -> radios

const FILLABLE_RE = /\[\[([^\[\]\n]{1,200})\]\]/g;

export type FillableTipo = "texto" | "textarea" | "data" | "numero" | "check" | "lista" | "radio";

export interface FillableToken {
  raw: string;      // conteúdo entre [[ ]]
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

/** Compat: retorna labels únicos (usado por telas antigas). */
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

/**
 * Substitui [[...]] pelos valores informados.
 * Chave dos values = raw (conteúdo original entre [[ ]]).
 */
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

/** Realça visualmente os [[...]] no editor (chip azul). */
export function highlightFillables(html: string): string {
  return html.replace(new RegExp(FILLABLE_RE.source, "g"), (_m, raw: string) => {
    const t = parseFillable(raw);
    return `<span style="background:#dbeafe;color:#1e40af;padding:1px 6px;border-radius:4px;font-family:monospace;font-size:0.9em;">[${t.tipo}] ${escapeHtml(t.label)}</span>`;
  });
}
