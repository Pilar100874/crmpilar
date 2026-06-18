import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Hourglass } from "lucide-react";

interface Props {
  enabled: boolean;
  message: string;
  defaultMessage: string;
  onChange: (patch: { waitingMessageEnabled?: boolean; waitingMessage?: string }) => void;
}

/**
 * Campo padrão para a mensagem de "Aguarde..." que o bot envia
 * imediatamente antes de gerar/enviar um conteúdo pesado (catálogo,
 * relatório, mídia IA, etc.). Pode ser ligado/desligado pelo usuário.
 */
export const WaitingMessageField = ({ enabled, message, defaultMessage, onChange }: Props) => {
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
        <Input
          value={message}
          onChange={(e) => onChange({ waitingMessage: e.target.value })}
          placeholder={defaultMessage}
          className="h-8 text-xs"
        />
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
