import { Node } from "@xyflow/react";
import { ADS_BLOCK_DEFINITIONS, AdsFlowNodeData } from "@/types/adsFlow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Settings, AlertCircle, AlertTriangle, CheckCircle, Info } from "lucide-react";
import * as Icons from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { UserSelector, MultiUserSelector } from "@/components/flow/block-configs/UserSelector";
import { PushBlockConfigEditor } from "@/components/workflows/PushBlockConfig";

interface AdsPropertiesPanelProps {
  selectedNode: Node | null;
  onUpdateNode: (nodeId: string, data: Partial<AdsFlowNodeData>) => void;
  onClose: () => void;
}

export const AdsPropertiesPanel = ({ selectedNode, onUpdateNode, onClose }: AdsPropertiesPanelProps) => {
  if (!selectedNode) return null;

  const nodeData = selectedNode.data as unknown as AdsFlowNodeData;
  const blockDef = ADS_BLOCK_DEFINITIONS.find(b => b.type === nodeData.type);
  
  if (!blockDef) return null;

  const IconComponent = Icons[blockDef.icon as keyof typeof Icons] as any;

  const handleConfigChange = (key: string, value: any) => {
    onUpdateNode(selectedNode.id, {
      config: {
        ...nodeData.config,
        [key]: value
      }
    });
  };

  const renderConfigFields = () => {
    switch (nodeData.type) {
      case 'trigger_roas':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Limite de ROAS</Label>
              <Input
                type="number"
                step="0.1"
                value={nodeData.config?.threshold || 1}
                onChange={(e) => handleConfigChange('threshold', parseFloat(e.target.value))}
                placeholder="Ex: 1.5"
              />
              <p className="text-xs text-muted-foreground">Disparar quando ROAS estiver abaixo deste valor</p>
            </div>
          </div>
        );

      case 'trigger_spend':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Limite de Gasto (R$)</Label>
              <Input
                type="number"
                value={nodeData.config?.threshold || 1000}
                onChange={(e) => handleConfigChange('threshold', parseFloat(e.target.value))}
                placeholder="Ex: 1000"
              />
              <p className="text-xs text-muted-foreground">Disparar quando gasto ultrapassar este valor</p>
            </div>
          </div>
        );

      case 'trigger_cpc':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Limite de CPC (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={nodeData.config?.threshold || 5}
                onChange={(e) => handleConfigChange('threshold', parseFloat(e.target.value))}
                placeholder="Ex: 5.00"
              />
              <p className="text-xs text-muted-foreground">Disparar quando CPC estiver acima deste valor</p>
            </div>
          </div>
        );

      case 'trigger_ctr':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Limite de CTR (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={nodeData.config?.threshold || 1}
                onChange={(e) => handleConfigChange('threshold', parseFloat(e.target.value))}
                placeholder="Ex: 1.0"
              />
              <p className="text-xs text-muted-foreground">Disparar quando CTR estiver abaixo deste valor</p>
            </div>
          </div>
        );

      case 'trigger_conversions':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Horas sem Conversão</Label>
              <Input
                type="number"
                value={nodeData.config?.hours || 24}
                onChange={(e) => handleConfigChange('hours', parseInt(e.target.value))}
                placeholder="Ex: 24"
              />
              <p className="text-xs text-muted-foreground">Disparar após X horas sem conversões</p>
            </div>
          </div>
        );

      case 'trigger_impressions':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Mínimo de Impressões</Label>
              <Input
                type="number"
                value={nodeData.config?.threshold || 100}
                onChange={(e) => handleConfigChange('threshold', parseInt(e.target.value))}
                placeholder="Ex: 100"
              />
              <p className="text-xs text-muted-foreground">Disparar quando impressões estiverem abaixo</p>
            </div>
          </div>
        );

      case 'trigger_schedule':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Expressão Cron</Label>
              <Input
                value={nodeData.config?.cron || '0 9 * * *'}
                onChange={(e) => handleConfigChange('cron', e.target.value)}
                placeholder="0 9 * * *"
              />
              <p className="text-xs text-muted-foreground">Formato: minuto hora dia mês dia_semana</p>
            </div>
          </div>
        );

      case 'condition_platform':
        const platforms = ['google_ads', 'meta_ads', 'tiktok_ads', 'mercadolivre_ads', 'amazon_ads'];
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Plataformas</Label>
              <div className="space-y-2">
                {platforms.map(platform => (
                  <div key={platform} className="flex items-center space-x-2">
                    <Checkbox
                      id={platform}
                      checked={(nodeData.config?.platforms || []).includes(platform)}
                      onCheckedChange={(checked) => {
                        const current = nodeData.config?.platforms || [];
                        const updated = checked 
                          ? [...current, platform]
                          : current.filter((p: string) => p !== platform);
                        handleConfigChange('platforms', updated);
                      }}
                    />
                    <Label htmlFor={platform} className="text-sm font-normal">
                      {platform.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'condition_campaign':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome Contém</Label>
              <Input
                value={nodeData.config?.nameContains || ''}
                onChange={(e) => handleConfigChange('nameContains', e.target.value)}
                placeholder="Ex: Black Friday"
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Campanha</Label>
              <Select
                value={nodeData.config?.campaignType || ''}
                onValueChange={(value) => handleConfigChange('campaignType', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Qualquer tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Qualquer</SelectItem>
                  <SelectItem value="search">Pesquisa</SelectItem>
                  <SelectItem value="display">Display</SelectItem>
                  <SelectItem value="video">Vídeo</SelectItem>
                  <SelectItem value="shopping">Shopping</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'condition_time':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Hora Início</Label>
                <Input
                  type="number"
                  min="0"
                  max="23"
                  value={nodeData.config?.startHour || 9}
                  onChange={(e) => handleConfigChange('startHour', parseInt(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Hora Fim</Label>
                <Input
                  type="number"
                  min="0"
                  max="23"
                  value={nodeData.config?.endHour || 18}
                  onChange={(e) => handleConfigChange('endHour', parseInt(e.target.value))}
                />
              </div>
            </div>
          </div>
        );

      case 'condition_metric':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Métrica</Label>
              <Select
                value={nodeData.config?.metric || 'ctr'}
                onValueChange={(value) => handleConfigChange('metric', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ctr">CTR</SelectItem>
                  <SelectItem value="cpc">CPC</SelectItem>
                  <SelectItem value="cpm">CPM</SelectItem>
                  <SelectItem value="roas">ROAS</SelectItem>
                  <SelectItem value="conversions">Conversões</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Operador</Label>
              <Select
                value={nodeData.config?.operator || '>'}
                onValueChange={(value) => handleConfigChange('operator', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=">">Maior que</SelectItem>
                  <SelectItem value="<">Menor que</SelectItem>
                  <SelectItem value=">=">Maior ou igual</SelectItem>
                  <SelectItem value="<=">Menor ou igual</SelectItem>
                  <SelectItem value="=">Igual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor</Label>
              <Input
                type="number"
                step="0.01"
                value={nodeData.config?.value || 0}
                onChange={(e) => handleConfigChange('value', parseFloat(e.target.value))}
              />
            </div>
          </div>
        );

      case 'action_pause':
      case 'action_resume':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nível</Label>
              <Select
                value={nodeData.config?.level || 'campaign'}
                onValueChange={(value) => handleConfigChange('level', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="campaign">Campanha</SelectItem>
                  <SelectItem value="adset">Conjunto de Anúncios</SelectItem>
                  <SelectItem value="ad">Anúncio</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'action_budget_decrease':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Percentual de Redução (%)</Label>
              <Input
                type="number"
                min="1"
                max="100"
                value={nodeData.config?.percentage || 20}
                onChange={(e) => handleConfigChange('percentage', parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Orçamento Mínimo (R$)</Label>
              <Input
                type="number"
                min="0"
                value={nodeData.config?.minBudget || 10}
                onChange={(e) => handleConfigChange('minBudget', parseFloat(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">Não reduzir abaixo deste valor</p>
            </div>
          </div>
        );

      case 'action_budget_increase':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Percentual de Aumento (%)</Label>
              <Input
                type="number"
                min="1"
                max="500"
                value={nodeData.config?.percentage || 20}
                onChange={(e) => handleConfigChange('percentage', parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Orçamento Máximo (R$)</Label>
              <Input
                type="number"
                min="0"
                value={nodeData.config?.maxBudget || 1000}
                onChange={(e) => handleConfigChange('maxBudget', parseFloat(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">Não aumentar acima deste valor</p>
            </div>
          </div>
        );

      case 'action_notify':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Mensagem</Label>
              <Textarea
                value={nodeData.config?.message || ''}
                onChange={(e) => handleConfigChange('message', e.target.value)}
                placeholder="Mensagem da notificação..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Canais</Label>
              <div className="space-y-2">
                {['app', 'email', 'whatsapp'].map(channel => (
                  <div key={channel} className="flex items-center space-x-2">
                    <Checkbox
                      id={channel}
                      checked={(nodeData.config?.channels || ['app']).includes(channel)}
                      onCheckedChange={(checked) => {
                        const current = nodeData.config?.channels || ['app'];
                        const updated = checked 
                          ? [...current, channel]
                          : current.filter((c: string) => c !== channel);
                        handleConfigChange('channels', updated);
                      }}
                    />
                    <Label htmlFor={channel} className="text-sm font-normal capitalize">
                      {channel === 'app' ? 'Aplicativo' : channel === 'email' ? 'E-mail' : 'WhatsApp'}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'action_webhook':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>URL do Webhook</Label>
              <Input
                value={nodeData.config?.url || ''}
                onChange={(e) => handleConfigChange('url', e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label>Método HTTP</Label>
              <Select
                value={nodeData.config?.method || 'POST'}
                onValueChange={(value) => handleConfigChange('method', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'action_email':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Destinatário</Label>
              <Input
                type="email"
                value={nodeData.config?.to || ''}
                onChange={(e) => handleConfigChange('to', e.target.value)}
                placeholder="email@exemplo.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Assunto</Label>
              <Input
                value={nodeData.config?.subject || ''}
                onChange={(e) => handleConfigChange('subject', e.target.value)}
                placeholder="Alerta de Campanha"
              />
            </div>
            <div className="space-y-2">
              <Label>Mensagem</Label>
              <Textarea
                value={nodeData.config?.body || ''}
                onChange={(e) => handleConfigChange('body', e.target.value)}
                placeholder="Corpo do email..."
                rows={4}
              />
            </div>
          </div>
        );

      case 'action_bid_adjust':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Ajuste</Label>
              <Select
                value={nodeData.config?.type || 'percentage'}
                onValueChange={(value) => handleConfigChange('type', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentual</SelectItem>
                  <SelectItem value="absolute">Valor Absoluto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ajuste {nodeData.config?.type === 'percentage' ? '(%)' : '(R$)'}</Label>
              <Input
                type="number"
                value={nodeData.config?.adjustment || 0}
                onChange={(e) => handleConfigChange('adjustment', parseFloat(e.target.value))}
                placeholder="Ex: 10 ou -10"
              />
              <p className="text-xs text-muted-foreground">Use valores negativos para reduzir</p>
            </div>
          </div>
        );

      case 'action_aviso_sistema':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título do Aviso</Label>
              <Input
                value={nodeData.config?.titulo || ''}
                onChange={(e) => handleConfigChange('titulo', e.target.value)}
                placeholder="Ex: Alerta de campanha"
              />
            </div>
            <div className="space-y-2">
              <Label>Mensagem</Label>
              <Textarea
                value={nodeData.config?.mensagem || ''}
                onChange={(e) => handleConfigChange('mensagem', e.target.value)}
                placeholder="Conteúdo do aviso..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo do Aviso</Label>
              <Select
                value={nodeData.config?.tipo || 'info'}
                onValueChange={(value) => handleConfigChange('tipo', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4 text-blue-500" />
                      Informação
                    </div>
                  </SelectItem>
                  <SelectItem value="sucesso">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Sucesso
                    </div>
                  </SelectItem>
                  <SelectItem value="alerta">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      Alerta
                    </div>
                  </SelectItem>
                  <SelectItem value="urgente">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      Urgente
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Destinatários</Label>
              <Select
                value={nodeData.config?.destinatarios_tipo || 'todos'}
                onValueChange={(value) => handleConfigChange('destinatarios_tipo', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os usuários</SelectItem>
                  <SelectItem value="usuarios_especificos">Usuários específicos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {nodeData.config?.destinatarios_tipo === 'usuarios_especificos' && (
              <MultiUserSelector
                value={nodeData.config?.destinatarios_ids || []}
                onChange={(value) => handleConfigChange('destinatarios_ids', value)}
                label="Selecione os Usuários"
              />
            )}
          </div>
        );

      case 'action_mensagem_interna':
        return (
          <div className="space-y-4">
            <UserSelector
              value={nodeData.config?.usuario_id || ''}
              onChange={(value) => handleConfigChange('usuario_id', value)}
              label="Destinatário"
              placeholder="Selecione o usuário"
            />
            <div className="space-y-2">
              <Label>Mensagem</Label>
              <Textarea
                value={nodeData.config?.mensagem || ''}
                onChange={(e) => handleConfigChange('mensagem', e.target.value)}
                placeholder="Conteúdo da mensagem..."
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>Título da Conversa (opcional)</Label>
              <Input
                value={nodeData.config?.titulo_conversa || ''}
                onChange={(e) => handleConfigChange('titulo_conversa', e.target.value)}
                placeholder="Será usado ao criar nova conversa"
              />
            </div>
          </div>
        );

      case 'disparar_push':
        return <PushBlockConfigEditor
          value={(selectedNode.data as any).config || {}}
          onChange={(patch) => onUpdateNode(selectedNode.id, {
            config: { ...((selectedNode.data as any).config || {}), ...patch },
          })}
          context="ads"
        />;

      case 'enviar_sms':
        return <SmsBlockConfig
          config={(selectedNode.data as any).config || {}}
          onChange={(key, value) => handleConfigChange(key, value)}
        />;

      default:
        return (
          <p className="text-sm text-muted-foreground">
            Configuração não disponível para este bloco.
          </p>
        );
    }
  };

  return (
    <Card className="workflow-props animate-slide-in-right w-80 h-[calc(100%-1rem)] m-2 rounded-2xl border-2 border-white dark:border-white/10 bg-gradient-to-b from-background to-border shadow-lg flex flex-col overflow-x-hidden">
      <CardHeader className="pb-3 border-b flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {IconComponent && (
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                <IconComponent className="w-4 h-4 text-primary" />
              </div>
            )}
            <CardTitle className="text-base">{blockDef.label}</CardTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{blockDef.description}</p>
      </CardHeader>
      
      <ScrollArea className="flex-1">
        <CardContent className="p-4 space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Configurações
            </Label>
          </div>
          
          {renderConfigFields()}
        </CardContent>
      </ScrollArea>
    </Card>
  );
};
