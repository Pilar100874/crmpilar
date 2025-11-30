import { Node } from '@xyflow/react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LogisticaBlockType, LOGISTICA_BLOCKS } from '@/types/automacaoLogistica';
import { AddressAutocomplete } from '@/components/logistica/AddressAutocomplete';

interface LogisticaPropertiesPanelProps {
  selectedNode: Node | null;
  onUpdateNode: (nodeId: string, data: any) => void;
}

export function LogisticaPropertiesPanel({ selectedNode, onUpdateNode }: LogisticaPropertiesPanelProps) {
  if (!selectedNode) {
    return (
      <div className="w-80 border-l bg-card p-4">
        <p className="text-sm text-muted-foreground text-center mt-8">
          Selecione um bloco para editar suas propriedades
        </p>
      </div>
    );
  }

  const nodeData = selectedNode.data as any;
  const blockType = nodeData.type as LogisticaBlockType;
  const config = nodeData.config || {};
  const blockDef = LOGISTICA_BLOCKS.find(b => b.type === blockType);

  const updateConfig = (key: string, value: any) => {
    onUpdateNode(selectedNode.id, {
      config: { ...config, [key]: value }
    });
  };

  const renderConfigFields = () => {
    switch (blockType) {
      case 'condicao_parado':
        return (
          <div className="space-y-4">
            <div>
              <Label>Tempo parado (minutos)</Label>
              <Input
                type="number"
                value={config.tempo_minutos || 30}
                onChange={(e) => updateConfig('tempo_minutos', parseInt(e.target.value) || 0)}
                min={1}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Dispara quando o veículo ficar parado por mais tempo que o especificado
              </p>
            </div>
            
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Checkbox
                  id="marcar_no_mapa"
                  checked={config.marcar_no_mapa || false}
                  onCheckedChange={(checked) => updateConfig('marcar_no_mapa', checked)}
                />
                <Label htmlFor="marcar_no_mapa" className="font-medium">Marcar no mapa</Label>
              </div>
              
              {config.marcar_no_mapa && (
                <div className="space-y-3 pl-6">
                  <Label>Selecione o ícone de marcação</Label>
                  <div className="space-y-2">
                    <div 
                      className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors ${config.icone_parada === '10_20' ? 'border-yellow-500 bg-yellow-500/10' : 'hover:bg-muted'}`}
                      onClick={() => updateConfig('icone_parada', '10_20')}
                    >
                      <div className="w-6 h-6 rounded-full bg-yellow-500 border-2 border-white shadow flex items-center justify-center">
                        <span className="text-white text-xs font-bold">P</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Parado 10-20 min</p>
                        <p className="text-xs text-muted-foreground">Ícone amarelo</p>
                      </div>
                    </div>
                    
                    <div 
                      className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors ${config.icone_parada === '21_30' ? 'border-orange-500 bg-orange-500/10' : 'hover:bg-muted'}`}
                      onClick={() => updateConfig('icone_parada', '21_30')}
                    >
                      <div className="w-6 h-6 rounded-full bg-orange-500 border-2 border-white shadow flex items-center justify-center">
                        <span className="text-white text-xs font-bold">P</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Parado 21-30 min</p>
                        <p className="text-xs text-muted-foreground">Ícone laranja</p>
                      </div>
                    </div>
                    
                    <div 
                      className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors ${config.icone_parada === 'mais_30' ? 'border-red-600 bg-red-600/10' : 'hover:bg-muted'}`}
                      onClick={() => updateConfig('icone_parada', 'mais_30')}
                    >
                      <div className="w-6 h-6 rounded-full bg-red-600 border-2 border-white shadow flex items-center justify-center">
                        <span className="text-white text-xs font-bold">P</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Parado +30 min</p>
                        <p className="text-xs text-muted-foreground">Ícone vermelho</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Este ícone aparecerá no mapa de monitoramento e histórico quando a condição for atendida
                  </p>
                </div>
              )}
            </div>
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

      case 'acao_whatsapp':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="usar_telefone_cliente"
                checked={config.usar_telefone_cliente || false}
                onCheckedChange={(checked) => updateConfig('usar_telefone_cliente', checked)}
              />
              <Label htmlFor="usar_telefone_cliente">Usar telefone do cliente da entrega</Label>
            </div>
            {!config.usar_telefone_cliente && (
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
          </div>
        );

      case 'acao_notificacao':
        return (
          <div className="space-y-4">
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
            </div>
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

      default:
        return (
          <p className="text-sm text-muted-foreground">
            Este bloco não possui configurações adicionais.
          </p>
        );
    }
  };

  return (
    <div className="w-80 border-l bg-card flex flex-col">
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
