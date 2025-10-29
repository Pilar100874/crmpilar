import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VariableInput } from "../VariableInput";
import { Switch } from "@/components/ui/switch";

interface ConfigProps {
  config: any;
  handleConfigChange: (updates: any) => void;
  openVariablePicker?: (fieldName: string, currentValue: string) => void;
  inputRefs?: React.MutableRefObject<Record<string, HTMLInputElement | HTMLTextAreaElement | null>>;
}

export const CRMCadastroEmpresaConfig = ({ config, handleConfigChange, openVariablePicker, inputRefs }: ConfigProps) => {
  // Campos reais da tabela empresas no banco de dados
  // Estes campos são extraídos da estrutura da tabela e aparecem automaticamente
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
        <p className="text-xs text-muted-foreground">
          Esta variável indica qual campo contém o CNPJ para validar se a empresa já existe no cadastro.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Modo de operação</Label>
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
            checked={config.updateExisting !== false}
            onCheckedChange={(checked) => handleConfigChange({ updateExisting: checked })}
          />
        </div>
      )}

      <div className="space-y-3 border-t pt-4">
        <Label className="font-semibold">Mapeamento de Campos da Empresa</Label>
        <p className="text-xs text-muted-foreground">
          Use o botão "Usar variável" ao lado de cada campo para selecionar. Campos em branco não serão atualizados.
        </p>
        
        <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
          {availableFields.map((field) => (
            <div key={field.value} className="flex items-center gap-2">
              <Label className="text-xs font-medium w-40 flex-shrink-0">
                {field.label}
              </Label>
              <div className="flex-1">
                <VariableInput
                  value={(fieldMappings[field.value] as string) || ""}
                  onChange={(e) => updateFieldMapping(field.value, e.target.value)}
                  placeholder="Digite ou use o botão ao lado"
                  onVariableRequest={openVariablePicker ? () => openVariablePicker(`fieldMapping_${field.value}`, (fieldMappings[field.value] as string) || "") : undefined}
                  ref={(el) => {
                    if (inputRefs?.current) {
                      inputRefs.current[`fieldMapping_${field.value}`] = el;
                    }
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2 border-t pt-4">
        <Label>Variável de saída</Label>
        <VariableInput
          value={config.outputVariable || "cliente_novo"}
          onChange={(e) => handleConfigChange({ outputVariable: e.target.value })}
          placeholder="cliente_novo"
          onVariableRequest={openVariablePicker ? () => openVariablePicker('outputVariable', config.outputVariable || "cliente_novo") : undefined}
          ref={(el) => {
            if (inputRefs?.current) {
              inputRefs.current['outputVariable'] = el;
            }
          }}
        />
        <p className="text-xs text-muted-foreground">
          Esta variável receberá "Sim" se o CNPJ não existia (cliente novo) ou "Não" se já existia.
        </p>
      </div>
    </div>
  );
};
