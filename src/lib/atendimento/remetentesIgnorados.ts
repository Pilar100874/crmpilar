/**
 * Remetentes que não são clientes: some da aba Recebidos.
 * - Automáticos: e-mails transacionais/no-reply são filtrados sem ação do usuário.
 * - Ignorados: e-mail, domínio ou telefone marcados pelo usuário (reativáveis no menu ⋮).
 */
export type TipoIgnorado = "email" | "dominio" | "telefone";
export interface RemetenteIgnorado { id?: string; tipo: TipoIgnorado; valor: string; criado_em?: string; criado_por_nome?: string | null }

export function extrairEmail(raw: string | null | undefined): string {
  const s = String(raw || "").toLowerCase();
  return (s.match(/<([^>]+)>/)?.[1] || s).trim();
}
export function dominioDe(email: string): string {
  const e = extrairEmail(email);
  return e.includes("@") ? e.split("@")[1] : "";
}
export function normalizarTelefone(t: string | null | undefined): string {
  const d = String(t || "").replace(/\D/g, "");
  return d.startsWith("55") && d.length > 11 ? d.slice(2) : d;
}

const PREFIXOS_AUTOMATICOS = /^(no-?reply|do-?not-?reply|nao-?responda|naoresponda|noresponder|notifica(c|ç)(o|õ)es|notifications?|notificacao|mailer-daemon|postmaster|bounce[s]?|fatura|faturas|boleto|boletos|nfe|nf-e|newsletter|news|marketing|alertas?|alerts?|info-?noreply)([._+-]|@)/;
const ASSUNTO_AUTOMATICO = /(c(o|ó)digo de verifica(c|ç)(a|ã)o|verification code|unsubscribe|descadastr|newsletter|n(a|ã)o responda este e-?mail|do not reply)/;

/** E-mail automático (no-reply, notificações, boletos, newsletters). */
export function ehEmailAutomatico(fromEmail: string | null | undefined, assunto?: string | null, corpo?: string | null): boolean {
  const addr = extrairEmail(fromEmail);
  if (!addr) return false;
  if (PREFIXOS_AUTOMATICOS.test(addr)) return true;
  const texto = `${assunto || ""} ${String(corpo || "").replace(/<[^>]+>/g, " ").slice(0, 2000)}`.toLowerCase();
  return ASSUNTO_AUTOMATICO.test(texto);
}

export function emailIgnorado(fromEmail: string | null | undefined, lista: RemetenteIgnorado[]): boolean {
  const addr = extrairEmail(fromEmail);
  const dom = dominioDe(addr);
  return lista.some((i) => (i.tipo === "email" && i.valor === addr) || (i.tipo === "dominio" && !!dom && i.valor === dom));
}

export function telefoneIgnorado(telefone: string | null | undefined, lista: RemetenteIgnorado[]): boolean {
  const t = normalizarTelefone(telefone);
  return !!t && lista.some((i) => i.tipo === "telefone" && i.valor === t);
}
