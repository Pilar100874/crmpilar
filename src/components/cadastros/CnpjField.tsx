import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, FileText, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { maskCNPJ } from "@/lib/masks";
import { validateCNPJ } from "@/lib/validators";
import { buscarCNPJ, clearCnpjCache, type CnpjResultado } from "@/lib/cadastros/cnpjService";
import { cn } from "@/lib/utils";

interface CnpjFieldProps {
  value: string;
  onChange: (masked: string) => void;
  onLookup?: (data: CnpjResultado) => void;
  onNotFound?: () => void;
  disabled?: boolean;
  required?: boolean;
  label?: string;
  helpText?: string;
  autoFocus?: boolean;
  className?: string;
}

export const CnpjField = forwardRef<HTMLInputElement, CnpjFieldProps>(function CnpjField(
  { value, onChange, onLookup, onNotFound, disabled, required, label = "CNPJ", helpText, autoFocus, className },
  ref
) {
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "invalid" | "notfound" | "error">("idle");
  const timerRef = useRef<number | null>(null);
  const lastQueriedRef = useRef<string>("");

  const clean = (value || "").replace(/\D/g, "");

  const runLookup = useCallback(async (cnpj: string) => {
    lastQueriedRef.current = cnpj;
    setStatus("loading");
    try {
      const data = await buscarCNPJ(cnpj);
      if (data) {
        setStatus("ok");
        onLookup?.(data);
      } else {
        setStatus("notfound");
        onNotFound?.();
      }
    } catch {
      setStatus("error");
    }
  }, [onLookup, onNotFound]);

  useEffect(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    if (clean.length !== 14) {
      setStatus("idle");
      return;
    }
    if (!validateCNPJ(clean)) {
      setStatus("invalid");
      return;
    }
    if (lastQueriedRef.current === clean) return;
    timerRef.current = window.setTimeout(() => { runLookup(clean); }, 400);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [clean, runLookup]);

  const handleChange = useCallback((raw: string) => onChange(maskCNPJ(raw)), [onChange]);

  const handleRetry = useCallback(() => {
    if (clean.length !== 14 || !validateCNPJ(clean)) return;
    clearCnpjCache();
    lastQueriedRef.current = "";
    runLookup(clean);
  }, [clean, runLookup]);

  const errorMsg =
    status === "invalid" ? "CNPJ inválido"
    : status === "notfound" ? "CNPJ não encontrado — preencha os dados manualmente"
    : status === "error" ? "Falha ao consultar CNPJ"
    : null;
  const canRetry = (status === "notfound" || status === "error") && clean.length === 14 && validateCNPJ(clean);

  return (
    <div className={cn("space-y-2", className)}>
      <Label className="flex items-center gap-2">
        <FileText className="w-4 h-4 text-muted-foreground" />
        {label} {required && <span className="text-destructive">*</span>}
        {status === "loading" && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
        {status === "ok" && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
        {(status === "invalid" || status === "error") && <AlertCircle className="w-3 h-3 text-destructive" />}
      </Label>
      <Input
        ref={ref}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="00.000.000/0000-00"
        inputMode="numeric"
        maxLength={18}
        disabled={disabled}
        autoFocus={autoFocus}
        aria-invalid={status === "invalid" || status === "error"}
      />
      {errorMsg && (
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-xs text-destructive">{errorMsg}</p>
          {canRetry && (
            <button
              type="button"
              onClick={handleRetry}
              className="text-xs text-primary hover:underline inline-flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Tentar novamente
            </button>
          )}
        </div>
      )}
      {!errorMsg && helpText && <p className="text-xs text-muted-foreground">{helpText}</p>}
    </div>
  );
});
