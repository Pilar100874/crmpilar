import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Database, Plus, Trash2, RotateCw } from "lucide-react";

interface ConfigProps {
  config: any;
  handleConfigChange: (key: string, value: any) => void;
}

export const ApiLoopConfig = ({ config, handleConfigChange }: ConfigProps) => {
  const columns: string[] = Array.isArray(config.columns) ? config.columns : [];
  const headers: Array<{ key: string; value: string }> =
    Array.isArray(config.headers) ? config.headers : [];

  const updateColumn = (index: number, value: string) => {
    const next = [...columns];
    next[index] = value;
    handleConfigChange("columns", next);
  };
  const addColumn = () => handleConfigChange("columns", [...columns, ""]);
  const removeColumn = (i: number) =>
    handleConfigChange("columns", columns.filter((_, idx) => idx !== i));

  const updateHeader = (i: number, key: "key" | "value", v: string) => {
    const next = [...headers];
    next[i] = { ...next[i], [key]: v };
    handleConfigChange("headers", next);
  };
  const addHeader = () =>
    handleConfigChange("headers", [...headers, { key: "", value: "" }]);
  const removeHeader = (i: number) =>
    handleConfigChange("headers", headers.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-4">
      <Alert>
        <Database className="h-4 w-4" />
        <AlertDescription className="text-xs">
          O bloco chama a API, extrai apenas as colunas selecionadas e itera linha a linha,
          executando os blocos seguintes para cada item até finalizar a lista.
        </AlertDescription>
      </Alert>

      {/* Método e URL */}
      <div className="grid grid-cols-[110px_1fr] gap-2">
        <div className="space-y-2">
          <Label>Método</Label>
          <Select
            value={config.method || "GET"}
            onValueChange={(v) => handleConfigChange("method", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="GET">GET</SelectItem>
              <SelectItem value="POST">POST</SelectItem>
              <SelectItem value="PUT">PUT</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>URL da API</Label>
          <Input
            value={config.url || ""}
            onChange={(e) => handleConfigChange("url", e.target.value)}
            placeholder="https://api.exemplo.com/contatos"
          />
        </div>
      </div>

      {/* Headers */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Headers</Label>
          <Button size="sm" variant="outline" type="button" onClick={addHeader} className="h-7">
            <Plus className="w-3 h-3 mr-1" /> Header
          </Button>
        </div>
        {headers.length === 0 && (
          <p className="text-[11px] text-muted-foreground">Nenhum header configurado.</p>
        )}
        {headers.map((h, i) => (
          <div key={i} className="flex gap-2">
            <Input
              placeholder="Authorization"
              value={h.key}
              onChange={(e) => updateHeader(i, "key", e.target.value)}
            />
            <Input
              placeholder="Bearer ..."
              value={h.value}
              onChange={(e) => updateHeader(i, "value", e.target.value)}
            />
            <Button size="icon" variant="ghost" type="button" onClick={() => removeHeader(i)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>

      {/* Body (POST/PUT) */}
      {(config.method === "POST" || config.method === "PUT") && (
        <div className="space-y-2">
          <Label>Body (JSON)</Label>
          <Textarea
            value={config.body || ""}
            onChange={(e) => handleConfigChange("body", e.target.value)}
            placeholder='{"filtro": "ativos"}'
            rows={3}
          />
        </div>
      )}

      {/* Caminho do array na resposta */}
      <div className="space-y-2">
        <Label>Caminho do array na resposta (opcional)</Label>
        <Input
          value={config.arrayPath || ""}
          onChange={(e) => handleConfigChange("arrayPath", e.target.value)}
          placeholder="Ex: data.items (vazio = resposta já é array)"
        />
      </div>

      {/* Colunas */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Colunas a armazenar</Label>
          <Button size="sm" variant="outline" type="button" onClick={addColumn} className="h-7">
            <Plus className="w-3 h-3 mr-1" /> Coluna
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Nome do campo retornado pela API (ex.: <code>nome</code>, <code>telefone</code>, <code>email</code>).
          Cada coluna será exposta no loop como variável <code>{"{{item.coluna}}"}</code>.
        </p>
        {columns.length === 0 && (
          <p className="text-[11px] text-muted-foreground italic">Nenhuma coluna definida.</p>
        )}
        {columns.map((c, i) => (
          <div key={i} className="flex gap-2">
            <Input
              value={c}
              onChange={(e) => updateColumn(i, e.target.value)}
              placeholder={`Ex: telefone`}
            />
            <Button size="icon" variant="ghost" type="button" onClick={() => removeColumn(i)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>

      {/* Loop config */}
      <div className="rounded-md border p-3 space-y-3 bg-muted/30">
        <div className="flex items-center gap-2 text-sm font-medium">
          <RotateCw className="w-4 h-4 text-primary" />
          Configuração do loop
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Intervalo entre disparos (segundos)</Label>
            <Input
              type="number"
              min={0}
              value={config.delaySeconds ?? 2}
              onChange={(e) => handleConfigChange("delaySeconds", Number(e.target.value))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Limite de linhas (0 = todas)</Label>
            <Input
              type="number"
              min={0}
              value={config.maxRows ?? 0}
              onChange={(e) => handleConfigChange("maxRows", Number(e.target.value))}
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Variável do item atual</Label>
          <Input
            value={config.itemVariable || "item"}
            onChange={(e) => handleConfigChange("itemVariable", e.target.value)}
            placeholder="item"
          />
          <p className="text-[10px] text-muted-foreground">
            Use <code>{"{{item.coluna}}"}</code> nos blocos seguintes (ex.: bloco "Enviar WhatsApp para número").
          </p>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Parar se ocorrer erro?</Label>
          <Select
            value={config.onError || "continue"}
            onValueChange={(v) => handleConfigChange("onError", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="continue">Continuar próximas linhas</SelectItem>
              <SelectItem value="stop">Parar o loop</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Variável de saída (resumo)</Label>
        <Input
          value={config.outputVariable || "loop_resultado"}
          onChange={(e) => handleConfigChange("outputVariable", e.target.value)}
          placeholder="loop_resultado"
        />
      </div>
    </div>
  );
};
