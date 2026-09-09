// Biblioteca visual de ícones com busca em português.
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { BIBLIOTECA_ICONES, APELIDOS_ICONES, buscarIcones } from "@/lib/automacao/icones";

interface Props {
  valor?: string | null;
  onChange: (nome: string) => void;
}

export default function SeletorIcone({ valor, onChange }: Props) {
  const [busca, setBusca] = useState("");
  const nomes = useMemo(() => buscarIcones(busca), [busca]);

  return (
    <div className="space-y-2">
      <Input
        placeholder="Procurar (ex.: lâmpada, tomada, ventilador)"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
      />
      <div className="grid grid-cols-8 gap-1 max-h-52 overflow-y-auto rounded-lg border p-2 bg-muted/20">
        {nomes.map((n) => {
          const Icon = BIBLIOTECA_ICONES[n];
          return (
            <button
              key={n}
              type="button"
              title={APELIDOS_ICONES[n] ?? n}
              onClick={() => onChange(n)}
              className={cn(
                "flex h-9 w-full items-center justify-center rounded-md transition-colors",
                valor === n ? "bg-primary text-primary-foreground" : "hover:bg-accent",
              )}
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}
        {!nomes.length && (
          <p className="col-span-8 text-center text-xs text-muted-foreground py-3">
            Nenhum elemento encontrado.
          </p>
        )}
      </div>
    </div>
  );
}
