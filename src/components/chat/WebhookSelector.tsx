import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WebhookConfig, WebhookType } from "@/pages/ChatWebhook";
import { Label } from "@/components/ui/label";

interface WebhookSelectorProps {
  webhooks: WebhookConfig[];
  webhookTypes: WebhookType[];
  selectedWebhook: string | null;
  selectedType: string | null;
  onSelectWebhook: (id: string | null) => void;
  onSelectType: (type: string | null) => void;
}

export default function WebhookSelector({
  webhooks,
  webhookTypes,
  selectedWebhook,
  selectedType,
  onSelectWebhook,
  onSelectType,
}: WebhookSelectorProps) {
  return (
    <div className="flex gap-4 items-end">
      <div className="space-y-1 min-w-[180px]">
        <Label className="text-xs text-muted-foreground">Tipo de Webhook</Label>
        <Select value={selectedType || ""} onValueChange={(value) => {
          onSelectType(value);
          onSelectWebhook(null); // Reset webhook selection when type changes
        }}>
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="Selecione o tipo" />
          </SelectTrigger>
          <SelectContent>
            {webhookTypes.map((type) => (
              <SelectItem key={type.id} value={type.id}>
                {type.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1 min-w-[200px]">
        <Label className="text-xs text-muted-foreground">Webhook Ativo</Label>
        <Select
          value={selectedWebhook || ""}
          onValueChange={onSelectWebhook}
          disabled={!selectedType || webhooks.length === 0}
        >
          <SelectTrigger className="bg-background">
            <SelectValue placeholder={selectedType ? "Selecione o webhook" : "Selecione o tipo primeiro"} />
          </SelectTrigger>
          <SelectContent>
            {webhooks.map((webhook) => (
              <SelectItem key={webhook.id} value={webhook.id}>
                {webhook.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
