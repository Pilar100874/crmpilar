import { useEffect, useState } from "react";
import { AppLayout } from "@/components/operacional-hub/layout/AppLayout";
import { Bell, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface Alert {
  id: string;
  type: string;
  message: string;
  severity: string;
  isRead: boolean;
  createdAt: string;
}

export default function Alerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from("op_alerts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setAlerts(
        (data || []).map((a) => ({
          id: a.id,
          type: a.type,
          message: a.message,
          severity: a.severity || "info",
          isRead: a.is_read || false,
          createdAt: a.created_at,
        }))
      );
    } catch (error) {
      console.error("Error fetching alerts:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await supabase.from("op_alerts").update({ is_read: true }).eq("id", id);
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, isRead: true } : a))
      );
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-[26px] font-semibold tracking-tight">Alertas</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Notificações e avisos do sistema
          </p>
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
            </div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-12 rounded-xl border border-border bg-card">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Nenhum alerta</p>
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                onClick={() => !alert.isRead && markAsRead(alert.id)}
                className={cn(
                  "flex items-start gap-4 p-4 rounded-xl border transition-colors cursor-pointer",
                  alert.isRead
                    ? "border-border bg-card/50 opacity-60"
                    : alert.severity === "error"
                    ? "border-critical/50 bg-critical/10"
                    : alert.severity === "warning"
                    ? "border-warning/50 bg-warning/10"
                    : "border-primary/50 bg-primary/10"
                )}
              >
                <Bell
                  className={cn(
                    "h-5 w-5 flex-shrink-0 mt-0.5",
                    alert.severity === "error"
                      ? "text-critical"
                      : alert.severity === "warning"
                      ? "text-warning"
                      : "text-primary"
                  )}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{alert.type}</p>
                  <p className="text-sm text-muted-foreground">{alert.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDate(alert.createdAt)}
                  </p>
                </div>
                {alert.isRead && (
                  <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}
