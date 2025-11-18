import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";

interface Props {
  selectedFields: string[];
  fieldMapping: Record<string, string>;
  onMappingChange: (mapping: Record<string, string>) => void;
}

const FIXED_FIELDS = [
  { value: "nome", label: "Nome", required: true },
  { value: "quantidade", label: "Quantidade", required: false },
  { value: "gramatura", label: "Gramatura", required: false },
  { value: "largura", label: "Largura", required: false },
  { value: "comprimento", label: "Comprimento", required: false },
  { value: "tipo", label: "Tipo", required: false },
  { value: "obs", label: "Observações", required: false },
];

export function ImportWizardStep4({ selectedFields, fieldMapping, onMappingChange }: Props) {
  const updateMapping = (fixedField: string, excelField: string) => {
    const newMapping = { ...fieldMapping };
    if (excelField === "none") {
      delete newMapping[fixedField];
    } else {
      newMapping[fixedField] = excelField;
    }
    onMappingChange(newMapping);
  };

  const getMappedCount = () => {
    return Object.keys(fieldMapping).length;
  };

  const getUnmappedFixedFields = () => {
    return FIXED_FIELDS.filter(field => !fieldMapping[field.value]);
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Mapeamento de Campos</h3>
        <p className="text-sm text-muted-foreground">
          Mapeie os campos do Excel para os campos fixos do sistema
        </p>
      </div>

      <div className="flex items-center justify-between">
        <Badge variant="secondary">
          {getMappedCount()} de {FIXED_FIELDS.length} campos mapeados
        </Badge>
        {getUnmappedFixedFields().length > 0 && (
          <Badge variant="outline">
            {getUnmappedFixedFields().length} campos não mapeados
          </Badge>
        )}
      </div>

      <div className="space-y-3">
        {FIXED_FIELDS.map((fixedField) => (
          <Card key={fixedField.value} className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label className="flex items-center gap-2">
                  {fixedField.label}
                  {fixedField.required && (
                    <Badge variant="destructive" className="text-xs">
                      Obrigatório
                    </Badge>
                  )}
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Campo fixo do sistema
                </p>
              </div>

              <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />

              <div className="flex-1">
                <Select
                  value={fieldMapping[fixedField.value] || "none"}
                  onValueChange={(value) => updateMapping(fixedField.value, value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um campo..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      <span className="text-muted-foreground">(Não mapear)</span>
                    </SelectItem>
                    {selectedFields.map(field => (
                      <SelectItem key={field} value={field}>
                        {field}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {getMappedCount() === 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            ⚠️ Mapeie pelo menos um campo para continuar
          </p>
        </div>
      )}

      <div className="bg-muted/50 rounded-lg p-4">
        <p className="text-sm text-muted-foreground">
          💡 <strong>Dica:</strong> Você pode deixar campos não mapeados se não houver correspondência no seu arquivo Excel.
        </p>
      </div>
    </div>
  );
}
