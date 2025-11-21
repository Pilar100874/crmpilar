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

          {/* Configurações específicas para Horário */}
          {data.type === 'horario' && (
            <>
              <div className="space-y-2">
                <Label>Dias da Semana *</Label>
                <div className="grid grid-cols-7 gap-1">
                  {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dia, index) => (
                    <Button
                      key={dia}
                      type="button"
                      variant={(data.config.diasSemana || []).includes(index) ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        const dias = data.config.diasSemana || [];
                        const novosDias = dias.includes(index)
                          ? dias.filter((d: number) => d !== index)
                          : [...dias, index];
                        updateConfig('diasSemana', novosDias);
                      }}
                      className="text-xs p-1"
                    >
                      {dia}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Início *</Label>
                  <Input
                    type="time"
                    value={data.config.horarioInicio || ''}
                    onChange={(e) => updateConfig('horarioInicio', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fim *</Label>
                  <Input
                    type="time"
                    value={data.config.horarioFim || ''}
                    onChange={(e) => updateConfig('horarioFim', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Ação Fora do Horário *</Label>
                <Select
                  value={data.config.acaoForaHorario || ''}
                  onValueChange={(value) => updateConfig('acaoForaHorario', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bloquear">Bloquear</SelectItem>
                    <SelectItem value="fila">Enviar para Fila</SelectItem>
                    <SelectItem value="mensagem">Mensagem Automática</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {data.config.acaoForaHorario === 'mensagem' && (
                <div className="space-y-2">
                  <Label>Mensagem</Label>
                  <Textarea
                    placeholder="Digite a mensagem..."
                    value={data.config.mensagemForaHorario || ''}
                    onChange={(e) => updateConfig('mensagemForaHorario', e.target.value)}
                    rows={3}
                  />
                </div>
              )}
            </>
          )}

          {/* Configurações específicas para Webhook */}
          {data.type === 'webhook' && (
            <>
              <div className="space-y-2">
                <Label>URL do Webhook *</Label>
                <Input
                  placeholder="https://..."
                  value={data.config.webhookUrl || ''}
                  onChange={(e) => updateConfig('webhookUrl', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Método HTTP *</Label>
                <Select
                  value={data.config.metodo || 'POST'}
                  onValueChange={(value) => updateConfig('metodo', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                    <SelectItem value="PATCH">PATCH</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Headers (JSON)</Label>
                <Textarea
                  placeholder='{"Authorization": "Bearer token"}'
                  value={data.config.headers || ''}
                  onChange={(e) => updateConfig('headers', e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Body (JSON)</Label>
                <Textarea
                  placeholder='{"campo": "valor"}'
                  value={data.config.body || ''}
                  onChange={(e) => updateConfig('body', e.target.value)}
                  rows={4}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Aguardar Resposta</Label>
                <Switch
                  checked={data.config.aguardarResposta || false}
                  onCheckedChange={(checked) => updateConfig('aguardarResposta', checked)}
                />
              </div>

              <div className="space-y-2">
                <Label>Timeout (segundos)</Label>
                <Input
                  type="number"
                  min="1"
                  max="30"
                  value={data.config.timeout || 10}
                  onChange={(e) => updateConfig('timeout', parseInt(e.target.value))}
                />
              </div>
            </>
          )}

          {/* Configurações específicas para Aguardar */}
          {data.type === 'aguardar' && (
            <>
              <div className="space-y-2">
                <Label>Tempo de Espera (segundos) *</Label>
                <Input
                  type="number"
                  min="1"
                  max="3600"
                  placeholder="60"
                  value={data.config.tempoEspera || ''}
                  onChange={(e) => updateConfig('tempoEspera', parseInt(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo de Espera *</Label>
                <Select
                  value={data.config.tipoEspera || ''}
                  onValueChange={(value) => updateConfig('tipoEspera', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixo">Tempo Fixo</SelectItem>
                    <SelectItem value="dinamico">Dinâmico</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label>Notificar Cliente</Label>
                <Switch
                  checked={data.config.notificarCliente || false}
                  onCheckedChange={(checked) => updateConfig('notificarCliente', checked)}
                />
              </div>

              {data.config.notificarCliente && (
                <div className="space-y-2">
                  <Label>Mensagem de Espera</Label>
                  <Textarea
                    placeholder="Aguarde um momento..."
                    value={data.config.mensagemEspera || ''}
                    onChange={(e) => updateConfig('mensagemEspera', e.target.value)}
                    rows={3}
                  />
                </div>
              )}
            </>
          )}

          {/* Configurações específicas para Simulador */}
          {data.type === 'simulador' && (
            <>
              <div className="space-y-2">
                <Label>Simulação de Cenário</Label>
                <p className="text-sm text-muted-foreground">
                  Teste o fluxo com dados simulados
                </p>
              </div>

              <div className="space-y-2">
                <Label>Dados de Teste (JSON)</Label>
                <Textarea
                  placeholder='{"cliente": "João", "canal": "whatsapp"}'
                  value={data.config.dadosTeste || ''}
                  onChange={(e) => updateConfig('dadosTeste', e.target.value)}
                  rows={6}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Log Detalhado</Label>
                <Switch
                  checked={data.config.logDetalhado || false}
                  onCheckedChange={(checked) => updateConfig('logDetalhado', checked)}
                />
              </div>
            </>
          )}

          {/* Configurações específicas para Analytics */}
          {data.type === 'analytics' && (
            <>
              <div className="space-y-2">
                <Label>Métricas a Monitorar</Label>
                <div className="space-y-2">
                  {[
                    { id: 'tempo_medio', label: 'Tempo Médio' },
                    { id: 'taxa_transferencia', label: 'Taxa de Transferência' },
                    { id: 'satisfacao', label: 'Satisfação' },
                    { id: 'abandonos', label: 'Taxa de Abandono' },
                    { id: 'resolucao_primeiro', label: 'Resolução 1º Contato' }
                  ].map((metrica) => (
                    <div key={metrica.id} className="flex items-center space-x-2">
                      <Switch
                        id={metrica.id}
                        checked={(data.config.metricas || []).includes(metrica.id)}
                        onCheckedChange={(checked) => {
                          const metricas = data.config.metricas || [];
                          const novasMetricas = checked
                            ? [...metricas, metrica.id]
                            : metricas.filter((m: string) => m !== metrica.id);
                          updateConfig('metricas', novasMetricas);
                        }}
                      />
                      <Label htmlFor={metrica.id} className="text-sm">{metrica.label}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Período de Análise</Label>
                <Select
                  value={data.config.periodoAnalise || 'dia'}
                  onValueChange={(value) => updateConfig('periodoAnalise', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hora">Última Hora</SelectItem>
                    <SelectItem value="dia">Último Dia</SelectItem>
                    <SelectItem value="semana">Última Semana</SelectItem>
                    <SelectItem value="mes">Último Mês</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label>Alertas Ativos</Label>
                <Switch
                  checked={data.config.alertasAtivos || false}
                  onCheckedChange={(checked) => updateConfig('alertasAtivos', checked)}
                />
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
};
