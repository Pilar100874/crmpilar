import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase, Notification } from "@/lib/supabase";
import { Bell, Check, Trash2, AlertTriangle, Info, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { updateAppBadge } from "@/hooks/useAppBadge";

const typeIcons: Record<string, React.ElementType> = {
  warning: AlertTriangle,
  info: Info,
  success: CheckCircle,
};

const typeVariants: Record<string, "warning" | "info" | "success" | "secondary"> = {
  warning: "warning",
  info: "info",
  success: "success",
};

export default function NotificationsPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, [profile]);

  const fetchNotifications = async () => {
    if (!profile) return;
    try {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false });
      setNotifications((data as Notification[]) || []);
      
      // Atualiza o badge do PWA
      const unread = (data || []).filter((n: any) => !n.is_read).length;
      updateAppBadge(unread);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await supabase.from("notifications").update({ is_read: true }).eq("id", id);
      setNotifications((prev) => {
        const updated = prev.map((n) => (n.id === id ? { ...n, is_read: true } : n));
        // Atualiza o badge
        const unread = updated.filter((n) => !n.is_read).length;
        updateAppBadge(unread);
        return updated;
      });
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const markAllAsRead = async () => {
    if (!profile) return;
    try {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", profile.id)
        .eq("is_read", false);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      // Limpa o badge
      updateAppBadge(0);
      toast({ title: "Todas notificações marcadas como lidas" });
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <MainLayout>
      <PageHeader
        title="Notificações"
        description={`Você tem ${unreadCount} notificação(ões) não lida(s)`}
        action={
          unreadCount > 0 && (
            <Button variant="outline" onClick={markAllAsRead}>
              <Check className="mr-2 h-4 w-4" />
              Marcar todas como lidas
            </Button>
          )
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Nenhuma notificação"
          description="Você será notificado sobre prazos de devolução e atualizações importantes"
        />
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => {
            const Icon = typeIcons[notification.type] || Info;
            const variant = typeVariants[notification.type] || "secondary";
            return (
              <div
                key={notification.id}
                className={`flex items-start gap-4 rounded-lg border p-4 transition-colors ${
                  notification.is_read ? "bg-muted/30" : "bg-card"
                }`}
              >
                <div className={`rounded-full p-2 ${notification.is_read ? "bg-muted" : "bg-primary/10"}`}>
                  <Icon className={`h-5 w-5 ${notification.is_read ? "text-muted-foreground" : "text-primary"}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className={`font-medium ${notification.is_read ? "text-muted-foreground" : ""}`}>
                        {notification.title}
                      </h4>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {notification.message}
                      </p>
                    </div>
                    <Badge variant={variant}>{notification.type}</Badge>
                  </div>
                  <div className="mt-2 flex items-center gap-4">
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(notification.created_at), "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </span>
                    {!notification.is_read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 text-xs"
                        onClick={() => markAsRead(notification.id)}
                      >
                        Marcar como lida
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </MainLayout>
  );
}
