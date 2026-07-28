import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { maskCNPJ } from "@/lib/masks";
import { validateCNPJ } from "@/lib/validators";
import { buscarCNPJ, type CnpjResultado } from "@/lib/cadastros/cnpjService";
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

/**
 * Campo CNPJ padronizado:
 * - Máscara automática
 * - Validação de dígitos
 * - Consulta automática ao completar (debounce 400ms, dedup via cache)
 * - Ícone de estado (idle / loading / válido / inválido / não encontrado)
 * - Mensagem de erro abaixo
 */
export const CnpjField = forwardRef<HTMLInputElement, CnpjFieldProps>(function CnpjField(
  { value, onChange, onLookup, onNotFound, disabled, required, label = "CNPJ", helpText, autoFocus, className },
  ref
) {
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "invalid" | "notfound">("idle");
  const timerRef = useRef<number | null>(null);
  const lastQueriedRef = useRef<string>("");

  const clean = (value || "").replace(/\D/g, "");

  useEffect(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    if (clean.length !== 14) {
      setStatus(clean.length > 0 && clean.length < 14 ? "idle" : "idle");
      return;
    }
    if (!validateCNPJ(clean)) {
      setStatus("invalid");
      return;
    }
    if (lastQueriedRef.current === clean) return;
    timerRef.current = window.setTimeout(async () => {
      lastQueriedRef.current = clean;
      setStatus("loading");
      const data = await buscarCNPJ(clean);
      if (data) {
        setStatus("ok");
        onLookup?.(data);
      } else {
        setStatus("notfound");
        onNotFound?.();
      }
    }, 400);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clean]);

  const handleChange = useCallback(
    (raw: string) => {
      onChange(maskCNPJ(raw));
    },
    [onChange]
  );

  const errorMsg =
    status === "invalid" ? "CNPJ inválido" : status === "notfound" ? "CNPJ não encontrado — preencha os dados manualmente" : null;

  return (
    <div className={cn("space-y-2", className)}>
      <Label className="flex items-center gap-2">
        <FileText className="w-4 h-4 text-muted-foreground" />
        {label} {required && <span className="text-destructive">*</span>}
        {status === "loading" && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
        {status === "ok" && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
        {status === "invalid" && <AlertCircle className="w-3 h-3 text-destructive" />}
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
        aria-invalid={status === "invalid"}
      />
      {errorMsg && <p className="text-xs text-destructive">{errorMsg}</p>}
      {!errorMsg && helpText && <p className="text-xs text-muted-foreground">{helpText}</p>}
    </div>
  );
});
