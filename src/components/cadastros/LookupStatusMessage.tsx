import { Loader2, CheckCircle2, AlertCircle, Info, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export type LookupStatus = "idle" | "loading" | "ok" | "invalid" | "notfound" | "error" | "cancelled";
export type LookupKind = "cnpj" | "cep" | "cpf";

interface Props {
  kind: LookupKind;
  status: LookupStatus;
  onRetry?: () => void;
  className?: string;
}

const LABELS: Record<LookupKind, string> = { cnpj: "CNPJ", cep: "CEP", cpf: "CPF" };

const MESSAGES: Record<LookupKind, Partial<Record<LookupStatus, string>>> = {
  cnpj: {
    loading: "Consultando CNPJ…",
    ok: "CNPJ encontrado — dados preenchidos automaticamente.",
    invalid: "CNPJ inválido — verifique os dígitos.",
    notfound: "Nenhum resultado encontrado para este CNPJ.",
    error: "Falha ao consultar o CNPJ.",
    cancelled: "Consulta de CNPJ cancelada.",
  },
  cep: {
    loading: "Consultando CEP…",
    ok: "Endereço preenchido a partir do CEP.",
    invalid: "CEP incompleto — informe os 8 dígitos.",
    notfound: "CEP não encontrado.",
    error: "Falha ao consultar o CEP.",
    cancelled: "Consulta de CEP cancelada.",
  },
  cpf: {
    loading: "Validando CPF…",
    ok: "CPF válido.",
    invalid: "CPF inválido — verifique os dígitos.",
    notfound: "CPF não encontrado.",
    error: "Falha ao consultar o CPF.",
    cancelled: "Consulta de CPF cancelada.",
  },
};

/**
 * Feedback padronizado e acessível de consultas (CNPJ, CEP, CPF).
 * - Sempre renderiza o container com `aria-live="polite"` para que leitores de tela
 *   anunciem mudanças (loading → resultado → cancelamento).
 * - Erros usam `aria-live="assertive"` para interrupção imediata.
 * - Prefixa o rótulo (ex.: "CNPJ:") para dar contexto ao anúncio.
 */
export function LookupStatusMessage({ kind, status, onRetry, className }: Props) {
  const isError = status === "error" || status === "invalid" || status === "notfound";
  const msg = status === "idle" ? "" : (MESSAGES[kind][status] || LABELS[kind]);
  const tone =
    status === "ok" ? "text-emerald-600"
    : status === "loading" ? "text-muted-foreground"
    : status === "error" ? "text-destructive"
    : status === "cancelled" ? "text-muted-foreground"
    : status === "idle" ? "text-transparent"
    : "text-amber-600";
  const Icon =
    status === "loading" ? Loader2
    : status === "ok" ? CheckCircle2
    : status === "error" || status === "invalid" ? AlertCircle
    : Info;
  const canRetry = (status === "notfound" || status === "error" || status === "cancelled") && !!onRetry;

  return (
    <div
      className={cn("mt-1 min-h-[1.25rem] flex items-center gap-2 flex-wrap text-xs", tone, className)}
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      aria-atomic="true"
      aria-busy={status === "loading"}
    >
      {status !== "idle" && (
        <>
          <Icon aria-hidden="true" className={cn("w-3.5 h-3.5", status === "loading" && "animate-spin")} />
          <span className="sr-only">{LABELS[kind]}: </span>
          <span>{msg}</span>
          {canRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="text-primary hover:underline inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
              aria-label={`Tentar novamente a consulta de ${LABELS[kind]}`}
            >
              <RefreshCw aria-hidden="true" className="w-3 h-3" /> Tentar novamente
            </button>
          )}
        </>
      )}
    </div>
  );
}
