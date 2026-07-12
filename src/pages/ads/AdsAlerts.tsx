import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { 
  Plus, Bell, BellRing, Mail, MessageSquare, Trash2, Edit,
  Loader2, AlertTriangle, TrendingDown, TrendingUp, DollarSign,
  Target, Percent, Eye
} from "lucide-react";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";

const alertConditions = [
  { id: 'roas_below', label: 'ROAS abaixo de', icon: TrendingDown, metric: 'ROAS', unit: 'x' },
  { id: 'roas_above', label: 'ROAS acima de', icon: TrendingUp, metric: 'ROAS', unit: 'x' },
  { id: 'spend_above', label: 'Gasto acima de', icon: DollarSign, metric: 'Gasto', unit: 'R$' },
  { id: 'spend_below', label: 'Gasto abaixo de', icon: DollarSign, metric: 'Gasto', unit: 'R$' },
  { id: 'cpc_above', label: 'CPC acima de', icon: DollarSign, metric: 'CPC', unit: 'R$' },
  { id: 'ctr_below', label: 'CTR abaixo de', icon: Percent, metric: 'CTR', unit: '%' },
  { id: 'conversions_below', label: 'Conversões abaixo de', icon: Target, metric: 'Conversões', unit: '' },
  { id: 'impressions_below', label: 'Impressões abaixo de', icon: Eye, metric: 'Impressões', unit: '' },
];

const notificationChannels = [
  { id: 'app', label: 'Notificação no App', icon: Bell },
  { id: 'email', label: 'E-mail', icon: Mail },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
];

interface Alert {
  id: string;
  name: string;
  condition: string;
  threshold: number;
  channels: string[];
  platforms: string[];
  enabled: boolean;
  createdAt: string;
}

