import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VariableInput } from "../VariableInput";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface ConfigProps {
  config: any;
  handleConfigChange: (updates: any) => void;
  openVariablePicker?: (fieldName: string, currentValue: string) => void;
  inputRefs?: React.MutableRefObject<Record<string, HTMLInputElement | HTMLTextAreaElement | null>>;
}

export const CRMCadastroEmpresaConfig = ({ config, handleConfigChange, openVariablePicker, inputRefs }: ConfigProps) => {
  // Campos disponíveis na tabela empresas
  const availableFields = [
    { value: "cnpj", label: "CNPJ" },
    { value: "razao_social", label: "Razão Social" },
    { value: "nome_fantasia", label: "Nome Fantasia" },
    { value: "email", label: "Email" },
    { value: "telefone", label: "Telefone" },
    { value: "endereco", label: "Endereço" },
    { value: "cidade", label: "Cidade" },
    { value: "estado", label: "Estado" },
    { value: "cep", label: "CEP" },
  ];

  const fieldMappings = config.fieldMappings || {};

  const addFieldMapping = () => {
    const newMappings = { ...fieldMappings };
    const unusedField = availableFields.find(f => !newMappings[f.value]);
    if (unusedField) {
      newMappings[unusedField.value] = "";
      handleConfigChange({ fieldMappings: newMappings });
    }
  };

  const removeFieldMapping = (field: string) => {
    const newMappings = { ...fieldMappings };
    delete newMappings[field];
    handleConfigChange({ fieldMappings: newMappings });
  };

  const updateFieldMapping = (field: string, variable: string) => {
    const newMappings = { ...fieldMappings };
    newMappings[field] = variable;
    handleConfigChange({ fieldMappings: newMappings });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Variável com CNPJ</Label>
        <VariableInput
          value={config.cnpjVariable || "cnpj"}
          onChange={(e) => handleConfigChange({ cnpjVariable: e.target.value })}
          placeholder="cnpj"
          onVariableRequest={openVariablePicker ? () => openVariablePicker('cnpjVariable', config.cnpjVariable || "cnpj") : undefined}
          ref={(el) => {
            if (inputRefs?.current) {
              inputRefs.current['cnpjVariable'] = el;
            }
          }}
        />
      </div>

      <div className="space-y-2">
        <Label>Modo de validação</Label>
        <Select
          value={config.validationMode || "create_or_update"}
          onValueChange={(value) => handleConfigChange({ validationMode: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="create_or_update">Criar ou Atualizar</SelectItem>
            <SelectItem value="create_only">Apenas Criar</SelectItem>
            <SelectItem value="validate_only">Apenas Validar</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {config.validationMode !== "validate_only" && (
        <div className="flex items-center justify-between space-x-2">
          <Label htmlFor="updateExisting">Atualizar empresa se já existir</Label>
          <Switch
            id="updateExisting"
            checked={config.updateExisting || false}
            onCheckedChange={(checked) => handleConfigChange({ updateExisting: checked })}
          />
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Mapeamento de campos</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addFieldMapping}
            disabled={Object.keys(fieldMappings).length >= availableFields.length}
          >
            <Plus className="h-3 w-3 mr-1" />
            Adicionar campo
          </Button>
        </div>

        <div className="space-y-2">
          {Object.entries(fieldMappings).map(([field, variable]) => (
            <div key={field} className="flex items-center gap-2">
              <div className="flex-1">
                <Label className="text-xs">
                  {availableFields.find(f => f.value === field)?.label || field}
                </Label>
                <VariableInput
                  value={variable as string}
                  onChange={(e) => updateFieldMapping(field, e.target.value)}
                  placeholder={`Variável para ${field}`}
                  onVariableRequest={openVariablePicker ? () => openVariablePicker(`fieldMapping_${field}`, variable as string) : undefined}
                  ref={(el) => {
                    if (inputRefs?.current) {
                      inputRefs.current[`fieldMapping_${field}`] = el;
                    }
                  }}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeFieldMapping(field)}
                className="h-8 w-8"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        {Object.keys(fieldMappings).length === 0 && (
          <p className="text-sm text-muted-foreground">
            Adicione campos para mapear variáveis aos campos da empresa
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Variável de saída (ID da empresa)</Label>
        <VariableInput
          value={config.outputVariable || "empresa_id"}
          onChange={(e) => handleConfigChange({ outputVariable: e.target.value })}
          placeholder="empresa_id"
          onVariableRequest={openVariablePicker ? () => openVariablePicker('outputVariable', config.outputVariable || "empresa_id") : undefined}
          ref={(el) => {
            if (inputRefs?.current) {
              inputRefs.current['outputVariable'] = el;
            }
          }}
        />
      </div>

      <div className="space-y-2">
        <Label>Variável de status</Label>
        <VariableInput
          value={config.statusVariable || "empresa_status"}
          onChange={(e) => handleConfigChange({ statusVariable: e.target.value })}
          placeholder="empresa_status"
          onVariableRequest={openVariablePicker ? () => openVariablePicker('statusVariable', config.statusVariable || "empresa_status") : undefined}
          ref={(el) => {
            if (inputRefs?.current) {
              inputRefs.current['statusVariable'] = el;
            }
          }}
        />
        <p className="text-xs text-muted-foreground">
          Valores: "created" (nova), "updated" (atualizada), "exists" (já existe), "not_found" (não encontrada)
        </p>
      </div>
    </div>
  );
};
