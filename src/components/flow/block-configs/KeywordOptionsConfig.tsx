import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Info, Plus, GripVertical, Trash2 } from "lucide-react";
import { Bold, Italic, Smile, Code, Heading, List, ListOrdered, Link, Quote } from "lucide-react";
import { EmojiInput, EmojiTextarea } from "./EmojiFields";


interface ConfigProps {
  config: any;
  handleConfigChange: (key: string, value: any) => void;
  inputRefs: any;
  openVariablePicker: (ref: any) => void;
}

const RichTextToolbar = ({ onFormat }: { onFormat: (format: string) => void }) => (
  <div className="flex gap-1 mb-2 p-2 border rounded-md bg-muted/50">
    <Button variant="ghost" size="sm" onClick={() => onFormat('bold')} className="h-8 w-8 p-0">
      <Bold className="h-4 w-4" />
    </Button>
    <Button variant="ghost" size="sm" onClick={() => onFormat('italic')} className="h-8 w-8 p-0">
      <Italic className="h-4 w-4" />
    </Button>
    <Button variant="ghost" size="sm" onClick={() => onFormat('emoji')} className="h-8 w-8 p-0">
      <Smile className="h-4 w-4" />
    </Button>
    <Button variant="ghost" size="sm" onClick={() => onFormat('code')} className="h-8 w-8 p-0">
      <Code className="h-4 w-4" />
    </Button>
    <Button variant="ghost" size="sm" onClick={() => onFormat('heading')} className="h-8 w-8 p-0">
      <Heading className="h-4 w-4" />
    </Button>
    <Button variant="ghost" size="sm" onClick={() => onFormat('list')} className="h-8 w-8 p-0">
      <List className="h-4 w-4" />
    </Button>
    <Button variant="ghost" size="sm" onClick={() => onFormat('ordered')} className="h-8 w-8 p-0">
      <ListOrdered className="h-4 w-4" />
    </Button>
    <Button variant="ghost" size="sm" onClick={() => onFormat('link')} className="h-8 w-8 p-0">
      <Link className="h-4 w-4" />
    </Button>
    <Button variant="ghost" size="sm" onClick={() => onFormat('quote')} className="h-8 w-8 p-0">
      <Quote className="h-4 w-4" />
    </Button>
  </div>
);

