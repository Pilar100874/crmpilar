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
  // Campos disponíveis no cadastro de empresas (mesmos da tela de cadastro)
  const availableFields = [
    { value: "cnpj", label: "CPF/CNPJ", required: true },
    { value: "razao_social", label: "Nome (Razão Social)", required: true },
    { value: "nome_fantasia", label: "Nome Fantasia", required: true },
    { value: "cep", label: "CEP", required: false },
    { value: "endereco", label: "Endereço", required: false },
    { value: "cidade", label: "Cidade", required: false },
    { value: "bairro", label: "Bairro", required: false },
    { value: "estado", label: "UF", required: false },
    { value: "inscricao", label: "Inscrição", required: false },
    { value: "telefone", label: "Telefone", required: false },
    { value: "email", label: "Email", required: false },
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
          Clique em "Usar campo" dentro de cada caixa para selecionar variáveis. 
          <strong className="text-destructive"> Campos obrigatórios (*) devem ser preenchidos.</strong>
        </p>
        
        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
          {availableFields.map((field) => (
            <div key={field.value} className="space-y-1">
              <Label className="text-xs font-medium">
                {field.label} {field.required && <span className="text-destructive">*</span>}
              </Label>
              <RichTextEditor
                value={(fieldMappings[field.value] as string) || ""}
                onChange={(value) => updateFieldMapping(field.value, value)}
                placeholder={field.required ? "Obrigatório - use 'Usar campo' para selecionar" : "Digite ou clique em 'Usar campo' para selecionar variável"}
                multiline={false}
                nodes={nodes}
                edges={edges}
                selectedNode={selectedNode}
                showFormatting={false}
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
          showFormatting={false}
        />
        <p className="text-xs text-muted-foreground">
          Esta variável receberá "Sim" se o CNPJ não existia (cliente novo) ou "Não" se já existia.
        </p>
      </div>
    </div>
  );
};
