/**
 * Padroniza os valores dos cadastros em CAIXA ALTA.
 * E-mails e URLs (site) ficam de fora para não quebrar links/logins.
 */
const KEEP_LOWER = new Set(["email", "e_mail", "site", "website", "url", "contact_email", "contato_email"]);

/** Campos controlados por listas de seleção — não podem mudar de caixa (quebrariam o valor da opção). */
const KEEP_AS_IS = new Set([
  "pais",
  "tipo_cliente",
  "company_type",
  "porte",
  "prioridade",
  "status_comercial",
  "regime_tributario",
  "tipo",
  "status",
]);

export function isUppercaseExemptField(fieldId?: string, fieldType?: string): boolean {
  if (fieldType === "email" || fieldType === "url" || fieldType === "select") return true;
  if (!fieldId) return false;
  const id = fieldId.toLowerCase();
  if (KEEP_LOWER.has(id) || KEEP_AS_IS.has(id)) return true;
  return id.includes("email") || id.includes("site") || id.includes("url") || id.includes("senha") || id.includes("password");
}

/** Identifica campos de e-mail (por tipo ou nome do campo). */
export function isEmailField(fieldId?: string, fieldType?: string): boolean {
  if (fieldType === "email") return true;
  if (!fieldId) return false;
  const id = fieldId.toLowerCase();
  return id === "email" || id === "e_mail" || id.includes("email") || id.includes("e-mail");
}

/** E-mails sempre em caixa baixa (e sem espaços nas pontas). */
export function normalizeEmail<T>(value: T): T {
  return (typeof value === "string" ? (value.toLowerCase().trim() as unknown as T) : value);
}

/** Converte um valor para caixa alta se for texto. */
export function toUpper<T>(value: T): T {
  return (typeof value === "string" ? (value.toUpperCase() as unknown as T) : value);
}

/** Converte um valor de campo respeitando exceções (e-mail/site). */
export function upperField(fieldId: string | undefined, value: any, fieldType?: string) {
  if (isEmailField(fieldId, fieldType)) return normalizeEmail(value);
  if (isUppercaseExemptField(fieldId, fieldType)) return value;
  return toUpper(value);
}

/** Converte todos os valores string de um objeto (respeitando exceções). */
export function upperObject<T extends Record<string, any>>(obj: T): T {
  const out: any = Array.isArray(obj) ? [...(obj as any)] : { ...obj };
  for (const key of Object.keys(out)) {
    const v = out[key];
    if (typeof v === "string") {
      out[key] = isUppercaseExemptField(key) ? v : v.toUpperCase();
    } else if (v && typeof v === "object" && !Array.isArray(v)) {
      out[key] = upperObject(v);
    } else if (Array.isArray(v)) {
      out[key] = v.map((item) =>
        typeof item === "string"
          ? (isUppercaseExemptField(key) ? item : item.toUpperCase())
          : item && typeof item === "object"
          ? upperObject(item)
          : item
      );
    }
  }
  return out as T;
}
