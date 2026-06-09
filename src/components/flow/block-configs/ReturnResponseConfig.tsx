import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Reply } from "lucide-react";

interface ReturnResponseConfigProps {
  data: any;
  onChange: (config: any) => void;
}

/**
 * Bloco "Retornar Resposta": usado quando o workflow é disparado em modo SÍNCRONO
 * por outro workflow (bloco "Disparar Workflow" com executionMode = "await").
 * Devolve um payload JSON ao chamador, encerrando o fluxo neste ponto.
 */
export function ReturnResponseConfig({ data, onChange }: ReturnResponseConfigProps) {
  const config = data?.config || {};
  const update = (patch: Record<string, any>) => onChange({ ...config, ...patch });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Reply className="h-4 w-4" />
        Envia o retorno ao workflow chamador (modo síncrono) e encerra este fluxo.
      </div>

      <div className="space-y-2">
        <Label>Status</Label>
        <Select
          value={config.status || "success"}
          onValueChange={(v) => update({ status: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="success">Sucesso</SelectItem>
            <SelectItem value="error">Erro</SelectItem>
            <SelectItem value="custom">Personalizado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {config.status === "custom" && (
        <div className="space-y-2">
          <Label>Código de status</Label>
          <Input
            type="number"
            value={config.statusCode ?? 200}
            onChange={(e) => update({ statusCode: Number(e.target.value) })}
            placeholder="200"
          />
        </div>
      )}

      <div className="space-y-2">
        <Label>Mensagem</Label>
        <Input
          value={config.message || ""}
          onChange={(e) => update({ message: e.target.value })}
          placeholder="Operação concluída"
        />
      </div>

      <div className="space-y-2">
        <Label>Payload de retorno (JSON)</Label>
        <Textarea
          rows={5}
          placeholder='{"resultado": "{{variavel}}", "id": "{{contato_id}}"}'
          value={config.payloadJson || ""}
          onChange={(e) => update({ payloadJson: e.target.value })}
          className="font-mono text-xs"
        />
        <p className="text-[11px] text-muted-foreground">
          Suporta variáveis no formato <code>{"{{nome_variavel}}"}</code>.
        </p>
      </div>

      <div className="flex items-center justify-between rounded-md border border-border p-3">
        <div>
          <Label className="text-sm">Incluir todas as variáveis</Label>
          <p className="text-xs text-muted-foreground">
            Anexa todas as variáveis do fluxo no retorno.
          </p>
        </div>
        <Switch
          checked={config.includeAllVariables === true}
          onCheckedChange={(v) => update({ includeAllVariables: v })}
        />
      </div>

      <div className="flex items-center justify-between rounded-md border border-border p-3">
        <div>
          <Label className="text-sm">Encerrar fluxo após retorno</Label>
          <p className="text-xs text-muted-foreground">
            Para a execução deste workflow após enviar a resposta.
          </p>
        </div>
        <Switch
          checked={config.stopFlow !== false}
          onCheckedChange={(v) => update({ stopFlow: v })}
        />
      </div>
    </div>
  );
}
