import { useEffect, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { fetchCidades } from "@/lib/brAddress";
import { cn } from "@/lib/utils";

interface CidadeSelectProps {
  uf: string;
  value: string;
  onChange: (cidade: string) => void;
  disabled?: boolean;
}

export function CidadeSelect({ uf, value, onChange, disabled }: CidadeSelectProps) {
  const [open, setOpen] = useState(false);
  const [cidades, setCidades] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!uf) {
      setCidades([]);
      return;
    }
    setLoading(true);
    fetchCidades(uf).then((list) => {
      if (alive) setCidades(list);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [uf]);

  const isDisabled = disabled || !uf;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={isDisabled}
          className="w-full justify-between font-normal"
        >
          <span className={cn(!value && "text-muted-foreground")}>
            {value || (uf ? "Selecione a cidade" : "Selecione a UF primeiro")}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={loading ? "Carregando..." : "Buscar cidade..."} />
          <CommandList>
            <CommandEmpty>Nenhuma cidade encontrada.</CommandEmpty>
            <CommandGroup>
              {cidades.map((c) => (
                <CommandItem
                  key={c}
                  value={c}
                  onSelect={() => {
                    onChange(c);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === c ? "opacity-100" : "opacity-0")} />
                  {c}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
