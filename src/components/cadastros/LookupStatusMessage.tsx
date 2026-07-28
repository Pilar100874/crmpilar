import { Loader2, CheckCircle2, AlertCircle, Info, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export type LookupStatus = "idle" | "loading" | "ok" | "invalid" | "notfound" | "error";
export type LookupKind = "cnpj" | "cep" | "cpf";

interface Props {
  kind: LookupKind;
  status: LookupStatus;
  onRetry?: () => void;
  className?: string;
}

const LABELS: Record<LookupKind, string> = {
  cnpj: "CNPJ",
  cep: "CEP",
  cpf: "CPF",
};

const MESSAGES: Record<LookupKind, Partial<Record<LookupStatus, string>>> = {
  cnpj: {
    loading: "Consultando CNPJ…",
    ok: "CNPJ encontrado — dados preenchidos automaticamente.",
    invalid: "CNPJ inválido — verifique os dígitos.",
    notfound: "Nenhum resultado encontrado para este CNPJ.",
    error: "Falha ao consultar o CNPJ.",
  },
  cep: {
    loading: "Consultando CEP…",
    ok: "Endereço preenchido a partir do CEP.",
    invalid: "CEP incompleto — informe os 8 dígitos.",
    notfound: "CEP não encontrado.",
    error: "Falha ao consultar o CEP.",
  },
  cpf: {
    loading: "Validando CPF…",
    ok: "CPF válido.",
    invalid: "CPF inválido — verifique os dígitos.",
    notfound: "CPF não encontrado.",
    error: "Falha ao consultar o CPF.",
  },
};

/**
 * Feedback padronizado de consultas (CNPJ, CEP, CPF).
 * Reutilizável em Empresas, Vendedores, Transportadoras e demais cadastros.
 */
export function LookupStatusMessage({ kind, status, onRetry, className }: Props) {
  if (status === "idle") return null;
  const msg = MESSAGES[kind][status] || LABELS[kind];
  const tone =
    status === "ok" ? "text-emerald-600"
    : status === "loading" ? "text-muted-foreground"
    : status === "error" ? "text-destructive"
    : "text-amber-600";
  const Icon =
    status === "loading" ? Loader2
    : status === "ok" ? CheckCircle2
    : status === "error" ? AlertCircle
    : status === "invalid" ? AlertCircle
    : Info;
  const canRetry = (status === "notfound" || status === "error") && !!onRetry;

  return (
    <div className={cn("mt-1 flex items-center gap-2 flex-wrap text-xs", tone, className)} role="status" aria-live="polite">
      <Icon className={cn("w-3.5 h-3.5", status === "loading" && "animate-spin")} />
      <span>{msg}</span>
      {canRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="text-primary hover:underline inline-flex items-center gap-1"
        >
          <RefreshCw className="w-3 h-3" /> Tentar novamente
        </button>
      )}
    </div>
  );
}
