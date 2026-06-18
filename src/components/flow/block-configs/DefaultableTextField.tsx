import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Info } from "lucide-react";

interface DefaultableTextFieldProps {
  label: string;
  defaultValue: string;
  /** Custom value when override is active. undefined/empty means "use default". */
  value: string | undefined;
  onChange: (next: string | undefined) => void;
  /** When true uses <Textarea> instead of <Input> */
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
  description?: string;
}

/**
 * Campo com toggle "Padrão / Personalizado". Quando desligado, mostra o
 * texto padrão (somente leitura) e o valor salvo é undefined. Quando ligado,
 * permite editar o texto e salva no config.
 */
export const DefaultableTextField = ({
  label,
  defaultValue,
  value,
  onChange,
  multiline,
  rows = 3,
  placeholder,
  description,
}: DefaultableTextFieldProps) => {
  const enabled = typeof value === "string" && value.length > 0;
  const display = enabled ? (value as string) : defaultValue;

  const toggle = (on: boolean) => {
    if (on) onChange(defaultValue); // seed com padrão
    else onChange(undefined);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm font-medium">{label}</Label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {enabled ? "Personalizado" : "Padrão"}
          </span>
          <Switch checked={enabled} onCheckedChange={toggle} />
        </div>
      </div>
      {multiline ? (
        <Textarea
          value={display}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || defaultValue}
          disabled={!enabled}
          rows={rows}
        />
      ) : (
        <Input
          value={display}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || defaultValue}
          disabled={!enabled}
        />
      )}
      {!enabled && (
        <p className="text-xs text-muted-foreground flex items-start gap-1">
          <Info className="w-3 h-3 mt-0.5 shrink-0" />
          <span>Padrão: <em>"{defaultValue}"</em></span>
        </p>
      )}
      {description && enabled && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
};

export default DefaultableTextField;
