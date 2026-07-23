import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Contact } from "lucide-react";

interface Props {
  config: any;
  handleConfigChange: (key: string, value: any) => void;
}

export const SendContactCardConfig = ({ config, handleConfigChange }: Props) => {
  const modo = config.modo || "gerente_do_vendedor";
  return (
    <div className="space-y-4">
      <Alert>
        <Contact className="h-4 w-4" />
        <AlertDescription className="text-xs">
          Envia um contato para o destinatário atual (igual quando você compartilha
          contato no WhatsApp). Use dentro de um <b>Broadcast Vendedores</b> ou após um
          envio ao vendedor para compartilhar o contato do gerente.
        </AlertDescription>
      </Alert>

      <div className="space-y-1">
        <Label className="text-xs">Qual contato compartilhar?</Label>
        <Select value={modo} onValueChange={(v) => handleConfigChange("modo", v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="gerente_do_vendedor" className="text-xs">Gerente do vendedor atual (dinâmico)</SelectItem>
            <SelectItem value="fixo" className="text-xs">Contato fixo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {modo === "gerente_do_vendedor" && (
        <div className="space-y-2 rounded-md border p-3">
          <p className="text-[11px] text-muted-foreground">
            Fallback usado quando o vendedor não tem gerente vinculado.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Input
              className="h-8 text-xs"
              placeholder="Nome fallback"
              value={config.fallbackNome || ""}
              onChange={(e) => handleConfigChange("fallbackNome", e.target.value)}
            />
            <Input
              className="h-8 text-xs"
              placeholder="WhatsApp fallback (com DDD)"
              value={config.fallbackWhatsapp || ""}
              onChange={(e) => handleConfigChange("fallbackWhatsapp", e.target.value)}
            />
          </div>
        </div>
      )}

      {modo === "fixo" && (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Nome do contato</Label>
            <Input
              className="h-8 text-xs"
              value={config.contatoNome || ""}
              onChange={(e) => handleConfigChange("contatoNome", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">WhatsApp (com DDD)</Label>
            <Input
              className="h-8 text-xs"
              placeholder="5511999999999"
              value={config.contatoWhatsapp || ""}
              onChange={(e) => handleConfigChange("contatoWhatsapp", e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="space-y-1 border-t pt-3">
        <Label className="text-xs">Legenda opcional</Label>
        <Input
          className="h-8 text-xs"
          placeholder="Ex.: Segue o contato do seu gerente"
          value={config.legenda || ""}
          onChange={(e) => handleConfigChange("legenda", e.target.value)}
        />
      </div>
    </div>
  );
};

export default SendContactCardConfig;
