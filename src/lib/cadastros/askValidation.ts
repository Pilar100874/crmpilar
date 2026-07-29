// Validação e normalização em tempo real para respostas dos blocos
// "Perguntar CNPJ" e "Perguntar CEP". Compartilhado entre o editor,
// o simulador do bot, o webchat e (por espelho) o webhook.
import { maskCNPJ, maskCEP } from "@/lib/masks";
import { validateCNPJ, validateCEP } from "@/lib/validators";

export type AskKind = "cnpj" | "cep";
export type AskStatus =
  | "idle"
  | "typing"
  | "invalid"
  | "valid"
  | "loading"
  | "ok"
  | "notfound"
  | "error"
  | "cancelled";

export interface AskEvaluation {
  masked: string;
  digits: string;
  status: Exclude<AskStatus, "loading" | "ok" | "notfound" | "error" | "cancelled">;
  message: string;
  canSubmit: boolean;
}

const EXPECTED: Record<AskKind, number> = { cnpj: 14, cep: 8 };

export function normalizeAskInput(kind: AskKind, raw: string): { masked: string; digits: string } {
  const digits = String(raw || "").replace(/\D/g, "").slice(0, EXPECTED[kind]);
  const masked = kind === "cnpj" ? maskCNPJ(digits) : maskCEP(digits);
  return { masked, digits };
}

export function evaluateAskInput(kind: AskKind, raw: string): AskEvaluation {
  const { masked, digits } = normalizeAskInput(kind, raw);
  const expected = EXPECTED[kind];
  const label = kind === "cnpj" ? "CNPJ" : "CEP";

  if (digits.length === 0) {
    return { masked, digits, status: "idle", message: "", canSubmit: false };
  }
  if (digits.length < expected) {
    return {
      masked,
      digits,
      status: "typing",
      message: `${label} incompleto — informe os ${expected} dígitos (${digits.length}/${expected}).`,
      canSubmit: false,
    };
  }
  const ok = kind === "cnpj" ? validateCNPJ(digits) : validateCEP(digits);
  if (!ok) {
    return {
      masked,
      digits,
      status: "invalid",
      message: `${label} inválido — verifique os dígitos e tente novamente.`,
      canSubmit: false,
    };
  }
  return {
    masked,
    digits,
    status: "valid",
    message: `${label} válido.`,
    canSubmit: true,
  };
}
