import { forwardRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, AlertCircle, User } from "lucide-react";
import { maskCPF } from "@/lib/masks";
import { validateCPF } from "@/lib/validators";
import { cn } from "@/lib/utils";

interface CpfFieldProps {
  value: string;
  onChange: (masked: string) => void;
  disabled?: boolean;
  required?: boolean;
  label?: string;
  helpText?: string;
  autoFocus?: boolean;
  className?: string;
}

/**
 * Campo CPF: máscara + validação de dígitos.
 * Não realiza consulta a dados pessoais — LGPD.
 */
export const CpfField = forwardRef<HTMLInputElement, CpfFieldProps>(function CpfField(
  { value, onChange, disabled, required, label = "CPF", helpText, autoFocus, className },
  ref
) {
  const clean = (value || "").replace(/\D/g, "");
  const isComplete = clean.length === 11;
  const isValid = isComplete && validateCPF(clean);
  const isInvalid = isComplete && !isValid;

  const handleChange = useCallback((raw: string) => onChange(maskCPF(raw)), [onChange]);

  return (
    <div className={cn("space-y-2", className)}>
      <Label className="flex items-center gap-2">
        <User className="w-4 h-4 text-muted-foreground" />
        {label} {required && <span className="text-destructive">*</span>}
        {isValid && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
        {isInvalid && <AlertCircle className="w-3 h-3 text-destructive" />}
      </Label>
      <Input
        ref={ref}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="000.000.000-00"
        inputMode="numeric"
        maxLength={14}
        disabled={disabled}
        autoFocus={autoFocus}
        aria-invalid={isInvalid}
      />
      {isInvalid && <p className="text-xs text-destructive">CPF inválido</p>}
      {!isInvalid && helpText && <p className="text-xs text-muted-foreground">{helpText}</p>}
    </div>
  );
});
