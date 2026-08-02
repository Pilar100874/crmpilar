import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  busca: string;
  onBusca: (v: string) => void;
  onNovo?: () => void;
  novoLabel?: string;
  loading?: boolean;
  vazio?: boolean;
  vazioTexto?: string;
  acoes?: ReactNode;
  children: ReactNode;
}

export function AipToolbar({
  busca,
  onBusca,
  onNovo,
  novoLabel = "Novo",
  loading,
  vazio,
  vazioTexto = "Nenhum registro encontrado.",
  acoes,
  children,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => onBusca(e.target.value)}
            placeholder="Buscar..."
            className="pl-9"
          />
        </div>
        {acoes}
        {onNovo && (
          <Button onClick={onNovo}>
            <Plus className="mr-2 h-4 w-4" />
            {novoLabel}
          </Button>
        )}
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((k) => (
            <Skeleton key={k} className="h-28 w-full" />
          ))}
        </div>
      ) : vazio ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          {vazioTexto}
        </div>
      ) : (
        children
      )}
    </div>
  );
}
