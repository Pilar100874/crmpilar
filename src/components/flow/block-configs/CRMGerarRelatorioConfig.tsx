import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RichTextEditor } from "../RichTextEditor";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";

interface ConfigProps {
  config: any;
  handleConfigChange: (updates: any) => void;
  nodes?: any[];
  edges?: any[];
  selectedNode?: any;
}

interface Relatorio {
  id: string;
  nome: string;
  descricao: string | null;
}

interface VariableData {
  value: string;
  type: string;
}

export const CRMGerarRelatorioConfig = ({ config, handleConfigChange, nodes, edges, selectedNode }: ConfigProps) => {
  const [relatorios, setRelatorios] = useState<Relatorio[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRelatorios();
  }, []);

  const loadRelatorios = async () => {
    try {
      const estabId = await getEstabelecimentoId();
      if (!estabId) {
        setRelatorios([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('relatorios')
        .select('id, nome, descricao')
        .eq('estabelecimento_id', estabId)
        .order('nome');

      if (error) throw error;

      setRelatorios(data || []);
    } catch (error) {
      console.error("Erro ao carregar relatórios:", error);
      setRelatorios([]);
    } finally {
      setLoading(false);
    }
  };

  const apiVariables = config.apiVariables || {};

  const addVariable = () => {
    const newVars = { ...apiVariables };
    const newKey = `variavel_${Object.keys(newVars).length + 1}`;
    newVars[newKey] = { value: "", type: "string" };
    handleConfigChange({ apiVariables: newVars });
  };

  const updateVariableKey = (oldKey: string, newKey: string) => {
    if (oldKey === newKey) return;
    const newVars = { ...apiVariables };
    newVars[newKey] = newVars[oldKey];
    delete newVars[oldKey];
    handleConfigChange({ apiVariables: newVars });
  };

  const updateVariableValue = (key: string, value: string) => {
    const newVars = { ...apiVariables };
    const currentVar = newVars[key];
    newVars[key] = typeof currentVar === 'object' ? { ...currentVar, value } : { value, type: "string" };
    handleConfigChange({ apiVariables: newVars });
  };

  const updateVariableType = (key: string, type: string) => {
    const newVars = { ...apiVariables };
    const currentVar = newVars[key];
    newVars[key] = typeof currentVar === 'object' ? { ...currentVar, type } : { value: currentVar || "", type };
    handleConfigChange({ apiVariables: newVars });
  };

  const removeVariable = (key: string) => {
    const newVars = { ...apiVariables };
    delete newVars[key];
    handleConfigChange({ apiVariables: newVars });
  };

  if (loading) {
    return <div className="p-4 text-center text-muted-foreground">Carregando relatórios...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Relatório</Label>
        <Select
          value={config.relatorioId || ""}
          onValueChange={(value) => handleConfigChange({ relatorioId: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione um relatório" />
          </SelectTrigger>
          <SelectContent>
            {relatorios.length === 0 ? (
              <div className="p-2 text-sm text-muted-foreground text-center">
                Nenhum relatório cadastrado
              </div>
            ) : (
              relatorios.map((rel) => (
                <SelectItem key={rel.id} value={rel.id}>
                  {rel.nome}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Selecione o modelo de relatório que será gerado
        </p>
      </div>

      <div className="space-y-3 border-t pt-4">
        <div className="flex items-center justify-between">
          <Label className="font-semibold">Variáveis da API</Label>
          <Button
            size="sm"
            variant="outline"
            onClick={addVariable}
            className="h-7"
          >
            <Plus className="h-3 w-3 mr-1" />
            Adicionar
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Configure as variáveis que serão enviadas para a API do relatório
        </p>

        <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
          {Object.entries(apiVariables).length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4 border-2 border-dashed rounded">
              Nenhuma variável configurada
            </div>
          ) : (
            Object.entries(apiVariables).map(([key, varData]) => {
              const isVarObject = typeof varData === 'object' && varData !== null && 'value' in varData;
              const value = isVarObject ? (varData as VariableData).value : String(varData);
              const type = isVarObject ? (varData as VariableData).type : 'string';
              
              return (
                <div key={key} className="flex gap-2 items-start p-2 bg-muted/50 rounded">
                  <div className="flex-1 space-y-2">
                    <Input
                      placeholder="Nome da variável"
                      value={key}
                      onChange={(e) => updateVariableKey(key, e.target.value)}
                      className="h-8 text-xs"
                    />
                    <Select
                      value={type}
                      onValueChange={(newType) => updateVariableType(key, newType)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="string">String</SelectItem>
                        <SelectItem value="number">Número</SelectItem>
                        <SelectItem value="boolean">Booleano</SelectItem>
                        <SelectItem value="date">Data</SelectItem>
                        <SelectItem value="array">Array</SelectItem>
                        <SelectItem value="object">Objeto</SelectItem>
                      </SelectContent>
                    </Select>
                    <RichTextEditor
                      value={value}
                      onChange={(newValue) => updateVariableValue(key, newValue)}
                      placeholder="Valor da variável"
                      multiline={false}
                      nodes={nodes}
                      edges={edges}
                      selectedNode={selectedNode}
                      showFormatting={false}
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeVariable(key)}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="space-y-2 border-t pt-4">
        <Label>Variável de saída</Label>
        <RichTextEditor
          value={config.outputVariable || "relatorio_gerado"}
          onChange={(value) => handleConfigChange({ outputVariable: value })}
          placeholder="relatorio_gerado"
          multiline={false}
          nodes={nodes}
          edges={edges}
          selectedNode={selectedNode}
          showFormatting={false}
        />
        <p className="text-xs text-muted-foreground">
          Esta variável receberá "Sucesso" após o relatório ser gerado e anexado ao chat
        </p>
      </div>
    </div>
  );
};
