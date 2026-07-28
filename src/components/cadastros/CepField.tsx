import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MapPin, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { maskCEP } from "@/lib/masks";
import { validateCEP } from "@/lib/validators";
import { buscarCEP, clearCepCache, type CepResultado } from "@/lib/cadastros/cepService";
import { cn } from "@/lib/utils";

interface CepFieldProps {
  value: string;
  onChange: (masked: string) => void;
  onLookup?: (data: CepResultado) => void;
  onNotFound?: () => void;
  disabled?: boolean;
  required?: boolean;
  label?: string;
  className?: string;
}

export const CepField = forwardRef<HTMLInputElement, CepFieldProps>(function CepField(
  { value, onChange, onLookup, onNotFound, disabled, required, label = "CEP", className },
  ref
) {
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "invalid" | "notfound" | "error">("idle");
  const timerRef = useRef<number | null>(null);
  const lastQueriedRef = useRef<string>("");
  const clean = (value || "").replace(/\D/g, "");

  const runLookup = useCallback(async (cep: string) => {
    lastQueriedRef.current = cep;
    setStatus("loading");
    try {
      const data = await buscarCEP(cep);
      if (data) { setStatus("ok"); onLookup?.(data); }
      else { setStatus("notfound"); onNotFound?.(); }
    } catch {
      setStatus("error");
    }
  }, [onLookup, onNotFound]);

  useEffect(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    if (clean.length !== 8) return;
    if (!validateCEP(clean)) { setStatus("invalid"); return; }
    if (lastQueriedRef.current === clean) return;
    timerRef.current = window.setTimeout(() => { runLookup(clean); }, 400);
    return () => { if (timerRef.current) window.clearTimeout(timerRef.current); };
  }, [clean, runLookup]);

  const handleChange = useCallback((raw: string) => onChange(maskCEP(raw)), [onChange]);

  const handleRetry = useCallback(() => {
    if (clean.length !== 8 || !validateCEP(clean)) return;
    clearCepCache();
    lastQueriedRef.current = "";
    runLookup(clean);
  }, [clean, runLookup]);

  const err = status === "invalid" ? "CEP inválido"
    : status === "notfound" ? "CEP não encontrado"
    : status === "error" ? "Falha ao consultar CEP"
    : null;
  const canRetry = (status === "notfound" || status === "error") && clean.length === 8 && validateCEP(clean);

  return (
    <div className={cn("space-y-2", className)}>
      <Label className="flex items-center gap-2">
        <MapPin className="w-4 h-4 text-muted-foreground" />
        {label} {required && <span className="text-destructive">*</span>}
        {status === "loading" && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
        {status === "ok" && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
        {(status === "invalid" || status === "error") && <AlertCircle className="w-3 h-3 text-destructive" />}
      </Label>
      <Input
        ref={ref}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="00000-000"
        inputMode="numeric"
        maxLength={9}
        disabled={disabled}
        aria-invalid={status === "invalid" || status === "error"}
      />
      {err && (
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-xs text-destructive">{err}</p>
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
    </div>
  );
});
