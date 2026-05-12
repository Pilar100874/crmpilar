import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { MessageCircle, Plus, Trash2 } from "lucide-react";

interface ConfigProps {
  config: any;
  handleConfigChange: (key: string, value: any) => void;
}

export const SendWhatsappToNumberConfig = ({ config, handleConfigChange }: ConfigProps) => {
  const phoneNumbers: string[] = Array.isArray(config.phoneNumbers)
    ? config.phoneNumbers
    : config.phoneNumber
      ? [config.phoneNumber]
      : [""];

  const updateNumbers = (next: string[]) => {
    handleConfigChange("phoneNumbers", next);
  };

  return (
    <div className="space-y-4">
      <Alert>
        <MessageCircle className="h-4 w-4" />
        <AlertDescription className="text-xs">
          Envia uma mensagem WhatsApp para um ou mais números. Você pode usar variáveis (ex.: <code>{"{{telefone}}"}</code>, <code>{"{{nome}}"}</code>) tanto nos números quanto no texto.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label>Números de destino (com DDI)</Label>
        {phoneNumbers.map((num, idx) => (
          <div key={idx} className="flex gap-2">
            <Input
              value={num}
              onChange={(e) => {
                const next = [...phoneNumbers];
                next[idx] = e.target.value;
                updateNumbers(next);
              }}
              placeholder="Ex: 5511999999999 ou {{telefone}}"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => {
                const next = phoneNumbers.filter((_, i) => i !== idx);
                updateNumbers(next.length ? next : [""]);
              }}
              disabled={phoneNumbers.length === 1 && !phoneNumbers[0]}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => updateNumbers([...phoneNumbers, ""])}
        >
          <Plus className="h-4 w-4 mr-1" /> Adicionar número
        </Button>
        <p className="text-[11px] text-muted-foreground">Use o formato internacional sem +, espaços ou traços. A mensagem será enviada para cada número da lista.</p>
      </div>

      <div className="space-y-2">
        <Label>Mensagem</Label>
        <Textarea
          value={config.message || ""}
          onChange={(e) => handleConfigChange("message", e.target.value)}
          placeholder="Olá {{nome}}, tudo bem?"
          rows={5}
        />
      </div>

      <div className="space-y-2">
        <Label>Mídia (opcional)</Label>
        <Input
          value={config.mediaUrl || ""}
          onChange={(e) => handleConfigChange("mediaUrl", e.target.value)}
          placeholder="URL da imagem/vídeo/PDF (opcional)"
        />
      </div>

      <div className="flex items-center justify-between rounded-md border p-3">
        <div className="space-y-0.5">
          <Label className="text-sm">Aguardar resposta?</Label>
          <p className="text-[11px] text-muted-foreground">Pausa o fluxo até o destinatário responder.</p>
        </div>
        <Switch
          checked={!!config.waitForReply}
          onCheckedChange={(v) => handleConfigChange("waitForReply", v)}
        />
      </div>

      <div className="space-y-2">
        <Label>Variável de saída (status)</Label>
        <Input
          value={config.outputVariable || "envio_whatsapp_status"}
          onChange={(e) => handleConfigChange("outputVariable", e.target.value)}
          placeholder="envio_whatsapp_status"
        />
      </div>
    </div>
  );
};
