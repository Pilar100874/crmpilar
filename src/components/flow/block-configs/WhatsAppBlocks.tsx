import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { VariableTextarea } from "../VariableInput";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { Card } from "@/components/ui/card";

interface ConfigProps {
  config: any;
  handleConfigChange: (key: string, value: any) => void;
  inputRefs: any;
  openVariablePicker: (ref: any) => void;
}

// Keyword Options - Carrossel de Imagens (seção 9 do manual)
export const KeywordOptionsConfig = ({ config, handleConfigChange, inputRefs, openVariablePicker }: ConfigProps) => {
  const addOption = () => {
    const options = config.options || [];
    handleConfigChange("options", [...options, { title: "", description: "", imageUrl: "", value: "" }]);
  };

  const updateOption = (index: number, field: string, value: string) => {
    const options = [...(config.options || [])];
    options[index] = { ...options[index], [field]: value };
    handleConfigChange("options", options);
  };

  const removeOption = (index: number) => {
    const options = [...(config.options || [])];
    options.splice(index, 1);
    handleConfigChange("options", options);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Pergunta</Label>
        <VariableTextarea
          name="question"
          ref={(el) => (inputRefs.current['question'] = el)}
          value={config.question || ""}
          onChange={(e) => handleConfigChange("question", e.target.value)}
          onVariableRequest={() => openVariablePicker(inputRefs.current['question'])}
          placeholder="Escolha uma opção..."
          rows={2}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Opções do Carrossel</Label>
          <Button variant="outline" size="sm" onClick={addOption}>
            <Plus className="w-4 h-4 mr-1" />
            Opção
          </Button>
        </div>

        <div className="space-y-2">
          {(config.options || []).map((option: any, index: number) => (
            <Card key={index} className="p-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">Opção {index + 1}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeOption(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <Input
                    value={option.title || ""}
                    onChange={(e) => updateOption(index, "title", e.target.value)}
                    placeholder="Título da opção *"
                  />

                  <Input
                    value={option.description || ""}
                    onChange={(e) => updateOption(index, "description", e.target.value)}
                    placeholder="Descrição (opcional)"
                  />

                  <Input
                    value={option.imageUrl || ""}
                    onChange={(e) => updateOption(index, "imageUrl", e.target.value)}
                    placeholder="URL da imagem *"
                  />

                  <Input
                    value={option.value || option.title}
                    onChange={(e) => updateOption(index, "value", e.target.value)}
                    placeholder="Valor armazenado (padrão: título)"
                    className="text-xs"
                  />
                </div>
              </div>
            </Card>
          ))}

          {(!config.options || config.options.length === 0) && (
            <p className="text-xs text-muted-foreground text-center py-6 border-2 border-dashed rounded">
              Adicione opções para criar o carrossel de imagens
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Variável para Salvar Escolha *</Label>
        <Input
          value={config.variable || ""}
          onChange={(e) => handleConfigChange("variable", e.target.value)}
          placeholder="picture_choice"
          required
        />
        <p className="text-xs text-muted-foreground">
          A escolha do usuário será salva em {"{{"}{config.variable || "variavel"}{"}}"}
        </p>
      </div>
    </div>
  );
};

// Message Template - Templates do WhatsApp
export const MessageTemplateConfig = ({ config, handleConfigChange }: ConfigProps) => (
  <div className="space-y-4">
    <div className="bg-info/10 border border-info/20 rounded-lg p-3 mb-4">
      <p className="text-xs text-info-foreground">
        ℹ️ Templates de mensagem devem ser pré-aprovados pelo WhatsApp Business API
      </p>
    </div>

    <div className="space-y-2">
      <Label>Nome do Template *</Label>
      <Input
        value={config.templateName || ""}
        onChange={(e) => handleConfigChange("templateName", e.target.value)}
        placeholder="nome_do_template"
        required
      />
      <p className="text-xs text-muted-foreground">
        Use o nome exato do template aprovado no WhatsApp
      </p>
    </div>

    <div className="space-y-2">
      <Label>Idioma</Label>
      <Input
        value={config.language || "pt_BR"}
        onChange={(e) => handleConfigChange("language", e.target.value)}
        placeholder="pt_BR"
      />
    </div>

    <div className="space-y-2">
      <Label>Parâmetros do Template (JSON)</Label>
      <Textarea
        value={config.parameters || '[\n  "{{name}}",\n  "{{date}}"\n]'}
        onChange={(e) => handleConfigChange("parameters", e.target.value)}
        placeholder='["valor1", "valor2"]'
        rows={6}
        className="font-mono text-xs"
      />
      <p className="text-xs text-muted-foreground">
        Use {"{{"} variavel {"}"} para valores dinâmicos
      </p>
    </div>
  </div>
);

// Opt-in/out - Gerenciamento de Consentimento
export const OptInOutConfig = ({ config, handleConfigChange }: ConfigProps) => (
  <div className="space-y-4">
    <div className="space-y-2">
      <Label>Ação</Label>
      <select
        value={config.action || "opt-in"}
        onChange={(e) => handleConfigChange("action", e.target.value)}
        className="w-full px-3 py-2 border rounded-md"
      >
        <option value="opt-in">Opt-in (Aceitar)</option>
        <option value="opt-out">Opt-out (Recusar)</option>
      </select>
    </div>

    <div className="space-y-2">
      <Label>Categoria</Label>
      <Input
        value={config.category || "marketing"}
        onChange={(e) => handleConfigChange("category", e.target.value)}
        placeholder="marketing, newsletter, etc"
      />
    </div>

    <div className="space-y-2">
      <Label>Mensagem de Confirmação</Label>
      <Textarea
        value={config.confirmationMessage || ""}
        onChange={(e) => handleConfigChange("confirmationMessage", e.target.value)}
        placeholder="Obrigado! Você aceitou receber nossas comunicações."
        rows={3}
      />
    </div>

    <div className="space-y-2">
      <Label>Variável de Status (opcional)</Label>
      <Input
        value={config.statusVariable || ""}
        onChange={(e) => handleConfigChange("statusVariable", e.target.value)}
        placeholder="consent_status"
      />
    </div>
  </div>
);

// Opt-in Check - Verificar Consentimento
export const OptInCheckConfig = ({ config, handleConfigChange }: ConfigProps) => (
  <div className="space-y-4">
    <div className="space-y-2">
      <Label>Categoria para Verificar</Label>
      <Input
        value={config.category || "marketing"}
        onChange={(e) => handleConfigChange("category", e.target.value)}
        placeholder="marketing"
      />
    </div>

    <div className="bg-info/10 border border-info/20 rounded-lg p-3">
      <p className="text-xs text-info-foreground mb-2">
        ℹ️ Este bloco verifica se o usuário já deu consentimento
      </p>
      <p className="text-xs text-muted-foreground">
        • Saída VERDE: Usuário tem consentimento<br />
        • Saída ROSA: Usuário não tem consentimento
      </p>
    </div>
  </div>
);

// Audience - Segmentação de Audiência
export const AudienceConfig = ({ config, handleConfigChange }: ConfigProps) => {
  const addSegment = () => {
    const segments = config.segments || [];
    handleConfigChange("segments", [...segments, ""]);
  };

  const updateSegment = (index: number, value: string) => {
    const segments = [...(config.segments || [])];
    segments[index] = value;
    handleConfigChange("segments", segments);
  };

  const removeSegment = (index: number) => {
    const segments = [...(config.segments || [])];
    segments.splice(index, 1);
    handleConfigChange("segments", segments);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Ação</Label>
        <select
          value={config.action || "add"}
          onChange={(e) => handleConfigChange("action", e.target.value)}
          className="w-full px-3 py-2 border rounded-md"
        >
          <option value="add">Adicionar aos Segmentos</option>
          <option value="remove">Remover dos Segmentos</option>
        </select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Segmentos</Label>
          <Button variant="outline" size="sm" onClick={addSegment}>
            <Plus className="w-4 h-4 mr-1" />
            Segmento
          </Button>
        </div>

        <div className="space-y-2">
          {(config.segments || []).map((segment: string, index: number) => (
            <div key={index} className="flex gap-2">
              <Input
                value={segment}
                onChange={(e) => updateSegment(index, e.target.value)}
                placeholder="Nome do segmento"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeSegment(index)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}

          {(!config.segments || config.segments.length === 0) && (
            <p className="text-xs text-muted-foreground text-center py-4">
              Adicione segmentos para organizar sua audiência
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
