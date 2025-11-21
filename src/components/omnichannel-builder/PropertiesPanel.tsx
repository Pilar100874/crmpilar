import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { OmnichannelNode } from "@/types/omnichannelFlow";

interface PropertiesPanelProps {
  selectedNode: OmnichannelNode | null;
  onUpdateNode: (id: string, updates: Partial<OmnichannelNode["data"]>) => void;
}

export const PropertiesPanel = ({ selectedNode, onUpdateNode }: PropertiesPanelProps) => {
  if (!selectedNode) {
    return (
      <Card className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center p-6">
          <p>Selecione um bloco</p>
          <p className="text-sm mt-1">para ver suas propriedades</p>
        </div>
      </Card>
    );
  }

  const { data } = selectedNode;

  const updateConfig = (key: string, value: any) => {
    onUpdateNode(selectedNode.id, {
      config: { ...data.config, [key]: value }
    });
  };

  return (
    <Card className="h-full">
      <div className="p-4 border-b">
        <h3 className="font-semibold">Propriedades</h3>
        <p className="text-sm text-muted-foreground capitalize mt-1">
          {data.type.replace('_', ' ')}
        </p>
      </div>

      <ScrollArea className="h-[calc(100%-80px)]">
        <div className="p-4 space-y-4">
          {/* Nome do bloco */}
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input
              value={data.label}
              onChange={(e) => onUpdateNode(selectedNode.id, { label: e.target.value })}
              placeholder="Nome do bloco"
            />
          </div>

          {/* Configurações específicas por tipo */}
          {data.type === "fila" && (
            <>
              <div className="space-y-2">
                <Label>Tipo de Roteamento</Label>
                <Select
                  value={data.config.tipoRoteamento || "round_robin"}
                  onValueChange={(value) => updateConfig("tipoRoteamento", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="round_robin">Round Robin</SelectItem>
                    <SelectItem value="por_skill">Por Skill</SelectItem>
                    <SelectItem value="por_disponibilidade">Por Disponibilidade</SelectItem>
                    <SelectItem value="por_prioridade">Por Prioridade</SelectItem>
                    <SelectItem value="por_carteira">Por Carteira</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Max Chats por Atendente</Label>
                <Input
                  type="number"
                  value={data.config.maxChats || 5}
                  onChange={(e) => updateConfig("maxChats", parseInt(e.target.value))}
                  min={1}
                  max={20}
                />
              </div>

              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Input
                  type="number"
                  value={data.config.prioridade || 0}
                  onChange={(e) => updateConfig("prioridade", parseInt(e.target.value))}
                  min={0}
                  max={10}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Fila Ativa</Label>
                <Switch
                  checked={data.config.ativa !== false}
                  onCheckedChange={(checked) => updateConfig("ativa", checked)}
                />
              </div>
            </>
          )}

          {data.type === "atendente" && (
            <>
              <div className="space-y-2">
                <Label>Max Chats Simultâneos</Label>
                <Input
                  type="number"
                  value={data.config.maxChatsSimultaneos || 3}
                  onChange={(e) => updateConfig("maxChatsSimultaneos", parseInt(e.target.value))}
                  min={1}
                  max={10}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Aceita Novos Chats</Label>
                <Switch
                  checked={data.config.aceitaNovosChats !== false}
                  onCheckedChange={(checked) => updateConfig("aceitaNovosChats", checked)}
                />
              </div>
            </>
          )}

          {data.type === "skill" && (
            <>
              <div className="space-y-2">
                <Label>Nível Mínimo Requerido</Label>
                <Input
                  type="number"
                  value={data.config.nivelMinimo || 1}
                  onChange={(e) => updateConfig("nivelMinimo", parseInt(e.target.value))}
                  min={1}
                  max={5}
                />
              </div>
            </>
          )}

          {data.type === "regra_roteamento" && (
            <>
              <div className="space-y-2">
                <Label>Condição</Label>
                <Select
                  value={data.config.condicao || "disponibilidade"}
                  onValueChange={(value) => updateConfig("condicao", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="disponibilidade">Disponibilidade</SelectItem>
                    <SelectItem value="carga_trabalho">Carga de Trabalho</SelectItem>
                    <SelectItem value="skill_match">Match de Skills</SelectItem>
                    <SelectItem value="carteira_fixa">Carteira Fixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
};
