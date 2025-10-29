import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { RichTextEditor } from "../RichTextEditor";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";

interface ConfigProps {
  config: any;
  handleConfigChange: (updates: any) => void;
  nodes?: any[];
  edges?: any[];
  selectedNode?: any;
}

interface FieldConfig {
  field_id: string;
  field_label: string;
  required: boolean;
}

export const CRMCadastroEmpresaConfig = ({ config, handleConfigChange, nodes, edges, selectedNode }: ConfigProps) => {
  const [availableFields, setAvailableFields] = useState<FieldConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFieldConfigs();
  }, []);

  const loadFieldConfigs = async () => {
    try {
      const estabId = await getEstabelecimentoId();
      if (!estabId) {
        // Se não tem estabelecimento, usar campos padrão
        setAvailableFields(getDefaultFields());
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('form_field_configs')
        .select('field_id, field_label, required')
        .eq('estabelecimento_id', estabId)
        .eq('form_type', 'company')
        .order('field_order');

      if (error) throw error;

      if (data && data.length > 0) {
        const filtered = data.filter((f: any) => allowedFieldIds.has(f.field_id));
        setAvailableFields(filtered.length > 0 ? filtered : getDefaultFields());
      } else {
        // Se não tem configuração, usar campos padrão
        setAvailableFields(getDefaultFields());
      }
    } catch (error) {
      console.error("Erro ao carregar configuração de campos:", error);
      setAvailableFields(getDefaultFields());
    } finally {
      setLoading(false);
    }
  };

  const getDefaultFields = (): FieldConfig[] => [
    { field_id: "cpf_cnpj", field_label: "CPF/CNPJ", required: true },
    { field_id: "company_name", field_label: "Nome", required: true },
    { field_id: "company_fantasia", field_label: "Nome Fantasia", required: true },
    { field_id: "cep", field_label: "CEP", required: true },
    { field_id: "address", field_label: "Endereço", required: true },
    { field_id: "city", field_label: "Cidade", required: true },
    { field_id: "neighborhood", field_label: "Bairro", required: true },
    { field_id: "state", field_label: "UF", required: true },
  ];

  // Campos permitidos neste bloco (sem 'company_type')
  const allowedFieldIds = new Set(["cpf_cnpj","company_name","company_fantasia","cep","address","city","neighborhood","state"]);

  // Mapear IDs de campo para nomes da tabela empresas
  const fieldMapping: Record<string, string> = {
    cpf_cnpj: "cnpj",
    company_name: "razao_social",
    company_fantasia: "nome_fantasia",
    address: "endereco",
    city: "cidade",
    neighborhood: "bairro",
    state: "estado",
    cep: "cep",
  };

  const getDbFieldName = (fieldId: string): string => {
    return fieldMapping[fieldId] || fieldId;
  };

  const fieldMappings = config.fieldMappings || {};

  const updateFieldMapping = (fieldId: string, variable: string) => {
    const dbFieldName = getDbFieldName(fieldId);
    const newMappings = { ...fieldMappings };
    newMappings[dbFieldName] = variable;
    handleConfigChange({ fieldMappings: newMappings });
  };

  if (loading) {
    return <div className="p-4 text-center text-muted-foreground">Carregando configuração de campos...</div>;
  }

  // Garantir que validationMode esteja sempre como "create_or_update"
  if (config.validationMode !== "create_or_update") {
    handleConfigChange({ validationMode: "create_or_update" });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between space-x-2 p-3 bg-muted/50 rounded-md">
        <div className="space-y-1">
          <Label htmlFor="updateExisting" className="font-medium">Atualizar empresa se já existir</Label>
          <p className="text-xs text-muted-foreground">
            Se desativado, o bot não atualizará dados de empresas já cadastradas
          </p>
        </div>
        <Switch
          id="updateExisting"
          checked={config.updateExisting !== false}
          onCheckedChange={(checked) => handleConfigChange({ updateExisting: checked })}
        />
      </div>

      <div className="space-y-3 border-t pt-4">
        <Label className="font-semibold">Mapeamento de Campos da Empresa</Label>
        <p className="text-xs text-muted-foreground">
          Clique em "Usar campo" dentro de cada caixa para selecionar variáveis. 
          <strong className="text-destructive"> Campos obrigatórios (*) devem ser preenchidos.</strong>
        </p>
        <p className="text-xs text-blue-600">
          ℹ️ Os campos listados aqui vêm da configuração de "Campos de Empresa" na tela de Contatos.
        </p>
        <p className="text-xs text-green-600 font-medium">
          ✓ Tipo da empresa será automaticamente definido como "Pessoa Jurídica"
        </p>
        
        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
          {availableFields.map((field) => {
            const dbFieldName = getDbFieldName(field.field_id);
            return (
              <div key={field.field_id} className="space-y-1">
                <Label className="text-xs font-medium">
                  {field.field_label} {field.required && <span className="text-destructive">*</span>}
                </Label>
                <RichTextEditor
                  value={(fieldMappings[dbFieldName] as string) || ""}
                  onChange={(value) => updateFieldMapping(field.field_id, value)}
                  placeholder={field.required ? "Obrigatório - use 'Usar campo' para selecionar" : "Digite ou clique em 'Usar campo' para selecionar variável"}
                  multiline={false}
                  nodes={nodes}
                  edges={edges}
                  selectedNode={selectedNode}
                  showFormatting={false}
                />
              </div>
            );
          })}
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
