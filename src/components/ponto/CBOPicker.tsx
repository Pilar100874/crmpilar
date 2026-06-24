import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Search, Check } from "lucide-react";
import { CBOS } from "@/data/cbos";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (codigo: string, titulo?: string) => void;
  placeholder?: string;
};

export function CBOPicker({ value, onChange, placeholder = "0000-00" }: Props) {
  const [open, setOpen] = useState(false);
  const selected = CBOS.find((c) => c.codigo === value);

  return (
    <div className="flex gap-2">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1"
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="icon" title="Pesquisar CBO">
            <Search className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[380px] p-0" align="end">
          <Command
            filter={(value, search) => {
              const s = search.toLowerCase();
              return value.toLowerCase().includes(s) ? 1 : 0;
            }}
          >
            <CommandInput placeholder="Pesquisar por código ou cargo..." />
            <CommandList>
              <CommandEmpty>Nenhum CBO encontrado.</CommandEmpty>
              <CommandGroup>
                {CBOS.map((c) => (
                  <CommandItem
                    key={c.codigo}
                    value={`${c.codigo} ${c.titulo}`}
                    onSelect={() => {
                      onChange(c.codigo, c.titulo);
                      setOpen(false);
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", selected?.codigo === c.codigo ? "opacity-100" : "opacity-0")} />
                    <div className="flex flex-col">
                      <span className="font-mono text-xs">{c.codigo}</span>
                      <span className="text-sm">{c.titulo}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
