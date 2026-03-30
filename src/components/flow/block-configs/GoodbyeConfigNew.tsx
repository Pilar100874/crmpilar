import { ConfigSection, ConfigSwitch } from "./ConfigField";
import { FormattingToolbar } from "./FormattingToolbar";
import { Textarea } from "@/components/ui/textarea";
import { useRef } from "react";

interface ConfigProps {
  config: any;
  handleConfigChange: (key: string, value: any) => void;
  inputRefs: any;
  openVariablePicker: (ref: any) => void;
}

export const GoodbyeConfigNew = ({ config, handleConfigChange, inputRefs, openVariablePicker }: ConfigProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertFormatting = (format: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = config.message || "";
    const selectedText = text.substring(start, end);

    let newText = text;
    let newCursorPos = start;

    switch (format) {
      case 'bold':
        newText = text.substring(0, start) + `*${selectedText}*` + text.substring(end);
        newCursorPos = start + (selectedText ? selectedText.length + 2 : 1);
        break;
      case 'italic':
        newText = text.substring(0, start) + `_${selectedText}_` + text.substring(end);
        newCursorPos = start + (selectedText ? selectedText.length + 2 : 1);
        break;
      case 'strikethrough':
        newText = text.substring(0, start) + `~${selectedText}~` + text.substring(end);
        newCursorPos = start + (selectedText ? selectedText.length + 2 : 1);
        break;
      case 'code':
        newText = text.substring(0, start) + `\`\`\`${selectedText}\`\`\`` + text.substring(end);
        newCursorPos = start + (selectedText ? selectedText.length + 6 : 3);
        break;
    }

    handleConfigChange("message", newText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  return (
    <div className="space-y-6">
      <ConfigSection title="Mensagem de Despedida">
        <div className="space-y-3">
          <Textarea
            ref={textareaRef}
            value={config.message || "Mensagem de despedida"}
            onChange={(e) => handleConfigChange("message", e.target.value)}
            placeholder="Digite sua mensagem de despedida"
            rows={4}
            className="resize-none bg-white border-border text-foreground placeholder:text-muted-foreground focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
          <FormattingToolbar 
            onFormat={insertFormatting}
            onVariableClick={() => openVariablePicker(textareaRef.current)}
          />
        </div>
      </ConfigSection>

      <ConfigSection title="Opções">
        <div className="space-y-4">
          <ConfigSwitch
            label="Botão Recomeçar"
            checked={config.showStartAgainButton !== false}
            onChange={(checked) => handleConfigChange("showStartAgainButton", checked)}
            info="Permite que o usuário recomece a conversa voltando à primeira mensagem do fluxo"
          />

          <ConfigSwitch
            label="Mostrar Botões Sociais"
            checked={config.showSocialButtons === true}
            onChange={(checked) => handleConfigChange("showSocialButtons", checked)}
            info="Exibe botões com links das redes sociais configuradas"
          />
          
          {config.showSocialButtons && (
            <div className="ml-4 mt-3 space-y-3 border-l-2 border-primary/30 pl-4">
              <ConfigSwitch
                label="WhatsApp"
                checked={config.socialWhatsApp === true}
                onChange={(checked) => handleConfigChange("socialWhatsApp", checked)}
              />
              <ConfigSwitch
                label="Instagram"
                checked={config.socialInstagram === true}
                onChange={(checked) => handleConfigChange("socialInstagram", checked)}
              />
              <ConfigSwitch
                label="Facebook"
                checked={config.socialFacebook === true}
                onChange={(checked) => handleConfigChange("socialFacebook", checked)}
              />
              <ConfigSwitch
                label="Website"
                checked={config.socialWebsite === true}
                onChange={(checked) => handleConfigChange("socialWebsite", checked)}
              />
            </div>
          )}
        </div>
      </ConfigSection>
    </div>
  );
};
