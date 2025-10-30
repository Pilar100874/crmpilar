import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { VariableInput } from "../VariableInput";

interface ConfigProps {
  config: any;
  handleConfigChange: (key: string, value: any) => void;
}

export const AgendaRapidaConfig = ({ config, handleConfigChange }: ConfigProps) => {
  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-4">
        <div>
          <Label className="text-sm font-medium">Variável CNPJ/CPF da Empresa</Label>
          <p className="text-xs text-muted-foreground mb-2">
            Variável contendo o CNPJ ou CPF para buscar a empresa
          </p>
          <VariableInput
            value={config.cnpjVariable || "cnpj"}
            onChange={(e) => handleConfigChange("cnpjVariable", e.target.value)}
            placeholder="{{cnpj}}"
          />
        </div>

        <div>
          <Label className="text-sm font-medium">Variável com Observação</Label>
          <p className="text-xs text-muted-foreground mb-2">
            Variável que contém o texto da observação digitado pelo usuário
          </p>
          <VariableInput
            value={config.observacaoVariable || "observacao"}
            onChange={(e) => handleConfigChange("observacaoVariable", e.target.value)}
            placeholder="{{observacao}}"
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
          <li>Busca a empresa pelo CNPJ/CPF informado</li>
          <li>Pergunta quando agendar (15 min, 30 min, amanhã)</li>
          <li>Lista os usuários disponíveis para atribuir</li>
          <li>Solicita observação do usuário</li>
          <li>Cria tarefa tipo "Acompanhar" na agenda</li>
        </ol>
      </Card>
    </div>
  );
};
