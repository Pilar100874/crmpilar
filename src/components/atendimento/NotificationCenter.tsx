import { useState } from "react";
import { Bell, Check, CheckCheck, Settings, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useNotifications } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { NotificationSettings } from "./NotificationSettings";

interface NotificationCenterProps {
  userId: string;
  estabelecimentoId: string;
}

export function NotificationCenter({ userId, estabelecimentoId }: NotificationCenterProps) {
  const [showSettings, setShowSettings] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(
    userId,
    estabelecimentoId
  );

  const getTypeColor = (tipo: string) => {
    switch (tipo) {
      case "novo_chat":
        return "bg-blue-500";
      case "cliente_respondeu":
        return "bg-green-500";
      case "transferencia_recebida":
        return "bg-yellow-500";
      case "sla_alerta":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  if (showSettings) {
    return (
      <NotificationSettings
        userId={userId}
        estabelecimentoId={estabelecimentoId}
        onClose={() => setShowSettings(false)}
      />
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-lg">Notificações</h3>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSettings(true)}
              title="Configurações"
            >
              <Settings className="h-4 w-4" />
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={markAllAsRead}
                title="Marcar todas como lidas"
              >
                <CheckCheck className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="h-96">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Bell className="h-12 w-12 mb-2 opacity-50" />
              <p className="text-sm">Nenhuma notificação</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-muted/50 transition-colors ${
                    !notification.lida ? "bg-muted/30" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${getTypeColor(
                        notification.tipo
                      )}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-medium text-sm">{notification.titulo}</h4>
                        {!notification.lida && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 flex-shrink-0"
                            onClick={() => markAsRead(notification.id)}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {notification.mensagem}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