export default function AdsAlerts() {
  const queryClient = useQueryClient();
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingAlert, setEditingAlert] = useState<Alert | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [newAlert, setNewAlert] = useState({
    name: '',
    condition: 'roas_below',
    threshold: 1,
    channels: ['app'] as string[],
    platforms: [] as string[],
  });

  useEffect(() => {
    getEstabelecimentoId().then(setEstabelecimentoId);
  }, []);

  const { data: platforms } = useQuery({
    queryKey: ["ad_platforms"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ad_platforms").select("*").eq("ativo", true);
      if (error) throw error;
      return data;
    },
  });

  const handleCreateAlert = () => {
    if (!newAlert.name.trim()) {
      toast.error("Nome do alerta é obrigatório");
      return;
    }

    const alert: Alert = {
      id: Date.now().toString(),
      name: newAlert.name,
      condition: newAlert.condition,
      threshold: newAlert.threshold,
      channels: newAlert.channels,
      platforms: newAlert.platforms,
      enabled: true,
      createdAt: new Date().toISOString(),
    };

    setAlerts(prev => [alert, ...prev]);
    setShowCreateDialog(false);
    setNewAlert({
      name: '',
      condition: 'roas_below',
      threshold: 1,
      channels: ['app'],
      platforms: [],
    });
    toast.success("Alerta criado com sucesso!");
  };

  const handleToggleAlert = (alertId: string) => {
    setAlerts(prev => prev.map(a => 
      a.id === alertId ? { ...a, enabled: !a.enabled } : a
    ));
  };

  const handleDeleteAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(a => a.id !== alertId));
    toast.success("Alerta excluído");
  };

  const toggleChannel = (channelId: string) => {
    setNewAlert(prev => ({
      ...prev,
      channels: prev.channels.includes(channelId)
        ? prev.channels.filter(c => c !== channelId)
        : [...prev.channels, channelId]
    }));
  };

  const togglePlatform = (platformId: string) => {
    setNewAlert(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platformId)
        ? prev.platforms.filter(p => p !== platformId)
        : [...prev.platforms, platformId]
    }));
  };

  const getConditionConfig = (conditionId: string) => {
    return alertConditions.find(c => c.id === conditionId);
  };

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Alertas
            </h1>
            <p className="text-muted-foreground mt-1">
              Configure alertas para monitorar suas campanhas
            </p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Alerta
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Criar Alerta</DialogTitle>
                <DialogDescription>Configure quando você deseja ser notificado</DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh]">
                <div className="space-y-6 p-1">
                  {/* Nome */}
                  <div className="space-y-2">
                    <Label>Nome do Alerta</Label>
                    <Input
                      placeholder="Ex: ROAS baixo - Google Ads"
                      value={newAlert.name}
                      onChange={(e) => setNewAlert(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>

                  {/* Condição */}
                  <div className="space-y-2">
                    <Label>Condição</Label>
                    <Select
                      value={newAlert.condition}
                      onValueChange={(v) => setNewAlert(prev => ({ ...prev, condition: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {alertConditions.map(condition => {
                          const Icon = condition.icon;
                          return (
                            <SelectItem key={condition.id} value={condition.id}>
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4" />
                                {condition.label}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Valor */}
                  <div className="space-y-2">
                    <Label>Valor limite</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.1"
                        value={newAlert.threshold}
                        onChange={(e) => setNewAlert(prev => ({ ...prev, threshold: parseFloat(e.target.value) }))}
                        className="flex-1"
                      />
                      <span className="text-sm text-muted-foreground w-12">
                        {getConditionConfig(newAlert.condition)?.unit}
                      </span>
                    </div>
                  </div>

                  <Separator />

                  {/* Canais de notificação */}
                  <div className="space-y-2">
                    <Label>Notificar via</Label>
                    <div className="space-y-2">
                      {notificationChannels.map(channel => {
                        const Icon = channel.icon;
                        return (
                          <div key={channel.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={channel.id}
                              checked={newAlert.channels.includes(channel.id)}
                              onCheckedChange={() => toggleChannel(channel.id)}
                            />
                            <Label htmlFor={channel.id} className="flex items-center gap-2 text-sm font-normal">
                              <Icon className="h-4 w-4" />
                              {channel.label}
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <Separator />

                  {/* Plataformas */}
                  <div className="space-y-2">
                    <Label>Plataformas (deixe vazio para todas)</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {platforms?.map(platform => (
                        <div key={platform.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`platform-${platform.id}`}
                            checked={newAlert.platforms.includes(platform.id)}
                            onCheckedChange={() => togglePlatform(platform.id)}
                          />
                          <Label htmlFor={`platform-${platform.id}`} className="text-sm font-normal">
                            {platform.nome_display}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </ScrollArea>
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateAlert}>
                  Criar Alerta
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Bell className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Total</span>
              </div>
              <p className="text-2xl font-bold">{alerts.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <BellRing className="h-4 w-4 text-green-500" />
                <span className="text-xs text-muted-foreground">Ativos</span>
              </div>
              <p className="text-2xl font-bold text-green-500">{alerts.filter(a => a.enabled).length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <span className="text-xs text-muted-foreground">Disparados Hoje</span>
              </div>
              <p className="text-2xl font-bold text-yellow-500">0</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Mail className="h-4 w-4 text-blue-500" />
                <span className="text-xs text-muted-foreground">Emails Enviados</span>
              </div>
              <p className="text-2xl font-bold text-blue-500">0</p>
            </CardContent>
          </Card>
        </div>

        {/* Alerts List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Alertas Configurados</CardTitle>
            <CardDescription>Gerencie suas regras de alerta</CardDescription>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Nenhum alerta configurado</p>
                <p className="text-sm">Crie alertas para ser notificado sobre mudanças importantes</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {alerts.map(alert => {
                    const conditionConfig = getConditionConfig(alert.condition);
                    const Icon = conditionConfig?.icon || Bell;
                    
                    return (
                      <div
                        key={alert.id}
                        className={`flex items-center justify-between p-4 rounded-lg transition-colors ${
                          alert.enabled ? 'bg-muted/30 hover:bg-muted/50' : 'bg-muted/10 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-lg ${alert.enabled ? 'bg-primary/10' : 'bg-muted'}`}>
                            <Icon className={`h-5 w-5 ${alert.enabled ? 'text-primary' : 'text-muted-foreground'}`} />
                          </div>
                          <div>
                            <p className="font-medium">{alert.name}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{conditionConfig?.label} {alert.threshold}{conditionConfig?.unit}</span>
                              <span>•</span>
                              <div className="flex items-center gap-1">
                                {alert.channels.map(channelId => {
                                  const channel = notificationChannels.find(c => c.id === channelId);
                                  const ChannelIcon = channel?.icon || Bell;
                                  return <ChannelIcon key={channelId} className="h-3 w-3" />;
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
                          <Switch
                            checked={alert.enabled}
                            onCheckedChange={() => handleToggleAlert(alert.id)}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteAlert(alert.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