export const KeywordOptionsConfig = ({ config, handleConfigChange, inputRefs, openVariablePicker }: ConfigProps) => {
  const buttons = config.buttons || [];

  const addButton = () => {
    handleConfigChange("buttons", [
      ...buttons,
      { id: Date.now(), label: "", keywords: [] }
    ]);
  };

  const updateButton = (index: number, field: string, value: any) => {
    const newButtons = [...buttons];
    newButtons[index] = { ...newButtons[index], [field]: value };
    handleConfigChange("buttons", newButtons);
  };

  const removeButton = (index: number) => {
    const newButtons = buttons.filter((_: any, i: number) => i !== index);
    handleConfigChange("buttons", newButtons);
  };

  const moveButton = (from: number, to: number) => {
    if (from === to || to < 0 || to >= buttons.length) return;
    const newButtons = [...buttons];
    const [moved] = newButtons.splice(from, 1);
    newButtons.splice(to, 0, moved);
    handleConfigChange("buttons", newButtons);
  };

  const onDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData("text/plain", String(index));
    e.dataTransfer.effectAllowed = "move";
  };
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  const onDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    const from = parseInt(e.dataTransfer.getData("text/plain"), 10);
    if (!isNaN(from)) moveButton(from, index);
  };

  const addKeyword = (buttonIndex: number) => {
    const newButtons = [...buttons];
    const keywords = newButtons[buttonIndex].keywords || [];
    newButtons[buttonIndex].keywords = [...keywords, ""];
    handleConfigChange("buttons", newButtons);
  };

  const updateKeyword = (buttonIndex: number, keywordIndex: number, value: string) => {
    const newButtons = [...buttons];
    newButtons[buttonIndex].keywords[keywordIndex] = value;
    handleConfigChange("buttons", newButtons);
  };

  const removeKeyword = (buttonIndex: number, keywordIndex: number) => {
    const newButtons = [...buttons];
    newButtons[buttonIndex].keywords = (newButtons[buttonIndex].keywords || []).filter((_: any, i: number) => i !== keywordIndex);
    handleConfigChange("buttons", newButtons);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Título (opcional)</Label>
        <Input
          value={config.title || ""}
          onChange={(e) => handleConfigChange("title", e.target.value)}
          placeholder="Ex: Atendimento"
        />
        <p className="text-xs text-muted-foreground">
          Aparece em negrito no topo da mensagem (WhatsApp).
        </p>
      </div>

      <div className="space-y-2">
        <Label>Texto da pergunta</Label>
        <Textarea
          ref={(el) => (inputRefs.current['question'] = el)}
          value={config.question || ""}
          onChange={(e) => handleConfigChange("question", e.target.value)}
          placeholder="Escolhas por número e palavra"
          rows={2}
          className="resize-none"
        />
        <RichTextToolbar onFormat={(fmt) => console.log('Format:', fmt)} />
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => openVariablePicker(inputRefs.current['question'])}
          className="w-full"
        >
          Usar campo
        </Button>
      </div>

      <div className="space-y-2">
        <Label>Rodapé (opcional)</Label>
        <Input
          value={config.footer || ""}
          onChange={(e) => handleConfigChange("footer", e.target.value)}
          placeholder="Ex: Pilar Papéis"
        />
      </div>

      <div className="space-y-3">
        <Label>Botões</Label>
        
        {buttons.map((button: any, index: number) => (
          <div
            key={button.id || index}
            draggable
            onDragStart={(e) => onDragStart(e, index)}
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e, index)}
            className="space-y-3 p-4 bg-pink-500/10 border-2 border-pink-500 rounded-lg"
          >
            <div className="flex items-center gap-2">
              <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
              <Input
                value={button.label || ""}
                onChange={(e) => updateButton(index, "label", e.target.value)}
                placeholder={`Texto do botão ${index + 1}`}
                className="flex-1"
              />
              <Button
                variant="ghost"
                size="icon"
                title="Mover para cima"
                onClick={() => moveButton(index, index - 1)}
                disabled={index === 0}
              >
                ↑
              </Button>
              <Button
                variant="ghost"
                size="icon"
                title="Mover para baixo"
                onClick={() => moveButton(index, index + 1)}
                disabled={index === buttons.length - 1}
              >
                ↓
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeButton(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="bg-muted rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="text-xs font-semibold">Palavras-chave ({index + 1})</span>
              </div>

              {(button.keywords || []).map((keyword: string, kIndex: number) => (
                <div key={kIndex} className="flex items-center gap-2">
                  <Input
                    value={keyword}
                    onChange={(e) => updateKeyword(index, kIndex, e.target.value)}
                    placeholder="Digite a palavra-chave"
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeKeyword(index, kIndex)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => addKeyword(index)}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar palavra-chave
              </Button>
            </div>
          </div>
        ))}

        <Button
          variant="default"
          size="lg"
          onClick={addButton}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar outro botão
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <Label>Mensagem de erro de validação</Label>
        <Switch 
          checked={config.showValidationError !== false}
          onCheckedChange={(checked) => handleConfigChange("showValidationError", checked)}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 text-foreground">
            Salvar resposta do usuário no campo
            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
          </Label>
        </div>
        <div className="relative">
          <Input
            value={config.variable || "opcao_escolhida"}
            onChange={(e) => handleConfigChange("variable", e.target.value)}
            placeholder="opcao_escolhida"
            className="bg-white border-border text-foreground"
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded">
            T
          </span>
        </div>
      </div>

      <div className="bg-blue-50 rounded-lg p-4 flex gap-3 border border-blue-200">
        <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-foreground/80">
          Este bloco apresenta opções com botões e palavras-chave, salvando a resposta escolhida no campo especificado.
        </p>
      </div>
    </div>
  );
};
