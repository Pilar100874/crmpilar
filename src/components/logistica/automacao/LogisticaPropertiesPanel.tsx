import { useState, useEffect } from 'react';
import { Node } from '@xyflow/react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LogisticaBlockType, LOGISTICA_BLOCKS, CondicaoTempoParado } from '@/types/automacaoLogistica';
import { AddressAutocomplete } from '@/components/logistica/AddressAutocomplete';
import { IconePicker } from './IconePicker';
import { Plus, Trash2, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PushBlockConfigEditor } from '@/components/workflows/PushBlockConfig';
import { SmsBlockConfig } from '@/components/shared/SmsBlockConfig';

interface Usuario {
  id: string;
  nome: string;
  email: string;
}

interface LogisticaPropertiesPanelProps {
  selectedNode: Node | null;
  onUpdateNode: (nodeId: string, data: any) => void;
}

export function LogisticaPropertiesPanel({ selectedNode, onUpdateNode }: LogisticaPropertiesPanelProps) {
  const [legendaLocal, setLegendaLocal] = useState('');
  const [condicoesLocal, setCondicoesLocal] = useState<CondicaoTempoParado[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [sessoesWhats, setSessoesWhats] = useState<Array<{ id: string; session_name: string; phone_number: string | null; status: string }>>([]);

  
  const nodeData = selectedNode?.data as any;
  const config = nodeData?.config || {};

  useEffect(() => {
    const fetchUsuarios = async () => {
      setLoadingUsuarios(true);
      const estabelecimentoId = localStorage.getItem('estabelecimentoId');
      if (!estabelecimentoId) {
        setLoadingUsuarios(false);
        return;
      }

      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nome, email')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('nome');

      if (!error && data) {
        setUsuarios(data);
      }
      setLoadingUsuarios(false);
    };

    fetchUsuarios();

    (async () => {
      const { fetchWhatsappSessions } = await import('@/lib/whatsapp/sessionUsage');
      setSessoesWhats(await fetchWhatsappSessions());
    })();
  }, []);


  
  // Sincroniza estado local quando muda o nó selecionado
  useEffect(() => {
    if (selectedNode) {
      setLegendaLocal(config.legenda_parada || '');
      setCondicoesLocal(config.condicoes_tempo || [{ tempo_minutos: 30, label: '30 min' }]);
    }
  }, [selectedNode?.id, JSON.stringify(config.condicoes_tempo)]);
  
  if (!selectedNode) {
    return (
      <div className="w-80 flex flex-col h-[calc(100%-1rem)] m-2 rounded-2xl shadow-lg border-2 border-white dark:border-white/10 bg-gradient-to-b from-background to-border p-4 items-center justify-center animate-slide-in-right">
        <p className="text-sm text-muted-foreground text-center mt-8">
          Selecione um bloco para editar suas propriedades
        </p>
      </div>
    );
  }

  const blockType = nodeData.type as LogisticaBlockType;
  const blockDef = LOGISTICA_BLOCKS.find(b => b.type === blockType);

  const updateConfig = (key: string, value: any) => {
    onUpdateNode(selectedNode.id, {
      config: { ...config, [key]: value }
    });
  };

  const addCondicaoTempo = () => {
    const newCondicoes = [...condicoesLocal, { tempo_minutos: 15, label: '' }];
    setCondicoesLocal(newCondicoes);
    updateConfig('condicoes_tempo', newCondicoes);
  };

  const updateCondicaoTempoLocal = (index: number, field: keyof CondicaoTempoParado, value: any) => {
    const newCondicoes = [...condicoesLocal];
    newCondicoes[index] = { ...newCondicoes[index], [field]: value };
    setCondicoesLocal(newCondicoes);
  };

  const saveCondicoesTempo = () => {
    updateConfig('condicoes_tempo', condicoesLocal);
  };

  const removeCondicaoTempo = (index: number) => {
    if (condicoesLocal.length <= 1) return;
    const newCondicoes = condicoesLocal.filter((_, i) => i !== index);
    setCondicoesLocal(newCondicoes);
    updateConfig('condicoes_tempo', newCondicoes);
  };

  const renderConfigFields = () => {
    switch (blockType) {
      case 'condicao_parado':
        return (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="font-medium">Condições de tempo</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addCondicaoTempo}
                  className="h-7 px-2"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Adicionar
                </Button>
              </div>
              
              <div className="space-y-3">
                {condicoesLocal.map((condicao, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 border rounded-md bg-muted/30">
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">Tempo (min)</Label>
                      <Input
                        type="number"
                        value={condicao.tempo_minutos}
                        onChange={(e) => updateCondicaoTempoLocal(index, 'tempo_minutos', parseInt(e.target.value) || 1)}
                        onBlur={saveCondicoesTempo}
                        min={1}
                        className="h-8"
                      />
                    </div>
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">Label (opcional)</Label>
                      <Input
                        value={condicao.label || ''}
                        onChange={(e) => updateCondicaoTempoLocal(index, 'label', e.target.value)}
                        onBlur={saveCondicoesTempo}
                        placeholder={`${condicao.tempo_minutos} min`}
                        className="h-8"
                      />
                    </div>
                    {condicoesLocal.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCondicaoTempo(index)}
                        className="h-8 w-8 p-0 mt-4 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              
              <p className="text-xs text-muted-foreground mt-2">
                Dispara quando o veículo ficar parado por qualquer um dos tempos especificados. Use o bloco "Marcar no Mapa" para adicionar marcadores visuais.
              </p>
            </div>
          </div>
        );

      case 'acao_marcar_mapa':
        return (
          <div className="space-y-4">
            <div>
              <Label>Ícone de marcação</Label>
              <IconePicker
                selectedIcon={config.icone_parada || 'MapPin'}
                selectedColor={config.cor_icone_parada || '#EAB308'}
                onIconChange={(icon) => updateConfig('icone_parada', icon)}
                onColorChange={(color) => updateConfig('cor_icone_parada', color)}
              />
            </div>
            
            <div>
              <Label>Legenda do marcador</Label>
              <Input
                value={legendaLocal}
                onChange={(e) => setLegendaLocal(e.target.value)}
                onBlur={() => updateConfig('legenda_parada', legendaLocal)}
                placeholder="Ex: Veículo parado"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Texto exibido ao clicar no marcador no mapa
              </p>
            </div>
            
            <p className="text-xs text-muted-foreground border-t pt-3">
              Este marcador aparecerá no mapa de monitoramento quando a automação for executada. Apenas o último marcador será exibido para cada veículo.
            </p>
          </div>
        );

      case 'condicao_velocidade':
        return (
          <div className="space-y-4">
            <div>
              <Label>Operador</Label>
              <Select
                value={config.operador_velocidade || 'maior'}
                onValueChange={(value) => updateConfig('operador_velocidade', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="maior">Maior que</SelectItem>
                  <SelectItem value="menor">Menor que</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Velocidade (km/h)</Label>
              <Input
                type="number"
                value={config.velocidade_km || 80}
                onChange={(e) => updateConfig('velocidade_km', parseInt(e.target.value) || 0)}
                min={1}
              />
            </div>
          </div>
        );

      case 'condicao_chegada':
        return (
          <div className="space-y-4">
            <div>
              <Label>Endereço do destino</Label>
              <AddressAutocomplete
                value={config.endereco || ''}
                onChange={(value) => updateConfig('endereco', value)}
                onSelect={(address, lat, lng) => {
                  onUpdateNode(selectedNode.id, {
                    config: { 
                      ...config, 
                      endereco: address,
                      lat,
                      lng
                    }
                  });
                }}
                placeholder="Digite o endereço..."
              />
            </div>
            <div>
              <Label>Raio de proximidade (metros)</Label>
              <Input
                type="number"
                value={config.raio_metros || 100}
                onChange={(e) => updateConfig('raio_metros', parseInt(e.target.value) || 100)}
                min={10}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Distância considerada como "chegou ao destino"
              </p>
            </div>
          </div>
        );

      case 'condicao_horario':
        return (
          <div className="space-y-4">
            <div>
              <Label>Horário de início</Label>
              <Input
                type="time"
                value={config.horario_inicio || '08:00'}
                onChange={(e) => updateConfig('horario_inicio', e.target.value)}
              />
            </div>
            <div>
              <Label>Horário de fim</Label>
              <Input
                type="time"
                value={config.horario_fim || '18:00'}
                onChange={(e) => updateConfig('horario_fim', e.target.value)}
              />
            </div>
            <div>
              <Label>Dias da semana</Label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'].map(dia => {
                  const dias = config.dias_semana || ['seg', 'ter', 'qua', 'qui', 'sex'];
                  return (
                    <div key={dia} className="flex items-center gap-1">
                      <Checkbox
                        id={`dia-${dia}`}
                        checked={dias.includes(dia)}
                        onCheckedChange={(checked) => {
                          const newDias = checked
                            ? [...dias, dia]
                            : dias.filter((d: string) => d !== dia);
                          updateConfig('dias_semana', newDias);
                        }}
                      />
                      <Label htmlFor={`dia-${dia}`} className="text-xs capitalize">{dia}</Label>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );

      case 'acao_whatsapp': {
        const destino = config.destino_tipo
          || (config.usar_telefone_cliente ? 'cliente' : 'numero');
        return (
          <div className="space-y-4">
            <div>
              <Label>Sessão de WhatsApp (canal de envio)</Label>
              <Select
                value={config.whatsappSessionId || '__first__'}
                onValueChange={(v) => {
                  const val = v === '__first__' ? null : v;
                  updateConfig('whatsappSessionId', val);
                  const s = sessoesWhats.find((s) => s.id === val);
                  updateConfig('whatsappSessionName', s?.session_name || null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar sessão" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__first__">Primeira sessão disponível</SelectItem>
                  {sessoesWhats.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.session_name}{s.phone_number ? ` — ${s.phone_number}` : ''}{s.status && s.status !== 'WORKING' ? ` (${s.status})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground mt-1">
                Escolha por qual sessão de WhatsApp (aba <b>Canais → WhatsApp</b>) a mensagem será enviada.
              </p>
            </div>


            <div>
              <Label>Destinatário</Label>
              <Select
                value={destino}
                onValueChange={(v) => {
                  updateConfig('destino_tipo', v);
                  updateConfig('usar_telefone_cliente', v === 'cliente');
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="numero">Número fixo</SelectItem>
                  <SelectItem value="cliente">Telefone do cliente da entrega</SelectItem>
                  <SelectItem value="motorista_atual">Motorista atual do veículo</SelectItem>
                </SelectContent>
              </Select>
              {destino === 'motorista_atual' && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  A mensagem será enviada para o WhatsApp do motorista que está dirigindo o veículo no momento (baseado na saída registrada em Controle de Veículos).
                </p>
              )}
            </div>

            {destino === 'numero' && (
              <div>
                <Label>Telefone de destino</Label>
                <Input
                  value={config.telefone || ''}
                  onChange={(e) => updateConfig('telefone', e.target.value)}
                  placeholder="5511999999999"
                />
              </div>
            )}
            <div>
              <Label>Mensagem</Label>
              <Textarea
                value={config.mensagem || ''}
                onChange={(e) => updateConfig('mensagem', e.target.value)}
                placeholder="Digite a mensagem..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Variáveis: {'{placa}'}, {'{motorista}'}, {'{endereco}'}, {'{velocidade}'}
              </p>
            </div>

            <div className="flex items-start gap-2 rounded-md border p-3">
              <Checkbox
                id="enviar_localizacao"
                checked={!!config.enviar_localizacao}
                onCheckedChange={(v) => updateConfig('enviar_localizacao', !!v)}
              />
              <div className="space-y-0.5">
                <Label htmlFor="enviar_localizacao" className="text-sm cursor-pointer">
                  Enviar localização atual do veículo (Google Maps)
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Adiciona um link do Google Maps logo abaixo da mensagem com a última posição registrada do veículo.
                </p>
              </div>
            </div>
          </div>
        );
      }


      case 'acao_notificacao':
        return (
          <div className="space-y-4">
            <div>
              <Label>Destinatário</Label>
              <Select
                value={config.destinatario_tipo || 'todos'}
                onValueChange={(value) => updateConfig('destinatario_tipo', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os usuários</SelectItem>
                  <SelectItem value="usuario">Usuário específico</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {config.destinatario_tipo === 'usuario' && (
              <div>
                <Label>Selecione o Usuário</Label>
                <Select
                  value={config.usuario_id || ''}
                  onValueChange={(value) => updateConfig('usuario_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingUsuarios ? "Carregando..." : "Selecione..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {usuarios.map((usuario) => (
                      <SelectItem key={usuario.id} value={usuario.id}>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span>{usuario.nome}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div>
              <Label>Título da notificação</Label>
              <Input
                value={config.titulo_notificacao || ''}
                onChange={(e) => updateConfig('titulo_notificacao', e.target.value)}
                placeholder="Ex: Alerta de veículo parado"
              />
            </div>
            <div>
              <Label>Corpo da notificação</Label>
              <Textarea
                value={config.corpo_notificacao || ''}
                onChange={(e) => updateConfig('corpo_notificacao', e.target.value)}
                placeholder="Digite o conteúdo..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Variáveis: {'{placa}'}, {'{motorista}'}, {'{endereco}'}, {'{velocidade}'}
              </p>
            </div>
            <EnviarLocalizacaoCheckbox config={config} updateConfig={updateConfig} />
          </div>
        );

      case 'acao_email':
        return (
          <div className="space-y-4">
            <div>
              <Label>E-mail de destino</Label>
              <Input
                type="email"
                value={config.email_destino || ''}
                onChange={(e) => updateConfig('email_destino', e.target.value)}
                placeholder="email@exemplo.com"
              />
            </div>
            <div>
              <Label>Assunto</Label>
              <Input
                value={config.assunto_email || ''}
                onChange={(e) => updateConfig('assunto_email', e.target.value)}
                placeholder="Assunto do e-mail"
              />
            </div>
            <div>
              <Label>Corpo do e-mail</Label>
              <Textarea
                value={config.corpo_email || ''}
                onChange={(e) => updateConfig('corpo_email', e.target.value)}
                placeholder="Conteúdo do e-mail..."
                rows={4}
              />
            </div>
          </div>
        );

      case 'disparar_push':
        return <PushBlockConfigEditor
          value={config as any}
          onChange={(patch) => Object.entries(patch).forEach(([k, v]) => updateConfig(k, v))}
          context="logistica"
        />;

      case 'enviar_sms':
        return <SmsBlockConfig
          config={{ ...config, message: (config as any).mensagem || (config as any).message || '' }}
          onChange={(key, value) => updateConfig(key === 'message' ? 'mensagem' : key, value)}
        />;

      default:
        return (
          <p className="text-sm text-muted-foreground">
            Este bloco não possui configurações adicionais.
          </p>
        );
    }
  };

  return (
    <div className="workflow-props animate-slide-in-right w-80 h-[calc(100%-1rem)] m-2 rounded-2xl border-2 border-white dark:border-white/10 bg-gradient-to-b from-background to-border shadow-lg flex flex-col overflow-x-hidden">
      <div className="p-4 border-b">
        <h3 className="font-semibold">Propriedades</h3>
        <p className="text-sm text-muted-foreground">{blockDef?.label || nodeData.label}</p>
      </div>
      <ScrollArea className="flex-1 p-4">
        {renderConfigFields()}
      </ScrollArea>
    </div>
  );
}
