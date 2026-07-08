// Store singleton que mantém os valores resolvidos do registro selecionado
// (para chips {{campo}}) e as linhas completas por alias (para nós de tabela).
type Listener = () => void;

let values: Record<string, any> = {};
let rowsByAlias: Record<string, any[]> = {};
const listeners = new Set<Listener>();

export function setPreviewValues(v: Record<string, any>) {
  values = v || {};
  listeners.forEach((l) => l());
}

export function setPreviewRows(map: Record<string, any[]>) {
  rowsByAlias = map || {};
  listeners.forEach((l) => l());
}

export function getPreviewRows(alias: string): any[] {
  return rowsByAlias[alias] || [];
}

export function subscribePreview(cb: Listener): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function formatValue(v: any): string {
  if (v == null) return "";
  if (v instanceof Date) return v.toLocaleDateString("pt-BR");
  if (typeof v === "number") return String(v);
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export function getPreviewValue(token: string): string | undefined {
  // Aceita {{a.b.c}}. Ignora tokens [[Fillable]] e tags {{#...}}.
  const m = token.match(/^\{\{\s*([^#/=][^}]*?)\s*\}\}$/);
  if (!m) return undefined;
  const key = m[1].trim();
  if (!key) return undefined;
  const parts = key.split(".");
  let cur: any = values;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = cur[p];
  }
  if (cur == null || cur === "") return undefined;
  return formatValue(cur);
}
