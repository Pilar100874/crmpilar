import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import type { OmnichannelNode } from "@/types/omnichannelFlow";
import { useState } from "react";

interface PropertiesPanelProps {
  selectedNode: OmnichannelNode | null;
  onUpdateNode: (id: string, updates: Partial<OmnichannelNode["data"]>) => void;
}

interface CondicaoRegra {
  campo: string;
  operador: string;
  valor: string;
}

export const PropertiesPanel = ({ selectedNode, onUpdateNode }: PropertiesPanelProps) => {
  const [novaCondicao, setNovaCondicao] = useState<CondicaoRegra>({
    campo: "disponibilidade",
    operador: "igual",
    valor: ""
  });

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

  const adicionarCondicao = () => {
    const condicoes = data.config.condicoes || [];
    updateConfig("condicoes", [...condicoes, novaCondicao]);
    setNovaCondicao({ campo: "disponibilidade", operador: "igual", valor: "" });
  };

  const removerCondicao = (index: number) => {
    const condicoes = [...(data.config.condicoes || [])];
    condicoes.splice(index, 1);
    updateConfig("condicoes", condicoes);
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
            <Label>Nome *</Label>
            <Input
              value={data.label}
              onChange={(e) => onUpdateNode(selectedNode.id, { label: e.target.value })}
              placeholder="Nome do bloco"
            />
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              value={data.config.descricao || ""}
              onChange={(e) => updateConfig("descricao", e.target.value)}
              placeholder="Descrição opcional"
              rows={2}
            />
          </div>

          {/* Configurações específicas por tipo */}
          {data.type === "fila" && (
            <>
              <div className="space-y-2">
                <Label>Tipo de Roteamento *</Label>
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
                <Label>Max Chats por Atendente *</Label>
                <Input
                  type="number"
                  value={data.config.maxChats || 5}
                  onChange={(e) => updateConfig("maxChats", parseInt(e.target.value) || 5)}
                  min={1}
                  max={20}
                />
              </div>

              <div className="space-y-2">
                <Label>Prioridade *</Label>
                <Input
                  type="number"
                  value={data.config.prioridade || 0}
                  onChange={(e) => updateConfig("prioridade", parseInt(e.target.value) || 0)}
                  min={0}
                  max={10}
                />
                <p className="text-xs text-muted-foreground">0 = baixa, 10 = alta</p>
              </div>

              <div className="space-y-2">
                <Label>Tempo Resposta Esperado (segundos)</Label>
                <Input
                  type="number"
                  value={data.config.tempoResposta || 300}
                  onChange={(e) => updateConfig("tempoResposta", parseInt(e.target.value) || 300)}
                  min={60}
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
                <Label>ID do Atendente *</Label>
                <Input
                  value={data.config.atendenteId || ""}
                  onChange={(e) => updateConfig("atendenteId", e.target.value)}
                  placeholder="Selecionar atendente"
                />
                <p className="text-xs text-muted-foreground">
                  Use variável ou ID fixo
                </p>
              </div>

              <div className="space-y-2">
                <Label>Max Chats Simultâneos *</Label>
                <Input
                  type="number"
                  value={data.config.maxChatsSimultaneos || 3}
                  onChange={(e) => updateConfig("maxChatsSimultaneos", parseInt(e.target.value) || 3)}
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

              <div className="flex items-center justify-between">
                <Label>Atendente Fixo (Carteira)</Label>
                <Switch
                  checked={data.config.atendenteFixo === true}
                  onCheckedChange={(checked) => updateConfig("atendenteFixo", checked)}
                />
              </div>
            </>
          )}

          {data.type === "skill" && (
            <>
              <div className="space-y-2">
                <Label>Skill Requerida *</Label>
                <Input
                  value={data.config.skillNome || ""}
                  onChange={(e) => updateConfig("skillNome", e.target.value)}
                  placeholder="Nome da skill"
                />
              </div>

              <div className="space-y-2">
                <Label>Nível Mínimo Requerido *</Label>
                <Input
                  type="number"
                  value={data.config.nivelMinimo || 1}
                  onChange={(e) => updateConfig("nivelMinimo", parseInt(e.target.value) || 1)}
                  min={1}
                  max={5}
                />
                <p className="text-xs text-muted-foreground">1 = básico, 5 = expert</p>
              </div>

              <div className="flex items-center justify-between">
                <Label>Obrigatório</Label>
                <Switch
                  checked={data.config.obrigatorio !== false}
                  onCheckedChange={(checked) => updateConfig("obrigatorio", checked)}
                />
              </div>
            </>
          )}

          {data.type === "regra_roteamento" && (
            <>
              <div className="space-y-2">
                <Label>Tipo de Regra *</Label>
                <Select
                  value={data.config.tipoRegra || "condicional"}
                  onValueChange={(value) => updateConfig("tipoRegra", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="condicional">Condicional (Se/Então)</SelectItem>
                    <SelectItem value="prioridade">Por Prioridade</SelectItem>
                    <SelectItem value="disponibilidade">Por Disponibilidade</SelectItem>
                    <SelectItem value="carga">Por Carga de Trabalho</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Condições */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <Label>Condições</Label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={adicionarCondicao}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Adicionar
                  </Button>
                </div>

                {/* Nova condição */}
                <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
                  <Select
                    value={novaCondicao.campo}
                    onValueChange={(value) => setNovaCondicao({ ...novaCondicao, campo: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="disponibilidade">Disponibilidade</SelectItem>
                      <SelectItem value="carga_trabalho">Carga de Trabalho</SelectItem>
                      <SelectItem value="skill">Skill</SelectItem>
                      <SelectItem value="horario">Horário</SelectItem>
                      <SelectItem value="canal">Canal</SelectItem>
                      <SelectItem value="prioridade_cliente">Prioridade do Cliente</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={novaCondicao.operador}
                    onValueChange={(value) => setNovaCondicao({ ...novaCondicao, operador: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="igual">Igual a</SelectItem>
                      <SelectItem value="diferente">Diferente de</SelectItem>
                      <SelectItem value="maior">Maior que</SelectItem>
                      <SelectItem value="menor">Menor que</SelectItem>
                      <SelectItem value="contem">Contém</SelectItem>
                    </SelectContent>
                  </Select>

                  <Input
                    value={novaCondicao.valor}
                    onChange={(e) => setNovaCondicao({ ...novaCondicao, valor: e.target.value })}
                    placeholder="Valor"
                  />
                </div>

                {/* Lista de condições */}
                {(data.config.condicoes || []).map((condicao: CondicaoRegra, index: number) => (
                  <div key={index} className="flex items-center gap-2 p-2 border rounded bg-background">
                    <div className="flex-1 text-sm">
                      <span className="font-medium">{condicao.campo}</span>
                      {" "}<span className="text-muted-foreground">{condicao.operador}</span>
                      {" "}<span className="font-medium">{condicao.valor}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removerCondicao(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <Label>Pular se não atender</Label>
                <Switch
                  checked={data.config.pularSeNaoAtender === true}
                  onCheckedChange={(checked) => updateConfig("pularSeNaoAtender", checked)}
                />
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
};
