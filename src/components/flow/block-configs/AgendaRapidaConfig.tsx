import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { VariableInput } from "../VariableInput";
import { Textarea } from "@/components/ui/textarea";

interface ConfigProps {
  config: any;
  handleConfigChange: (key: string, value: any) => void;
}

export const AgendaRapidaConfig = ({ config, handleConfigChange }: ConfigProps) => {
  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-4">
        <div>
          <Label className="text-sm font-medium">Valor para agenda</Label>
          <p className="text-xs text-muted-foreground mb-2">
            Texto ou variável que será usado como título/descrição da tarefa na agenda
          </p>
          <VariableInput
            value={config.valorAgenda || ""}
            onChange={(e) => handleConfigChange("valorAgenda", e.target.value)}
            placeholder="Ex: Retorno cliente - {{observacao}}"
          />
        </div>

        <div>
          <Label className="text-sm font-medium">Título da Tarefa (opcional)</Label>
          <p className="text-xs text-muted-foreground mb-2">
            Título fixo ou com variáveis. Se vazio, usa "Retorno Bot"
          </p>
          <VariableInput
            value={config.tituloTarefa || ""}
            onChange={(e) => handleConfigChange("tituloTarefa", e.target.value)}
            placeholder="Ex: Retorno - {{nome}}"
          />
        </div>

        <div>
          <Label className="text-sm font-medium">Variável de Saída</Label>
          <p className="text-xs text-muted-foreground mb-2">
            Nome da variável onde será armazenado o resultado (ID da tarefa criada)
          </p>
          <Input
            value={config.outputVariable || "tarefa_criada"}
            onChange={(e) => handleConfigChange("outputVariable", e.target.value)}
            placeholder="tarefa_criada"
          />
        </div>
      </Card>

      <Card className="p-4 bg-muted/50">
        <h4 className="text-sm font-semibold mb-2">Como funciona:</h4>
        <ol className="text-xs space-y-1 list-decimal list-inside text-muted-foreground">
          <li>Identifica o cliente pelo número de telefone do chat</li>
          <li>Cria uma tarefa na agenda para o dia atual</li>
          <li>Usa o "Valor para agenda" como descrição da tarefa</li>
          <li>A tarefa é vinculada ao cliente encontrado</li>
          <li>Armazena o ID da tarefa criada na variável de saída</li>
        </ol>
      </Card>
    </div>
  );
};
