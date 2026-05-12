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
  return (
    <div className="space-y-4">
      <Alert>
        <MessageCircle className="h-4 w-4" />
        <AlertDescription className="text-xs">
          Envia uma mensagem WhatsApp para o número informado. Você pode usar variáveis (ex.: <code>{"{{telefone}}"}</code>, <code>{"{{nome}}"}</code>) tanto no número quanto no texto.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label>Número de destino (com DDI)</Label>
        <Input
          value={config.phoneNumber || ""}
          onChange={(e) => handleConfigChange("phoneNumber", e.target.value)}
          placeholder="Ex: 5511999999999 ou {{telefone}}"
        />
        <p className="text-[11px] text-muted-foreground">Use o formato internacional sem +, espaços ou traços.</p>
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
