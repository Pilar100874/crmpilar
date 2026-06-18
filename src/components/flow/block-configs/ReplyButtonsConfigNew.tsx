import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Info, Plus, GripVertical, Trash2 } from "lucide-react";
import { Bold, Italic } from "lucide-react";
import { VariableInput, VariableTextarea } from "@/components/flow/VariableInput";
import { MediaUrlUploadField } from "./MediaUrlUploadField";
import { EmojiPickerButton } from "./EmojiPickerButton";
import { useRef } from "react";



interface ConfigProps {
  config: any;
  handleConfigChange: (key: string, value: any) => void;
  inputRefs?: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement | null }>;
  openVariablePicker?: (ref: HTMLInputElement | HTMLTextAreaElement) => void;
}

export const ReplyButtonsConfigNew = ({ config, handleConfigChange, inputRefs, openVariablePicker }: ConfigProps) => {
  const buttons = config.buttons || [];
  const buttonRefs = useRef<(HTMLInputElement | null)[]>([]);


  const addButton = () => {
    handleConfigChange("buttons", [
      ...buttons,
      { id: Date.now(), label: "Botão", text: "Botão", value: "Botão" }
    ]);
  };

  const removeButton = (index: number) => {
    const newButtons = buttons.filter((_: any, i: number) => i !== index);
    handleConfigChange("buttons", newButtons);
  };

  const updateButtonText = (index: number, text: string) => {
    const newButtons = [...buttons];
    newButtons[index] = { ...newButtons[index], label: text, text: text, value: text };
    handleConfigChange("buttons", newButtons);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Imagem (opcional)</Label>
        <MediaUrlUploadField
          label=""
          value={config.image || ""}
          onChange={(url) => handleConfigChange("image", url)}
          placeholder="https://..."
          helperText="URL da imagem exibida acima dos botões. Você pode colar a URL ou fazer upload."
        />
      </div>


      <div className="space-y-2">
        <Label>Cabeçalho (opcional)</Label>
        <div className="flex items-start gap-2">
          <VariableTextarea
            ref={(el) => inputRefs && (inputRefs.current['header'] = el)}
            value={config.header || ""}
            onChange={(e) => handleConfigChange("header", e.target.value)}
            onVariableRequest={() => inputRefs?.current['header'] && openVariablePicker?.(inputRefs.current['header'])}
            placeholder="Máx. 20 caracteres"
            rows={3}
            maxLength={20}
            className="flex-1"
          />
          <EmojiPickerButton
            targetRef={{ current: inputRefs?.current['header'] || null } as any}
            value={config.header || ""}
            onChange={(v) => handleConfigChange("header", v)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Descrição (máx. 1024 caracteres)</Label>
        <div className="flex items-start gap-2">
          <VariableTextarea
            ref={(el) => inputRefs && (inputRefs.current['text'] = el)}
            value={config.text || ""}
            onChange={(e) => handleConfigChange("text", e.target.value)}
            onVariableRequest={() => inputRefs?.current['text'] && openVariablePicker?.(inputRefs.current['text'])}
            placeholder="Texto do corpo"
            rows={3}
            maxLength={1024}
            className="flex-1"
          />
          <EmojiPickerButton
            targetRef={{ current: inputRefs?.current['text'] || null } as any}
            value={config.text || ""}
            onChange={(v) => handleConfigChange("text", v)}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Bold className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Italic className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="ml-auto"
            onClick={() => inputRefs?.current['text'] && openVariablePicker?.(inputRefs.current['text'])}
          >
            Usar campo
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Rodapé (opcional)</Label>
        <div className="flex items-start gap-2">
          <VariableTextarea
            ref={(el) => inputRefs && (inputRefs.current['footer'] = el)}
            value={config.footer || ""}
            onChange={(e) => handleConfigChange("footer", e.target.value)}
            onVariableRequest={() => inputRefs?.current['footer'] && openVariablePicker?.(inputRefs.current['footer'])}
            placeholder="Máx. 60 caracteres"
            rows={3}
            maxLength={60}
            className="flex-1"
          />
          <EmojiPickerButton
            targetRef={{ current: inputRefs?.current['footer'] || null } as any}
            value={config.footer || ""}
            onChange={(v) => handleConfigChange("footer", v)}
          />
        </div>
      </div>


      <div className="space-y-3">
        <Label>Botões (até 3)</Label>
        
        {buttons.map((button: any, index: number) => (
          <div key={button.id || index} className="space-y-2">
            <div className="flex items-center gap-2">
              <VariableInput
                value={button.label || button.text || ""}
                onChange={(e) => updateButtonText(index, e.target.value)}
                onVariableRequest={() => {}}
                placeholder={`Botão ${index + 1}`}
                maxLength={20}
                className="flex-1"
              />
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={() => removeButton(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}

        <Button 
          variant="default" 
          size="lg" 
          onClick={addButton}
          className="w-full bg-muted-foreground hover:bg-foreground/80 text-white"
          disabled={buttons.length >= 3}
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar outro botão
        </Button>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
        <span className="text-xl">⚠️</span>
        <div className="text-sm space-y-1">
          <p className="font-semibold">Restrições de texto dos botões</p>
          <p>- Botões: máx. 20 caracteres</p>
          <p>- Texto formatado não permitido nos botões (exemplo *isso* para negrito)</p>
          <p>- Texto do corpo: máx. 1024 caracteres. Se você usar campos, o conteúdo do campo contará como caracteres adicionais e o texto será truncado.</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2">
            Salvar resposta do usuário no campo
            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
          </Label>
        </div>
        <VariableInput
          ref={(el) => inputRefs && (inputRefs.current['variable'] = el)}
          value={config.variable || ""}
          onChange={(e) => handleConfigChange("variable", e.target.value)}
          onVariableRequest={() => inputRefs?.current['variable'] && openVariablePicker?.(inputRefs.current['variable'])}
          placeholder="Pesquisar ou criar"
          className="bg-background"
        />
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          ⚠️ Se um campo não for definido, a resposta não será salva.
        </p>
      </div>
    </div>
  );
};
