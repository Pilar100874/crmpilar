import { ConfigSection, ConfigSwitch } from "./ConfigField";
import { FormattingToolbar } from "./FormattingToolbar";
import { Textarea } from "@/components/ui/textarea";
import { EmojiPickerButton } from "./EmojiPickerButton";
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
          <div className="flex items-start gap-2">
            <Textarea
              ref={textareaRef}
              value={config.message || "Mensagem de despedida"}
              onChange={(e) => handleConfigChange("message", e.target.value)}
              placeholder="Digite sua mensagem de despedida"
              rows={4}
              className="flex-1 resize-none bg-white border-border text-foreground placeholder:text-muted-foreground focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
            <EmojiPickerButton
              targetRef={textareaRef as any}
              value={config.message || ""}
              onChange={(v) => handleConfigChange("message", v)}
            />
          </div>
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
              {[
                { key: "socialWhatsApp", label: "WhatsApp" },
                { key: "socialInstagram", label: "Instagram" },
                { key: "socialFacebook", label: "Facebook" },
                { key: "socialWebsite", label: "Website" },
                { key: "socialTiktok", label: "TikTok" },
                { key: "socialYoutube", label: "YouTube" },
                { key: "socialLinkedin", label: "LinkedIn" },
                { key: "socialTelegram", label: "Telegram" },
                { key: "socialTwitter", label: "X (Twitter)" },
                { key: "socialThreads", label: "Threads" },
                { key: "socialPinterest", label: "Pinterest" },
              ].map((s) => (
                <ConfigSwitch
                  key={s.key}
                  label={s.label}
                  checked={config[s.key] === true}
                  onChange={(checked) => handleConfigChange(s.key, checked)}
                />
              ))}
              <p className="text-xs text-muted-foreground pt-2">
                💡 Os links são configurados em <strong>Marketing → Links das Redes Sociais</strong>. Apenas botões com link cadastrado serão exibidos.
              </p>
            </div>
          )}
        </div>
      </ConfigSection>
    </div>
  );
};
