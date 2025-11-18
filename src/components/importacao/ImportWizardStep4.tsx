import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface FieldMappingConfig {
  type: "field" | "fixed";
  value: string;
  format?: string;
}

interface Props {
  selectedFields: string[];
  fieldMapping: Record<string, FieldMappingConfig>;
  onMappingChange: (mapping: Record<string, FieldMappingConfig>) => void;
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

const FORMAT_OPTIONS = [
  { value: "none", label: "Sem formatação" },
  { value: "uppercase", label: "MAIÚSCULAS" },
  { value: "lowercase", label: "minúsculas" },
  { value: "capitalize", label: "Primeira Maiúscula" },
  { value: "number", label: "Número" },
  { value: "decimal", label: "Decimal (0.00)" },
];

export function ImportWizardStep4({ selectedFields, fieldMapping, onMappingChange }: Props) {
  const updateMapping = (fixedField: string, config: FieldMappingConfig | null) => {
    const newMapping = { ...fieldMapping };
    if (!config) {
      delete newMapping[fixedField];
    } else {
      newMapping[fixedField] = config;
    }
    onMappingChange(newMapping);
  };

  const updateMappingType = (fixedField: string, type: "field" | "fixed") => {
    const current = fieldMapping[fixedField];
    updateMapping(fixedField, {
      type,
      value: type === "field" ? "none" : "",
      format: current?.format || "none",
    });
  };

  const updateMappingValue = (fixedField: string, value: string) => {
    const current = fieldMapping[fixedField];
    if (value === "none") {
      delete fieldMapping[fixedField];
      onMappingChange({ ...fieldMapping });
    } else {
      updateMapping(fixedField, {
        type: current?.type || "field",
        value,
        format: current?.format || "none",
      });
    }
  };

  const updateMappingFormat = (fixedField: string, format: string) => {
    const current = fieldMapping[fixedField];
    updateMapping(fixedField, {
      type: current?.type || "field",
      value: current?.value || "none",
      format,
    });
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
        {FIXED_FIELDS.map((fixedField) => {
          const config = fieldMapping[fixedField.value];
          const mappingType = config?.type || "field";

          return (
            <Card key={fixedField.value} className="p-4">
              <div className="space-y-4">
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
                    <RadioGroup
                      value={mappingType}
                      onValueChange={(value) => updateMappingType(fixedField.value, value as "field" | "fixed")}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="field" id={`${fixedField.value}-field`} />
                        <Label htmlFor={`${fixedField.value}-field`} className="font-normal cursor-pointer">
                          Mapear campo
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="fixed" id={`${fixedField.value}-fixed`} />
                        <Label htmlFor={`${fixedField.value}-fixed`} className="font-normal cursor-pointer">
                          Valor fixo
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>

                <div className="flex gap-3">
                  {mappingType === "field" ? (
                    <Select
                      value={config?.value || "none"}
                      onValueChange={(value) => updateMappingValue(fixedField.value, value)}
                    >
                      <SelectTrigger className="flex-1">
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
                  ) : (
                    <Input
                      placeholder="Digite o valor fixo..."
                      value={config?.value || ""}
                      onChange={(e) => updateMappingValue(fixedField.value, e.target.value)}
                      className="flex-1"
                    />
                  )}

                  <Select
                    value={config?.format || "none"}
                    onValueChange={(value) => updateMappingFormat(fixedField.value, value)}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Formatação..." />
                    </SelectTrigger>
                    <SelectContent>
                      {FORMAT_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>
          );
        })}
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
