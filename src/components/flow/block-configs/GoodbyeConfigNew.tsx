import { ConfigSection, ConfigSwitch } from "./ConfigField";
import { FormattingToolbar } from "./FormattingToolbar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { EmojiPickerButton } from "./EmojiPickerButton";
import { Info } from "lucide-react";
import { useRef } from "react";

const GOODBYE_DEFAULT = "Até logo!";



interface ConfigProps {
  config: any;
  handleConfigChange: (key: string, value: any) => void;
  inputRefs: any;
  openVariablePicker: (ref: any) => void;
}

export const GoodbyeConfigNew = ({ config, handleConfigChange, inputRefs, openVariablePicker }: ConfigProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isCustom = typeof config.message === "string" && config.message.length > 0;
  const displayMessage = isCustom ? (config.message as string) : GOODBYE_DEFAULT;

  const toggleCustom = (on: boolean) => {
    handleConfigChange("message", on ? GOODBYE_DEFAULT : "");
  };



  const insertFormatting = (format: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = displayMessage;
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
          <div className="flex items-center justify-between gap-2">
            <Label className="text-sm font-medium">Texto enviado ao contato</Label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {isCustom ? "Personalizado" : "Padrão"}
              </span>
              <Switch checked={isCustom} onCheckedChange={toggleCustom} />
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Textarea
              ref={textareaRef}
              value={displayMessage}
              onChange={(e) => handleConfigChange("message", e.target.value)}
              placeholder="Digite sua mensagem de despedida"
              rows={4}
              disabled={!isCustom}
              className="flex-1 resize-none bg-white border-border text-foreground placeholder:text-muted-foreground focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
            {isCustom && (
              <EmojiPickerButton
                targetRef={textareaRef as any}
                value={config.message || ""}
                onChange={(v) => handleConfigChange("message", v)}
              />
            )}
          </div>
          {isCustom ? (
            <FormattingToolbar
              onFormat={insertFormatting}
              onVariableClick={() => openVariablePicker(textareaRef.current)}
            />
          ) : (
            <p className="text-xs text-muted-foreground flex items-start gap-1">
              <Info className="w-3 h-3 mt-0.5 shrink-0" />
              <span>Padrão: <em>"{GOODBYE_DEFAULT}"</em></span>
            </p>
          )}
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
