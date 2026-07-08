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

/** Formata valor com base em tipo simples da chave */
function formatValue(v: any): string {
  if (v == null) return "";
  if (v instanceof Date) return v.toLocaleDateString("pt-BR");
  if (typeof v === "number") return String(v);
  return String(v);
}

/**
 * Processa {{#each ...}} e {{#if ...}} de forma balanceada.
 * Depois substitui os {{campo}} restantes.
 */
export function renderTemplate(
  html: string,
  data: MergeData,
  opts: { highlightMissing?: boolean } = {},
): { html: string; missing: string[]; used: string[] } {
  const missing: string[] = [];
  const used: string[] = [];

  // --- Passo 1: blocos {{#each lista}}...{{/each}}
  const eachRe = /\{\{#each\s+([^\}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g;
  html = html.replace(eachRe, (_m, key: string, body: string) => {
    const list = getValue(data, key.trim());
    if (!Array.isArray(list)) return "";
    return list
      .map((item) => renderTemplate(body, { ...data, ...item, this: item }, opts).html)
      .join("");
  });

  // --- Passo 2: blocos {{#if chave}}...{{/if}}
  const ifRe = /\{\{#if\s+([^\}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
  html = html.replace(ifRe, (_m, key: string, body: string) => {
    return isTruthy(getValue(data, key.trim())) ? body : "";
  });

  // --- Passo 3: substituição de {{campo}}
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

/** Extrai todas as chaves usadas em um HTML */
export function extractFieldKeys(html: string): string[] {
  const keys = new Set<string>();
  const varRe = /\{\{\s*(?:#(?:if|each)\s+)?([a-zA-Z0-9_\.]+)\s*\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = varRe.exec(html)) !== null) {
    if (m[1] !== undefined) keys.add(m[1]);
  }
  return Array.from(keys);
}
