import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Plus, X, Database } from "lucide-react";
import type { OmnichannelNode } from "@/types/omnichannelFlow";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { toast } from "@/lib/toast-config";
import { PushBlockConfigEditor } from "@/components/workflows/PushBlockConfig";
import { SmsBlockConfig } from "@/components/shared/SmsBlockConfig";


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

  // Estados para dados do sistema
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [filas, setFilas] = useState<any[]>([]);
  const [atendentes, setAtendentes] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Carregar dados do sistema
  useEffect(() => {
    loadSystemData();
  }, []);

  const loadSystemData = async () => {
    setLoadingData(true);
    try {
      const estabId = await getEstabelecimentoId();
      if (!estabId) return;

      // Carregar webhooks
      const { data: webhooksData } = await supabase
        .from("webhooks")
        .select("*")
        .eq("estabelecimento_id", estabId)
        .eq("active", true);
      setWebhooks(webhooksData || []);

      // Carregar filas
      const { data: filasData } = await supabase
        .from("filas_atendimento")
        .select("*")
        .eq("estabelecimento_id", estabId)
        .eq("ativa", true);
      setFilas(filasData || []);

      // Carregar atendentes
      const { data: atendentesData } = await supabase
        .from("atendentes")
        .select("id, usuario_id, usuarios(nome)")
        .eq("estabelecimento_id", estabId);
      setAtendentes(atendentesData || []);

      // Carregar skills
      const { data: skillsData } = await supabase
        .from("skills")
        .select("*")
        .eq("estabelecimento_id", estabId);
      setSkills(skillsData || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados do sistema");
    } finally {
      setLoadingData(false);
    }
  };

  if (!selectedNode) {
    return (
      <Card className="w-80 h-[calc(100%-1rem)] m-2 rounded-2xl border-2 border-white dark:border-white/10 bg-gradient-to-b from-background to-border shadow-lg flex items-center justify-center text-muted-foreground animate-slide-in-right">
        <div className="text-center p-6">
          <p>Selecione um bloco</p>
          <p className="text-sm mt-1">para ver suas propriedades</p>
        </div>
      </Card>
    );

  }

  const { data } = selectedNode;

  const updateConfig = (key: string, value: any) => {
    const currentConfig = data.config || {};
    onUpdateNode(selectedNode.id, {
      config: { ...currentConfig, [key]: value }
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
    <Card className="workflow-props animate-slide-in-right w-80 h-[calc(100%-1rem)] m-2 rounded-2xl border-2 border-white dark:border-white/10 bg-gradient-to-b from-background to-border shadow-lg flex flex-col overflow-x-hidden">

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

          {/* Nota/Comentário */}
          {data.type !== "inicio" && (
            <div className="space-y-2">
              <Label>Nota/Comentário</Label>
              <Textarea
                value={data.config.nota || ""}
                onChange={(e) => updateConfig("nota", e.target.value)}
                placeholder="Adicione contexto para a equipe..."
                rows={3}
                className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
              />
            </div>
          )}

          {/* Configurações específicas por tipo */}
          {data.type === "fila" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Fila *</Label>
                <Select
                  value={data.config.filaId || ''}
                  onValueChange={(value) => {
                    const fila = filas.find(f => f.id === value);
                    if (fila) {
                      updateConfig('filaId', value);
                      updateConfig('filaNome', fila.nome);
                      updateConfig('tipoRoteamento', fila.tipo_roteamento);
                      updateConfig('maxChats', fila.max_chats_por_atendente);
                      updateConfig('prioridade', fila.prioridade);
                      updateConfig('tempoResposta', fila.tempo_resposta_esperado);
                      updateConfig('mensagemFila', fila.mensagem_fila);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma fila" />
                  </SelectTrigger>
                  <SelectContent>
                    {filas.map((fila) => (
                      <SelectItem key={fila.id} value={fila.id}>
                        <div className="flex items-center gap-2">
                          <Database className="h-3 w-3" />
                          {fila.nome}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {data.config.filaId && (
                <div className="p-3 bg-muted rounded-lg space-y-1.5 text-sm">
                  <p><span className="font-medium">Tipo:</span> {data.config.tipoRoteamento}</p>
                  <p><span className="font-medium">Max Chats:</span> {data.config.maxChats}</p>
                  <p><span className="font-medium">Prioridade:</span> {data.config.prioridade}</p>
                  <p><span className="font-medium">Tempo Resposta:</span> {data.config.tempoResposta}s</p>
                  {data.config.mensagemFila && (
                    <p><span className="font-medium">Mensagem:</span> {data.config.mensagemFila}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {data.type === "atendente" && (
            <>
              <div className="space-y-2">
                <Label>Atendente *</Label>
                <Select
                  value={data.config?.atendenteId || ''}
                  onValueChange={(value) => {
                    const atendente = atendentes.find(a => a.id === value);
                    if (atendente) {
                      updateConfig('atendenteId', value);
                      updateConfig('atendenteNome', atendente.usuarios?.nome || '');
                      updateConfig('usarSistema', true);
                      console.log('Atendente selecionado:', value, atendente.usuarios?.nome);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um atendente" />
                  </SelectTrigger>
                  <SelectContent>
                    {atendentes.map((atendente) => (
                      <SelectItem key={atendente.id} value={atendente.id}>
                        <div className="flex items-center gap-2">
                          <Database className="h-3 w-3" />
                          {atendente.usuarios?.nome || atendente.usuario_id}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {data.config?.atendenteId && (
                  <p className="text-xs text-muted-foreground">
                    Atendente: {data.config?.atendenteNome || data.config?.atendenteId}
                  </p>
                )}
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
                <Label>Skill *</Label>
                <Select
                  value={data.config.skillId || ''}
                  onValueChange={(value) => {
                    const skill = skills.find(s => s.id === value);
                    if (skill) {
                      updateConfig('skillId', value);
                      updateConfig('skillNome', skill.nome);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma skill" />
                  </SelectTrigger>
                  <SelectContent>
                    {skills.map((skill) => (
                      <SelectItem key={skill.id} value={skill.id}>
                        <div className="flex items-center gap-2">
                          <Database className="h-3 w-3" />
                          {skill.nome}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {data.config.skillNome && (
                  <p className="text-xs text-muted-foreground">
                    Skill selecionada: {data.config.skillNome}
                  </p>
                )}
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
                    onValueChange={(value) => setNovaCondicao({ ...novaCondicao, campo: value, valor: '' })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o campo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="skill">Skill</SelectItem>
                      <SelectItem value="canal">Canal</SelectItem>
                      <SelectItem value="fila">Fila</SelectItem>
                      <SelectItem value="prioridade_cliente">Prioridade do Cliente</SelectItem>
                      <SelectItem value="horario">Horário</SelectItem>
                      <SelectItem value="disponibilidade">Disponibilidade</SelectItem>
                      <SelectItem value="carga_trabalho">Carga de Trabalho</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={novaCondicao.operador}
                    onValueChange={(value) => setNovaCondicao({ ...novaCondicao, operador: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o operador" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="igual">Igual a</SelectItem>
                      <SelectItem value="diferente">Diferente de</SelectItem>
                      {(novaCondicao.campo === 'carga_trabalho' || novaCondicao.campo === 'horario') && (
                        <>
                          <SelectItem value="maior">Maior que</SelectItem>
                          <SelectItem value="menor">Menor que</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>

                  {/* Campo de valor dinâmico baseado no tipo de campo */}
                  {novaCondicao.campo === 'skill' && (
                    <Select
                      value={novaCondicao.valor}
                      onValueChange={(value) => {
                        const skill = skills.find(s => s.id === value);
                        setNovaCondicao({ ...novaCondicao, valor: skill?.nome || value });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma skill" />
                      </SelectTrigger>
                      <SelectContent>
                        {skills.map((skill) => (
                          <SelectItem key={skill.id} value={skill.id}>
                            <div className="flex items-center gap-2">
                              <Database className="h-3 w-3" />
                              {skill.nome}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {novaCondicao.campo === 'fila' && (
                    <Select
                      value={novaCondicao.valor}
                      onValueChange={(value) => {
                        const fila = filas.find(f => f.id === value);
                        setNovaCondicao({ ...novaCondicao, valor: fila?.nome || value });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma fila" />
                      </SelectTrigger>
                      <SelectContent>
                        {filas.map((fila) => (
                          <SelectItem key={fila.id} value={fila.id}>
                            <div className="flex items-center gap-2">
                              <Database className="h-3 w-3" />
                              {fila.nome}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {novaCondicao.campo === 'canal' && (
                    <Select
                      value={novaCondicao.valor}
                      onValueChange={(value) => setNovaCondicao({ ...novaCondicao, valor: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um canal" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="telegram">Telegram</SelectItem>
                        <SelectItem value="webchat">WebChat</SelectItem>
                        <SelectItem value="instagram">Instagram</SelectItem>
                        <SelectItem value="facebook">Facebook</SelectItem>
                      </SelectContent>
                    </Select>
                  )}

                  {novaCondicao.campo === 'prioridade_cliente' && (
                    <Select
                      value={novaCondicao.valor}
                      onValueChange={(value) => setNovaCondicao({ ...novaCondicao, valor: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a prioridade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="baixa">🟢 Baixa</SelectItem>
                        <SelectItem value="normal">🟡 Normal</SelectItem>
                        <SelectItem value="alta">🟠 Alta</SelectItem>
                        <SelectItem value="urgente">🔴 Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  )}

                  {novaCondicao.campo === 'disponibilidade' && (
                    <Select
                      value={novaCondicao.valor}
                      onValueChange={(value) => setNovaCondicao({ ...novaCondicao, valor: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a disponibilidade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="disponivel">Disponível</SelectItem>
                        <SelectItem value="ocupado">Ocupado</SelectItem>
                        <SelectItem value="ausente">Ausente</SelectItem>
                        <SelectItem value="pausa">Pausa</SelectItem>
                        <SelectItem value="offline">Offline</SelectItem>
                      </SelectContent>
                    </Select>
                  )}

                  {(novaCondicao.campo === 'carga_trabalho' || novaCondicao.campo === 'horario') && (
                    <Input
                      value={novaCondicao.valor}
                      onChange={(e) => setNovaCondicao({ ...novaCondicao, valor: e.target.value })}
                      placeholder={novaCondicao.campo === 'horario' ? 'Ex: 08:00' : 'Ex: 5'}
                      type={novaCondicao.campo === 'carga_trabalho' ? 'number' : 'text'}
                    />
                  )}
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

              {data.config.acaoForaHorario === 'fila' && (
                <div className="space-y-2">
                  <Label>Fila de Destino *</Label>
                  <Select
                    value={data.config.filaDestinoId || ''}
                    onValueChange={(value) => {
                      const fila = filas.find(f => f.id === value);
                      if (fila) {
                        updateConfig('filaDestinoId', value);
                        updateConfig('filaDestinoNome', fila.nome);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma fila" />
                    </SelectTrigger>
                    <SelectContent>
                      {filas.map((fila) => (
                        <SelectItem key={fila.id} value={fila.id}>
                          <div className="flex items-center gap-2">
                            <Database className="h-3 w-3" />
                            {fila.nome}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

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
                <div className="flex items-center justify-between">
                  <Label>Usar Webhook Cadastrado</Label>
                  <Switch
                    checked={data.config.usarSistema === true}
                    onCheckedChange={(checked) => updateConfig('usarSistema', checked)}
                  />
                </div>
              </div>

              {data.config.usarSistema ? (
                <div className="space-y-2">
                  <Label>Webhook do Sistema *</Label>
                  <Select
                    value={data.config.webhookId || ''}
                    onValueChange={(value) => {
                      const webhook = webhooks.find(w => w.id === value);
                      if (webhook) {
                        updateConfig('webhookId', value);
                        updateConfig('webhookNome', webhook.nome);
                        updateConfig('webhookUrl', webhook.url);
                        updateConfig('metodo', webhook.metodo);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um webhook" />
                    </SelectTrigger>
                    <SelectContent>
                      {webhooks.map((webhook) => (
                        <SelectItem key={webhook.id} value={webhook.id}>
                          <div className="flex items-center gap-2">
                            <Database className="h-3 w-3" />
                            {webhook.nome}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {data.config.webhookId && (
                    <p className="text-xs text-muted-foreground">
                      {data.config.webhookUrl}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>URL do Webhook *</Label>
                  <Input
                    placeholder="https://..."
                    value={data.config.webhookUrl || ''}
                    onChange={(e) => updateConfig('webhookUrl', e.target.value)}
                  />
                </div>
              )}

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

          {data.type === 'disparar_push' && (
            <PushBlockConfigEditor
              value={data.config || {}}
              onChange={(patch) => {
                Object.entries(patch).forEach(([k, v]) => updateConfig(k, v));
              }}
              context="omnichannel"
            />
          )}
        </div>
      </ScrollArea>
    </Card>
  );
};
