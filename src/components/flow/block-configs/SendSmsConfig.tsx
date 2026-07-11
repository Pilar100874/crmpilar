import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { MessageSquareText, Plus, Trash2 } from "lucide-react";

interface ConfigProps {
  config: any;
  handleConfigChange: (key: string, value: any) => void;
}

export const SendSmsConfig = ({ config, handleConfigChange }: ConfigProps) => {
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
        <MessageSquareText className="h-4 w-4" />
        <AlertDescription className="text-xs">
          Envia SMS para um ou mais números pelo gateway configurado do estabelecimento.
          Você pode usar variáveis (ex.: <code>{"{{telefone}}"}</code>, <code>{"{{nome}}"}</code>) nos números e no texto.
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
        <p className="text-[11px] text-muted-foreground">
          Formato internacional sem +, espaços ou traços. O SMS será enviado para cada número da lista.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Mensagem</Label>
        <Textarea
          value={config.message || ""}
          onChange={(e) => handleConfigChange("message", e.target.value)}
          placeholder="Olá {{nome}}, seu código é {{codigo}}"
          rows={5}
          maxLength={480}
        />
        <p className="text-[11px] text-muted-foreground">
          SMS comuns têm limite de 160 caracteres — textos maiores são divididos em partes pela operadora.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Variável de saída (status)</Label>
        <Input
          value={config.outputVariable || "envio_sms_status"}
          onChange={(e) => handleConfigChange("outputVariable", e.target.value)}
          placeholder="envio_sms_status"
        />
      </div>
    </div>
  );
};
