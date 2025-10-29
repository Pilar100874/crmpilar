import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { RichTextEditor } from "../RichTextEditor";

interface ConfigProps {
  config: any;
  handleConfigChange: (updates: any) => void;
  nodes?: any[];
  edges?: any[];
  selectedNode?: any;
}

export const CRMCadastroEmpresaConfig = ({ config, handleConfigChange, nodes, edges, selectedNode }: ConfigProps) => {
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
          Clique em "Usar campo" dentro de cada caixa para selecionar variáveis. Campos em branco não serão atualizados.
        </p>
        
        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
          {availableFields.map((field) => (
            <div key={field.value} className="space-y-1">
              <Label className="text-xs font-medium">
                {field.label}
              </Label>
              <RichTextEditor
                value={(fieldMappings[field.value] as string) || ""}
                onChange={(value) => updateFieldMapping(field.value, value)}
                placeholder="Digite ou clique em 'Usar campo' para selecionar variável"
                multiline={false}
                nodes={nodes}
                edges={edges}
                selectedNode={selectedNode}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2 border-t pt-4">
        <Label>Variável de saída</Label>
        <RichTextEditor
          value={config.outputVariable || "cliente_novo"}
          onChange={(value) => handleConfigChange({ outputVariable: value })}
          placeholder="cliente_novo"
          multiline={false}
          nodes={nodes}
          edges={edges}
          selectedNode={selectedNode}
        />
        <p className="text-xs text-muted-foreground">
          Esta variável receberá "Sim" se o CNPJ não existia (cliente novo) ou "Não" se já existia.
        </p>
      </div>
    </div>
  );
};
