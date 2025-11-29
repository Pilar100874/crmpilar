import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Filter } from "lucide-react";

export interface Filter {
  field: string;
  operator: string;
  value: string;
}

interface Props {
  data: any[];
  selectedFields: string[];
  filters: Filter[];
  onFiltersChange: (filters: Filter[]) => void;
}

const OPERATORS = [
  { value: "equals", label: "Igual a" },
  { value: "not_equals", label: "Diferente de" },
  { value: "contains", label: "Contém" },
  { value: "not_contains", label: "Não contém" },
  { value: "starts_with", label: "Começa com" },
  { value: "ends_with", label: "Termina com" },
  { value: "greater_than", label: "Maior que" },
  { value: "less_than", label: "Menor que" },
  { value: "is_empty", label: "Está vazio" },
  { value: "is_not_empty", label: "Não está vazio" },
];

export function ApiImportWizardStep3({ data, selectedFields, filters, onFiltersChange }: Props) {
  const [newFilter, setNewFilter] = useState<Filter>({
    field: "",
    operator: "equals",
    value: "",
  });

  const addFilter = () => {
    if (!newFilter.field) return;
    onFiltersChange([...filters, { ...newFilter }]);
    setNewFilter({ field: "", operator: "equals", value: "" });
  };

  const removeFilter = (index: number) => {
    onFiltersChange(filters.filter((_, i) => i !== index));
  };

  const applyFilters = (items: any[]) => {
    return items.filter(item => {
      return filters.every(filter => {
        const value = item[filter.field];
        const filterValue = filter.value;

        switch (filter.operator) {
          case "equals":
            return String(value).toLowerCase() === filterValue.toLowerCase();
          case "not_equals":
            return String(value).toLowerCase() !== filterValue.toLowerCase();
          case "contains":
            return String(value).toLowerCase().includes(filterValue.toLowerCase());
          case "not_contains":
            return !String(value).toLowerCase().includes(filterValue.toLowerCase());
          case "starts_with":
            return String(value).toLowerCase().startsWith(filterValue.toLowerCase());
          case "ends_with":
            return String(value).toLowerCase().endsWith(filterValue.toLowerCase());
          case "greater_than":
            return Number(value) > Number(filterValue);
          case "less_than":
            return Number(value) < Number(filterValue);
          case "is_empty":
            return !value || String(value).trim() === "";
          case "is_not_empty":
            return value && String(value).trim() !== "";
          default:
            return true;
        }
      });
    });
  };

  const filteredCount = applyFilters(data).length;
  const needsValue = !["is_empty", "is_not_empty"].includes(newFilter.operator);

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Filtros de Dados</h3>
        <p className="text-sm text-muted-foreground">
          Adicione filtros para selecionar apenas os dados que deseja importar
        </p>
      </div>

      <Card className="p-4">
        <div className="space-y-4">
          <Label className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Adicionar Filtro
          </Label>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Select
              value={newFilter.field}
              onValueChange={(value) => setNewFilter({ ...newFilter, field: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Campo..." />
              </SelectTrigger>
              <SelectContent>
                {selectedFields.map((field) => (
                  <SelectItem key={field} value={field}>
                    {field}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={newFilter.operator}
              onValueChange={(value) => setNewFilter({ ...newFilter, operator: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Operador..." />
              </SelectTrigger>
              <SelectContent>
                {OPERATORS.map((op) => (
                  <SelectItem key={op.value} value={op.value}>
                    {op.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {needsValue && (
              <Input
                placeholder="Valor..."
                value={newFilter.value}
                onChange={(e) => setNewFilter({ ...newFilter, value: e.target.value })}
              />
            )}

            <Button onClick={addFilter} disabled={!newFilter.field}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </div>
        </div>
      </Card>

      {filters.length > 0 && (
        <Card className="p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Filtros Ativos</Label>
              <Badge variant="secondary">
                {filteredCount} de {data.length} registros
              </Badge>
            </div>

            <div className="space-y-2">
              {filters.map((filter, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                >
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="outline">{filter.field}</Badge>
                    <span className="text-muted-foreground">
                      {OPERATORS.find(o => o.value === filter.operator)?.label}
                    </span>
                    {!["is_empty", "is_not_empty"].includes(filter.operator) && (
                      <Badge variant="secondary">{filter.value}</Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFilter(index)}
                    className="h-8 w-8"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {filters.length === 0 && (
        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-sm text-muted-foreground">
            💡 <strong>Dica:</strong> Filtros são opcionais. Se não adicionar nenhum filtro, todos os {data.length} registros serão importados.
          </p>
        </div>
      )}
    </div>
  );
}
