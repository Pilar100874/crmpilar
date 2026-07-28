import { useEffect, useState } from "react";
import { Check, ChevronsUpDown, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UFS, fetchCidadesDetalhado, type CidadeIBGE } from "@/lib/brAddress";
import { cn } from "@/lib/utils";

export interface UfCidadeIbgeValue {
  uf: string;
  cidade: string;
  ibge: string;
}

interface Props {
  value: UfCidadeIbgeValue;
  onChange: (v: UfCidadeIbgeValue) => void;
  disabled?: boolean;
  showIbge?: boolean;
  /** Layout: 'grid' (default) or 'stack' */
  layout?: "grid" | "stack";
  labels?: { uf?: string; cidade?: string; ibge?: string };
  /** Se true, UF e Cidade são somente leitura (preenchidos via CEP). IBGE continua auto-resolvido. */
  readOnly?: boolean;
}

/**
 * Compound selector: UF (dropdown), Cidade (searchable list from IBGE, no free typing),
 * IBGE (read-only, auto-filled). Keeps compatibility with CEP/CNPJ auto-fill: parent can
 * just call onChange({ uf, cidade: "", ibge: "" }) then set uf/cidade to trigger resolution.
 */
export function UfCidadeIbge({
  value,
  onChange,
  disabled,
  showIbge = true,
  layout = "grid",
  labels,
  readOnly = true,
}: Props) {
  const [open, setOpen] = useState(false);
  const [cidades, setCidades] = useState<CidadeIBGE[]>([]);
  const [loading, setLoading] = useState(false);

  const uf = (value.uf || "").toUpperCase();
  const cidade = value.cidade || "";
  const ibge = value.ibge || "";

  useEffect(() => {
    let alive = true;
    if (!uf || uf.length !== 2) {
      setCidades([]);
      return;
    }
    setLoading(true);
    fetchCidadesDetalhado(uf).then((list) => {
      if (!alive) return;
      setCidades(list);
      setLoading(false);
      // Auto-resolve IBGE if cidade is set but ibge missing/stale
      if (cidade) {
        const match = list.find((c) => c.nome.toLowerCase() === cidade.toLowerCase());
        if (match && match.ibge !== ibge) {
          onChange({ uf, cidade: match.nome, ibge: match.ibge });
        }
      }
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uf, cidade]);

  const setUf = (novoUf: string) => {
    const u = novoUf.toUpperCase();
    onChange({ uf: u, cidade: "", ibge: "" });
  };

  const setCidade = (c: CidadeIBGE) => {
    onChange({ uf, cidade: c.nome, ibge: c.ibge });
    setOpen(false);
  };

  const cityDisabled = disabled || !uf;

  const containerClass =
    layout === "stack"
      ? "space-y-2"
      : showIbge
        ? "grid grid-cols-1 sm:grid-cols-6 gap-2"
        : "grid grid-cols-1 sm:grid-cols-5 gap-2";

  return (
    <div className={containerClass}>
      <div className={layout === "grid" ? "sm:col-span-1" : ""}>
        <Label className="text-xs flex items-center gap-1">
          {readOnly && <Lock className="h-3 w-3" />} {labels?.uf ?? "UF"}
        </Label>
        {readOnly ? (
          <Input value={uf} readOnly placeholder="—" className="bg-muted/40" />
        ) : (
          <Select value={uf || undefined} onValueChange={setUf} disabled={disabled}>
            <SelectTrigger>
              <SelectValue placeholder="UF" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {UFS.map((u) => (
                <SelectItem key={u.sigla} value={u.sigla}>
                  {u.sigla} — {u.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className={layout === "grid" ? (showIbge ? "sm:col-span-3" : "sm:col-span-4") : ""}>
        <Label className="text-xs flex items-center gap-1">
          {readOnly && <Lock className="h-3 w-3" />} {labels?.cidade ?? "Cidade"}
        </Label>
        {readOnly ? (
          <Input
            value={loading ? "Carregando..." : cidade}
            readOnly
            placeholder={uf ? "Preenchido pelo CEP" : "Informe o CEP"}
            className="bg-muted/40"
          />
        ) : (
          <Popover open={open} onOpenChange={(o) => !cityDisabled && setOpen(o)}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                disabled={cityDisabled}
                className={cn("w-full justify-between font-normal", !cidade && "text-muted-foreground")}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
                  </span>
                ) : (
                  cidade || (uf ? "Selecione a cidade" : "Selecione a UF primeiro")
                )}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
              <Command>
                <CommandInput placeholder="Buscar cidade..." />
                <CommandList>
                  <CommandEmpty>Nenhuma cidade encontrada.</CommandEmpty>
                  <CommandGroup>
                    {cidades.map((c) => (
                      <CommandItem key={c.ibge} value={c.nome} onSelect={() => setCidade(c)}>
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            cidade === c.nome ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {c.nome}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}
      </div>


      {showIbge && (
        <div className={layout === "grid" ? "sm:col-span-2" : ""}>
          <Label className="text-xs flex items-center gap-1">
            <Lock className="h-3 w-3" /> {labels?.ibge ?? "Código IBGE"}
          </Label>
          <Input value={ibge} readOnly placeholder="—" className="bg-muted/40" />
        </div>
      )}
    </div>
  );
}
