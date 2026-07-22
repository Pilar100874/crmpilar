import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Search } from "lucide-react";

export interface FilteredCheckboxItem {
  id: string;
  label: string;
  extra?: string;
}

interface FilteredCheckboxListProps {
  items: FilteredCheckboxItem[];
  selected: string[];
  onToggle: (id: string, checked: boolean) => void;
  idPrefix: string;
  emptyText?: string;
  searchPlaceholder?: string;
  /** Mostra a busca somente quando existem mais que este número de itens */
  searchThreshold?: number;
  maxHeightClass?: string;
}

/**
 * Lista padronizada de vínculos:
 * - Campo de busca no topo (aparece automaticamente quando há muitos itens)
 * - Lista rolável de checkboxes abaixo
 */
export function FilteredCheckboxList({
  items,
  selected,
  onToggle,
  idPrefix,
  emptyText = "Nenhum item disponível.",
  searchPlaceholder = "Buscar...",
  searchThreshold = 6,
  maxHeightClass = "max-h-[200px]",
}: FilteredCheckboxListProps) {
  const [search, setSearch] = useState("");
  const showSearch = items.length > searchThreshold;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter(
      (i) =>
        i.label.toLowerCase().includes(term) ||
        (i.extra?.toLowerCase().includes(term) ?? false)
    );
  }, [items, search]);

  return (
    <div className="space-y-2">
      {showSearch && (
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-8 text-sm pl-8"
          />
        </div>
      )}
      <div
        className={`space-y-1 ${maxHeightClass} overflow-y-auto border rounded-lg p-2 bg-background`}
      >
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground p-2">{emptyText}</p>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground p-2">
            Nenhum resultado para "{search}".
          </p>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className="flex items-center space-x-2 p-1.5 hover:bg-accent/50 rounded"
            >
              <Checkbox
                id={`${idPrefix}-${item.id}`}
                checked={selected.includes(item.id)}
                onCheckedChange={(checked) => onToggle(item.id, !!checked)}
              />
              <label
                htmlFor={`${idPrefix}-${item.id}`}
                className="text-sm cursor-pointer flex-1"
              >
                {item.label}
                {item.extra && (
                  <span className="text-xs text-muted-foreground ml-2">
                    {item.extra}
                  </span>
                )}
              </label>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
