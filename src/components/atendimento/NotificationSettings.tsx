import { useEffect, useState } from "react";
import { ArrowLeft, Bell, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNotifications, NotificationConfig } from "@/hooks/useNotifications";

interface NotificationSettingsProps {
  userId: string;
  estabelecimentoId: string;
  onClose: () => void;
}

export function NotificationSettings({
  userId,
  estabelecimentoId,
  onClose,
}: NotificationSettingsProps) {
  const { config, updateConfig, permissionGranted, checkPermission } = useNotifications(
    userId,
    estabelecimentoId
  );
  const [localConfig, setLocalConfig] = useState<NotificationConfig | null>(null);

  useEffect(() => {
    if (config) {
      setLocalConfig(config);
    }
  }, [config]);

  const handleSave = () => {
    if (localConfig) {
      updateConfig(localConfig);
    }
  };

  const handleRequestPermission = async () => {
    await checkPermission();
  };

  if (!localConfig) {
    return <div className="p-4">Carregando...</div>;
  }

  return (
    <div className="w-96 p-0">
      <div className="flex items-center gap-2 p-4 border-b">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h3 className="font-semibold text-lg">Configurações de Notificações</h3>
      </div>

      <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
        {/* Notificações Desktop */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notificações do Navegador
            </CardTitle>
            <CardDescription className="text-xs">
              {permissionGranted
                ? "Permissão concedida"
                : "Permissão necessária para notificações desktop"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!permissionGranted && (
              <Button onClick={handleRequestPermission} size="sm" className="w-full">
                Permitir Notificações
              </Button>
            )}
            <div className="flex items-center justify-between">
              <Label htmlFor="desktop-notifications" className="text-sm">
                Ativar notificações desktop
              </Label>
              <Switch
                id="desktop-notifications"
                checked={localConfig.desktop_notification_enabled}
                onCheckedChange={(checked) =>
                  setLocalConfig({ ...localConfig, desktop_notification_enabled: checked })
                }
                disabled={!permissionGranted}
              />
            </div>
          </CardContent>
        </Card>

        {/* Sons */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Volume2 className="h-4 w-4" />
              Sons
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="sound-enabled" className="text-sm">
                Ativar sons
              </Label>
              <Switch
                id="sound-enabled"
                checked={localConfig.som_enabled}
                onCheckedChange={(checked) =>
                  setLocalConfig({ ...localConfig, som_enabled: checked })
                }
              />
            </div>
            {localConfig.som_enabled && (
              <div className="space-y-2">
                <Label htmlFor="volume" className="text-sm">
                  Volume: {localConfig.volume}%
                </Label>
                <Slider
                  id="volume"
                  min={0}
                  max={100}
                  step={10}
                  value={[localConfig.volume]}
                  onValueChange={([value]) =>
                    setLocalConfig({ ...localConfig, volume: value })
                  }
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tipos de Notificações */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Tipos de Notificações</CardTitle>
            <CardDescription className="text-xs">
              Escolha quais eventos gerar notificações
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="novo-chat" className="text-sm">
                Novo chat
              </Label>
              <Switch
                id="novo-chat"
                checked={localConfig.novo_chat_enabled}
                onCheckedChange={(checked) =>
                  setLocalConfig({ ...localConfig, novo_chat_enabled: checked })
                }
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label htmlFor="cliente-respondeu" className="text-sm">
                Cliente respondeu
              </Label>
              <Switch
                id="cliente-respondeu"
                checked={localConfig.cliente_respondeu_enabled}
                onCheckedChange={(checked) =>
                  setLocalConfig({ ...localConfig, cliente_respondeu_enabled: checked })
                }
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label htmlFor="transferencia" className="text-sm">
                Transferência recebida
              </Label>
              <Switch
                id="transferencia"
                checked={localConfig.transferencia_recebida_enabled}
                onCheckedChange={(checked) =>
                  setLocalConfig({ ...localConfig, transferencia_recebida_enabled: checked })
                }
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label htmlFor="sla-alerta" className="text-sm">
                Alertas de SLA
              </Label>
              <Switch
                id="sla-alerta"
                checked={localConfig.sla_alerta_enabled}
                onCheckedChange={(checked) =>
                  setLocalConfig({ ...localConfig, sla_alerta_enabled: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button onClick={onClose} variant="outline" className="flex-1">
            Cancelar
          </Button>
          <Button onClick={handleSave} className="flex-1">
            Salvar
          </Button>
        </div>
      </div>
    </div>
  );
}
