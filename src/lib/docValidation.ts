import { validateCPF, validateCNPJ } from "@/lib/validators";

/**
 * Valida um documento CPF ou CNPJ conforme a quantidade de dígitos.
 * Retorna { ok, message } — quando `required` é false, campo vazio é aceito.
 */
export function validateCpfCnpjField(
  value: string | null | undefined,
  opts: { required?: boolean; label?: string } = {}
): { ok: boolean; message?: string } {
  const label = opts.label || "CPF/CNPJ";
  const clean = (value || "").replace(/\D/g, "");
  if (!clean) {
    if (opts.required) return { ok: false, message: `${label} é obrigatório` };
    return { ok: true };
  }
  if (clean.length === 11) {
    return validateCPF(clean) ? { ok: true } : { ok: false, message: "CPF inválido" };
  }
  if (clean.length === 14) {
    return validateCNPJ(clean) ? { ok: true } : { ok: false, message: "CNPJ inválido" };
  }
  return { ok: false, message: `${label} deve ter 11 (CPF) ou 14 (CNPJ) dígitos` };
}
