import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Hourglass, Smile } from "lucide-react";
import { useRef, useState } from "react";

interface Props {
  enabled: boolean;
  message: string;
  defaultMessage: string;
  onChange: (patch: { waitingMessageEnabled?: boolean; waitingMessage?: string }) => void;
}

// Ícones/emojis prontos para inserir no campo de "aguarde..."
const ICON_PRESETS: { label: string; char: string }[] = [
  { label: "Ampulheta", char: "⏳" },
  { label: "Relógio", char: "⌛" },
  { label: "Hora", char: "⏰" },
  { label: "Carregando", char: "🔄" },
  { label: "Engrenagem", char: "⚙️" },
  { label: "Foguete", char: "🚀" },
  { label: "Raio", char: "⚡" },
  { label: "Estrela", char: "⭐" },
  { label: "Lâmpada", char: "💡" },
  { label: "Robô", char: "🤖" },
  { label: "Magia", char: "✨" },
  { label: "Fogo", char: "🔥" },
  { label: "Documento", char: "📄" },
  { label: "Relatório", char: "📊" },
  { label: "Gráfico", char: "📈" },
  { label: "Pasta", char: "📁" },
  { label: "Anexo", char: "📎" },
  { label: "Caixa", char: "📦" },
  { label: "Imagem", char: "🖼️" },
  { label: "Câmera", char: "📷" },
  { label: "Vídeo", char: "🎬" },
  { label: "Paleta", char: "🎨" },
  { label: "Mensagem", char: "💬" },
  { label: "Sino", char: "🔔" },
  { label: "Check", char: "✅" },
  { label: "Coração", char: "❤️" },
  { label: "Joia", char: "💎" },
  { label: "Mão", char: "👉" },
];

/**
 * Campo padrão para a mensagem de "Aguarde..." que o bot envia
 * imediatamente antes de gerar/enviar um conteúdo pesado (catálogo,
 * relatório, mídia IA, etc.). Pode ser ligado/desligado pelo usuário.
 */
export const WaitingMessageField = ({ enabled, message, defaultMessage, onChange }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const insertIcon = (icon: string) => {
    const input = inputRef.current;
    const current = message || "";
    if (!input) {
      onChange({ waitingMessage: current + icon });
      return;
    }
    const start = input.selectionStart ?? current.length;
    const end = input.selectionEnd ?? current.length;
    const next = current.slice(0, start) + icon + current.slice(end);
    onChange({ waitingMessage: next });
    // restaurar cursor após o ícone inserido
    setTimeout(() => {
      input.focus();
      const pos = start + icon.length;
      input.setSelectionRange(pos, pos);
    }, 0);
  };

  return (
    <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
      <div className="flex items-center justify-between gap-3">
        <Label className="text-xs flex items-center gap-1.5 cursor-pointer">
          <Hourglass className="h-3.5 w-3.5 text-muted-foreground" />
          Enviar mensagem de "aguarde..." antes
        </Label>
        <Switch
          checked={enabled}
          onCheckedChange={(v) => onChange({ waitingMessageEnabled: !!v })}
        />
      </div>
      {enabled && (
        <div className="flex items-center gap-2">
          <Input
            ref={inputRef}
            value={message}
            onChange={(e) => onChange({ waitingMessage: e.target.value })}
            placeholder={defaultMessage}
            className="h-8 text-xs flex-1"
          />
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-2 shrink-0"
                title="Inserir ícone"
              >
                <Smile className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 p-2">
              <p className="text-[10px] text-muted-foreground mb-2 px-1">
                Clique para inserir no texto
              </p>
              <div className="grid grid-cols-7 gap-1">
                {ICON_PRESETS.map((icon) => (
                  <button
                    key={icon.char}
                    type="button"
                    title={icon.label}
                    onClick={() => insertIcon(icon.char)}
                    className="h-8 w-8 flex items-center justify-center rounded hover:bg-muted text-base transition-colors"
                  >
                    {icon.char}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}
      <p className="text-[10px] text-muted-foreground leading-tight">
        Mensagem enviada ao contato enquanto o conteúdo é gerado em tempo real.
        {enabled && !message && (
          <> Se vazio, será usado: <span className="italic">"{defaultMessage}"</span>.</>
        )}
      </p>
    </div>
  );
};

export default WaitingMessageField;
