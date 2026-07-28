// Validação de CPF (LGPD: nunca consultamos dados pessoais sem autorização).
import { validateCPF } from "@/lib/validators";

export function validarCPF(cpfRaw: string): boolean {
  const cpf = (cpfRaw || "").replace(/\D/g, "");
  return cpf.length === 11 && validateCPF(cpf);
}
