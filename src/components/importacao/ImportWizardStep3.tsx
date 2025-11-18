import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Filter {
  id: string;
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
  { value: "contains", label: "Contém" },
  { value: "not_contains", label: "Não contém" },
  { value: "equals", label: "Igual a" },
  { value: "not_equals", label: "Diferente de" },
  { value: "greater_than", label: "Maior que" },
  { value: "less_than", label: "Menor que" },
  { value: "greater_equal", label: "Maior ou igual a" },
  { value: "less_equal", label: "Menor ou igual a" },
  { value: "starts_with", label: "Começa com" },
  { value: "ends_with", label: "Termina com" },
  { value: "empty", label: "Vazio" },
  { value: "not_empty", label: "Não vazio" },
];

export function ImportWizardStep3({ selectedFields, filters, onFiltersChange }: Props) {
  const addFilter = () => {
    const newFilter: Filter = {
      id: Date.now().toString(),
      field: selectedFields[0] || "",
      operator: "contains",
      value: "",
    };
    onFiltersChange([...filters, newFilter]);
  };

  const removeFilter = (id: string) => {
    onFiltersChange(filters.filter(f => f.id !== id));
  };

  const updateFilter = (id: string, updates: Partial<Filter>) => {
    onFiltersChange(
      filters.map(f => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  const needsValue = (operator: string) => {
    return !["empty", "not_empty"].includes(operator);
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Filtros Avançados</h3>
        <p className="text-sm text-muted-foreground">
          Adicione filtros para refinar os dados importados (opcional)
        </p>
      </div>

      <div className="flex items-center justify-between">
        <Badge variant="secondary">
          {filters.length} filtro(s) aplicado(s)
        </Badge>
        <Button onClick={addFilter} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Filtro
        </Button>
      </div>

      {filters.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            Nenhum filtro configurado. Clique em "Adicionar Filtro" para começar.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filters.map((filter, index) => (
            <Card key={filter.id} className="p-4">
              <div className="flex items-end gap-3">
                <div className="flex-1 space-y-2">
                  <Label>Campo</Label>
                  <Select
                    value={filter.field}
                    onValueChange={(value) => updateFilter(filter.id, { field: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedFields.map(field => (
                        <SelectItem key={field} value={field}>
                          {field}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1 space-y-2">
                  <Label>Operador</Label>
                  <Select
                    value={filter.operator}
                    onValueChange={(value) => updateFilter(filter.id, { operator: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OPERATORS.map(op => (
                        <SelectItem key={op.value} value={op.value}>
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {needsValue(filter.operator) && (
                  <div className="flex-1 space-y-2">
                    <Label>Valor</Label>
                    <Input
                      value={filter.value}
                      onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                      placeholder="Digite o valor..."
                    />
                  </div>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFilter(filter.id)}
                  className="flex-shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="bg-muted/50 rounded-lg p-4">
        <p className="text-sm text-muted-foreground">
          💡 <strong>Dica:</strong> Os filtros serão aplicados em sequência. Você pode adicionar múltiplos filtros para refinar ainda mais os dados.
        </p>
      </div>
    </div>
  );
}
