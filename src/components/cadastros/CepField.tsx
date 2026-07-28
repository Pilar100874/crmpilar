import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MapPin, CheckCircle2, AlertCircle } from "lucide-react";
import { maskCEP } from "@/lib/masks";
import { validateCEP } from "@/lib/validators";
import { buscarCEP, type CepResultado } from "@/lib/cadastros/cepService";
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
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "invalid" | "notfound">("idle");
  const timerRef = useRef<number | null>(null);
  const lastQueriedRef = useRef<string>("");
  const clean = (value || "").replace(/\D/g, "");

  useEffect(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    if (clean.length !== 8) return;
    if (!validateCEP(clean)) { setStatus("invalid"); return; }
    if (lastQueriedRef.current === clean) return;
    timerRef.current = window.setTimeout(async () => {
      lastQueriedRef.current = clean;
      setStatus("loading");
      const data = await buscarCEP(clean);
      if (data) { setStatus("ok"); onLookup?.(data); }
      else { setStatus("notfound"); onNotFound?.(); }
    }, 400);
    return () => { if (timerRef.current) window.clearTimeout(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clean]);

  const handleChange = useCallback((raw: string) => onChange(maskCEP(raw)), [onChange]);

  const err = status === "invalid" ? "CEP inválido" : status === "notfound" ? "CEP não encontrado" : null;

  return (
    <div className={cn("space-y-2", className)}>
      <Label className="flex items-center gap-2">
        <MapPin className="w-4 h-4 text-muted-foreground" />
        {label} {required && <span className="text-destructive">*</span>}
        {status === "loading" && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
        {status === "ok" && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
        {status === "invalid" && <AlertCircle className="w-3 h-3 text-destructive" />}
      </Label>
      <Input
        ref={ref}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="00000-000"
        inputMode="numeric"
        maxLength={9}
        disabled={disabled}
        aria-invalid={status === "invalid"}
      />
      {err && <p className="text-xs text-destructive">{err}</p>}
    </div>
  );
});
