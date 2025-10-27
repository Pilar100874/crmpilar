import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RichTextEditor } from "../RichTextEditor";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ConfigProps {
  config: any;
  handleConfigChange: (key: string, value: any) => void;
  inputRefs?: any;
  openVariablePicker?: (ref: any) => void;
  nodes?: any[];
  edges?: any[];
  selectedNode?: any;
}

// Conditions - Lógica Condicional (seção 14 do manual)
export const ConditionConfig = ({ config, handleConfigChange }: ConfigProps) => {
  const addCondition = () => {
    const conditions = config.conditions || [];
    handleConfigChange("conditions", [...conditions, { 
      id: `cond_${Date.now()}`,
      variable: "", 
      operator: "equals", 
      value: "", 
      label: "" 
    }]);
  };

  const updateCondition = (index: number, field: string, value: string) => {
    const conditions = [...(config.conditions || [])];
    conditions[index] = { ...conditions[index], [field]: value };
    handleConfigChange("conditions", conditions);
  };

  const removeCondition = (index: number) => {
    const conditions = [...(config.conditions || [])];
    conditions.splice(index, 1);
    handleConfigChange("conditions", conditions);
  };

  return (
    <div className="space-y-4">
      <div className="bg-info/10 border border-info/20 rounded-lg p-3">
        <p className="text-xs text-info-foreground">
          ℹ️ As condições são avaliadas em ordem. A primeira verdadeira será executada.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Condições</Label>
          <Button variant="outline" size="sm" onClick={addCondition}>
            <Plus className="w-4 h-4 mr-1" />
            Condição
          </Button>
        </div>

        {(config.conditions || []).map((condition: any, index: number) => (
          <Card key={index} className="p-3">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="outline">Condição {index + 1}</Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeCondition(index)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Variável</Label>
                <Input
                  value={condition.variable || ""}
                  onChange={(e) => updateCondition(index, "variable", e.target.value)}
                  placeholder="nome_da_variavel (sem {{}})"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Operador</Label>
                <Select
                  value={condition.operator || "equals"}
                  onValueChange={(v) => updateCondition(index, "operator", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equals">Igual a (=)</SelectItem>
                    <SelectItem value="not_equals">Diferente de (≠)</SelectItem>
                    <SelectItem value="contains">Contém</SelectItem>
                    <SelectItem value="not_contains">Não Contém</SelectItem>
                    <SelectItem value="greater">Maior que (&gt;)</SelectItem>
                    <SelectItem value="less">Menor que (&lt;)</SelectItem>
                    <SelectItem value="greater_equal">Maior ou igual (≥)</SelectItem>
                    <SelectItem value="less_equal">Menor ou igual (≤)</SelectItem>
                    <SelectItem value="is_set">Está definida</SelectItem>
                    <SelectItem value="is_not_set">Não está definida</SelectItem>
                    <SelectItem value="starts_with">Começa com</SelectItem>
                    <SelectItem value="ends_with">Termina com</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {condition.operator !== "is_set" && condition.operator !== "is_not_set" && (
                <div className="space-y-2">
                  <Label className="text-xs">Valor</Label>
                  <Input
                    value={condition.value || ""}
                    onChange={(e) => updateCondition(index, "value", e.target.value)}
                    placeholder="valor ou {{outra_variavel}}"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs">Label da Saída (opcional)</Label>
                <Input
                  value={condition.label || ""}
                  onChange={(e) => updateCondition(index, "label", e.target.value)}
                  placeholder="Ex: Desktop, Mobile, etc"
                />
              </div>

              <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                Se <code>{condition.variable || "variavel"}</code>{" "}
                {condition.operator === "equals" && "="}
                {condition.operator === "not_equals" && "≠"}
                {condition.operator === "contains" && "contém"}
                {condition.operator === "not_contains" && "não contém"}
                {condition.operator === "greater" && ">"}
                {condition.operator === "less" && "<"}
                {condition.operator === "greater_equal" && "≥"}
                {condition.operator === "less_equal" && "≤"}
                {condition.operator === "is_set" && "está definida"}
                {condition.operator === "is_not_set" && "não está definida"}
                {condition.operator === "starts_with" && "começa com"}
                {condition.operator === "ends_with" && "termina com"}
                {condition.operator !== "is_set" && condition.operator !== "is_not_set" && (
                  <> <code>{condition.value || "valor"}</code></>
                )}
              </div>
            </div>
          </Card>
        ))}

        {(!config.conditions || config.conditions.length === 0) && (
          <p className="text-xs text-muted-foreground text-center py-6 border-2 border-dashed rounded">
            Adicione condições para ramificar o fluxo
          </p>
        )}
      </div>

      <div className="bg-warning/10 border border-warning/20 rounded-lg p-3 mt-4">
        <p className="text-xs font-medium mb-1">📌 Saída Padrão (Fallback)</p>
        <p className="text-xs text-muted-foreground">
          Arraste uma conexão da saída rosa/padrão para quando nenhuma condição for verdadeira
        </p>
      </div>
    </div>
  );
};

// Set a Field - Definir Variáveis
export const SetFieldConfig = ({ config, handleConfigChange, inputRefs, openVariablePicker }: ConfigProps) => {
  const addOperation = () => {
    const operations = config.operations || [];
    handleConfigChange("operations", [...operations, { variable: "", value: "", operation: "set" }]);
  };

  const updateOperation = (index: number, field: string, value: string) => {
    const operations = [...(config.operations || [])];
    operations[index] = { ...operations[index], [field]: value };
    handleConfigChange("operations", operations);
  };

  const removeOperation = (index: number) => {
    const operations = [...(config.operations || [])];
    operations.splice(index, 1);
    handleConfigChange("operations", operations);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Operações</Label>
          <Button variant="outline" size="sm" onClick={addOperation}>
            <Plus className="w-4 h-4 mr-1" />
            Operação
          </Button>
        </div>

        {(config.operations || []).map((operation: any, index: number) => (
          <Card key={index} className="p-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">Operação {index + 1}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeOperation(index)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Tipo</Label>
                <Select
                  value={operation.operation || "set"}
                  onValueChange={(v) => updateOperation(index, "operation", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="set">Definir</SelectItem>
                    <SelectItem value="unset">Limpar</SelectItem>
                    <SelectItem value="increment">Incrementar (+)</SelectItem>
                    <SelectItem value="decrement">Decrementar (-)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Variável</Label>
                <Input
                  value={operation.variable || ""}
                  onChange={(e) => updateOperation(index, "variable", e.target.value)}
                  placeholder="nome_variavel"
                />
              </div>

              {operation.operation !== "unset" && (
                <div className="space-y-2">
                  <Label className="text-xs">Valor</Label>
                  <RichTextEditor
                    value={operation.value || ""}
                    onChange={(text) => updateOperation(index, "value", text)}
                    placeholder="valor ou {{outra_variavel}}"
                    multiline={true}
                  />
                </div>
              )}
            </div>
          </Card>
        ))}

        {(!config.operations || config.operations.length === 0) && (
          <p className="text-xs text-muted-foreground text-center py-4">
            Adicione operações para manipular variáveis
          </p>
        )}
      </div>
    </div>
  );
};

// Keyword Jump - Pular por Palavra-chave
export const KeywordJumpConfig = ({ config, handleConfigChange }: ConfigProps) => {
  const addKeyword = () => {
    const keywords = config.keywords || [];
    handleConfigChange("keywords", [...keywords, { keyword: "", targetNodeId: "", caseSensitive: false }]);
  };

  const updateKeyword = (index: number, field: string, value: any) => {
    const keywords = [...(config.keywords || [])];
    keywords[index] = { ...keywords[index], [field]: value };
    handleConfigChange("keywords", keywords);
  };

  const removeKeyword = (index: number) => {
    const keywords = [...(config.keywords || [])];
    keywords.splice(index, 1);
    handleConfigChange("keywords", keywords);
  };

  return (
    <div className="space-y-4">
      <div className="bg-info/10 border border-info/20 rounded-lg p-3">
        <p className="text-xs text-info-foreground">
          ℹ️ Detecta palavras-chave específicas e pula para um bloco diferente
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Palavras-chave</Label>
          <Button variant="outline" size="sm" onClick={addKeyword}>
            <Plus className="w-4 h-4 mr-1" />
            Palavra-chave
          </Button>
        </div>

        {(config.keywords || []).map((keyword: any, index: number) => (
          <Card key={index} className="p-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">Palavra-chave {index + 1}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeKeyword(index)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <Input
                value={keyword.keyword || ""}
                onChange={(e) => updateKeyword(index, "keyword", e.target.value)}
                placeholder="palavra ou frase"
              />

              <Input
                value={keyword.targetNodeId || ""}
                onChange={(e) => updateKeyword(index, "targetNodeId", e.target.value)}
                placeholder="ID do bloco destino"
              />

              <div className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={keyword.caseSensitive || false}
                  onChange={(e) => updateKeyword(index, "caseSensitive", e.target.checked)}
                />
                <span>Case sensitive</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

// Global Keywords
export const GlobalKeywordsConfig = ({ config, handleConfigChange }: ConfigProps) => {
  return (
    <div className="space-y-4">
      <div className="bg-warning/10 border border-warning/20 rounded-lg p-3">
        <p className="text-xs font-medium mb-1">⚠️ Palavras-chave Globais</p>
        <p className="text-xs text-muted-foreground">
          Estas palavras-chave funcionam em qualquer ponto da conversa
        </p>
      </div>

      <Textarea
        value={config.keywords || ""}
        onChange={(e) => handleConfigChange("keywords", e.target.value)}
        placeholder="palavra1, palavra2, palavra3"
        rows={3}
      />

      <div className="space-y-2">
        <Label>Ação ao Detectar</Label>
        <Select
          value={config.action || "reset"}
          onValueChange={(v) => handleConfigChange("action", v)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="reset">Reiniciar Conversa</SelectItem>
            <SelectItem value="jump">Pular para Bloco</SelectItem>
            <SelectItem value="notify">Notificar</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {config.action === "jump" && (
        <div className="space-y-2">
          <Label>ID do Bloco Destino</Label>
          <Input
            value={config.targetNodeId || ""}
            onChange={(e) => handleConfigChange("targetNodeId", e.target.value)}
            placeholder="node_123"
          />
        </div>
      )}
    </div>
  );
};

// Formulas - Cálculos e Transformações
export const FormulasConfig = ({ config, handleConfigChange, inputRefs, openVariablePicker }: ConfigProps) => (
  <div className="space-y-4">
    <div className="space-y-2">
      <Label>Fórmula</Label>
      <RichTextEditor
        value={config.formula || ""}
        onChange={(text) => handleConfigChange("formula", text)}
        placeholder="{{price}} * 1.1"
        multiline={true}
      />
      <p className="text-xs text-muted-foreground">
        Exemplos: {"{{"} num1 {"}"} + {"{{"} num2 {"}"}, {"{{"} price {"}"} * 0.9, Math.round({"{{"} value {"}}"})
      </p>
    </div>

    <div className="space-y-2">
      <Label>Variável de Saída *</Label>
      <Input
        value={config.outputVariable || ""}
        onChange={(e) => handleConfigChange("outputVariable", e.target.value)}
        placeholder="resultado"
        required
      />
      <p className="text-xs text-muted-foreground">
        O resultado será salvo em {"{{"}{config.outputVariable || "variavel"}{"}}"}
      </p>
    </div>

    <div className="bg-info/10 border border-info/20 rounded-lg p-3">
      <p className="text-xs font-medium mb-2">💡 Operadores Disponíveis:</p>
      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <div>• + - * /</div>
        <div>• Math.round()</div>
        <div>• Math.floor()</div>
        <div>• Math.ceil()</div>
        <div>• Math.abs()</div>
        <div>• Math.pow()</div>
      </div>
    </div>
  </div>
);

// Jump To - Ir para Bloco
export const JumpToConfig = ({ config, handleConfigChange }: ConfigProps) => (
  <div className="space-y-4">
    <div className="space-y-2">
      <Label>ID do Bloco Destino *</Label>
      <Input
        value={config.targetNodeId || ""}
        onChange={(e) => handleConfigChange("targetNodeId", e.target.value)}
        placeholder="node_123"
        required
      />
      <p className="text-xs text-muted-foreground">
        O fluxo continuará a partir do bloco especificado
      </p>
    </div>
  </div>
);

// Lead Scoring - Pontuação de Leads
export const LeadScoringConfig = ({ config, handleConfigChange }: ConfigProps) => (
  <div className="space-y-4">
    <div className="space-y-2">
      <Label>Campo de Pontuação</Label>
      <Input
        value={config.scoreField || "lead_score"}
        onChange={(e) => handleConfigChange("scoreField", e.target.value)}
        placeholder="lead_score"
      />
    </div>

    <div className="space-y-2">
      <Label>Ação</Label>
      <Select
        value={config.action || "add"}
        onValueChange={(v) => handleConfigChange("action", v)}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="add">Adicionar Pontos</SelectItem>
          <SelectItem value="subtract">Subtrair Pontos</SelectItem>
          <SelectItem value="set">Definir Pontuação</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div className="space-y-2">
      <Label>Pontos</Label>
      <Input
        type="number"
        value={config.points || 0}
        onChange={(e) => handleConfigChange("points", parseInt(e.target.value))}
        placeholder="10"
      />
    </div>
  </div>
);

// Goal - Meta de Conversão
export const GoalConfig = ({ config, handleConfigChange }: ConfigProps) => (
  <div className="space-y-4">
    <div className="space-y-2">
      <Label>Nome da Meta *</Label>
      <Input
        value={config.goalName || ""}
        onChange={(e) => handleConfigChange("goalName", e.target.value)}
        placeholder="Assinatura Completa"
        required
      />
    </div>

    <div className="space-y-2">
      <Label>Valor da Conversão (opcional)</Label>
      <Input
        type="number"
        value={config.value || ""}
        onChange={(e) => handleConfigChange("value", parseFloat(e.target.value))}
        placeholder="0.00"
        step="0.01"
      />
    </div>

    <div className="bg-success/10 border border-success/20 rounded-lg p-3">
      <p className="text-xs text-success-foreground">
        ✓ Quando o fluxo atingir este bloco, a meta será marcada como concluída
      </p>
    </div>
  </div>
);
