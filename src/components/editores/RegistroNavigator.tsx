import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface Props {
  total: number;
  index: number;
  onChange: (i: number) => void;
  label?: string;
}

export function RegistroNavigator({ total, index, onChange, label }: Props) {
  if (total === 0) return null;
  const go = (i: number) => onChange(Math.max(0, Math.min(total - 1, i)));
  return (
    <div className="flex items-center gap-1 bg-muted/40 rounded p-1">
      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => go(0)} disabled={index === 0}><ChevronsLeft className="h-4 w-4" /></Button>
      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => go(index - 1)} disabled={index === 0}><ChevronLeft className="h-4 w-4" /></Button>
      <div className="flex items-center gap-1 text-xs px-1">
        <Input
          type="number"
          value={index + 1}
          onChange={e => go(Number(e.target.value) - 1)}
          className="h-7 w-14 text-center text-xs"
        />
        <span className="text-muted-foreground">de {total}</span>
      </div>
      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => go(index + 1)} disabled={index >= total - 1}><ChevronRight className="h-4 w-4" /></Button>
      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => go(total - 1)} disabled={index >= total - 1}><ChevronsRight className="h-4 w-4" /></Button>
      {label && <span className="text-[11px] text-muted-foreground ml-2 truncate max-w-[180px]">{label}</span>}
    </div>
  );
}
