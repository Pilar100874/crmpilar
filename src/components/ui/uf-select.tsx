import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UFS } from "@/lib/brAddress";

interface UfSelectProps {
  value: string;
  onChange: (uf: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function UfSelect({ value, onChange, placeholder = "UF", disabled }: UfSelectProps) {
  return (
    <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {UFS.map((u) => (
          <SelectItem key={u.sigla} value={u.sigla}>
            {u.sigla} — {u.nome}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
