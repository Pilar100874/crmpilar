import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";

export interface NotificationConfig {
  id?: string;
  usuario_id: string;
  estabelecimento_id: string;
  novo_chat_enabled: boolean;
  cliente_respondeu_enabled: boolean;
  transferencia_recebida_enabled: boolean;
  sla_alerta_enabled: boolean;
  som_enabled: boolean;
  volume: number;
  desktop_notification_enabled: boolean;
}

export interface Notification {
  id: string;
  usuario_id: string;
  estabelecimento_id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  chat_id?: string;
  lida: boolean;
  created_at: string;
}

export function useNotifications(userId: string | null, estabelecimentoId: string | null) {
  const [config, setConfig] = useState<NotificationConfig | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [permissionGranted, setPermissionGranted] = useState(false);

  // Verificar permissão de notificações do navegador
  const checkPermission = useCallback(async () => {
    if (!("Notification" in window)) {
      console.log("Este navegador não suporta notificações desktop");
      return false;
    }

    if (Notification.permission === "granted") {
      setPermissionGranted(true);
      return true;
    }

    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      setPermissionGranted(permission === "granted");
      return permission === "granted";
    }

    return false;
  }, []);

  // Carregar configuração
  const loadConfig = useCallback(async () => {
    if (!userId || !estabelecimentoId) return;

    const { data, error } = await supabase
      .from("notificacoes_usuario_config")
      .select("*")
      .eq("usuario_id", userId)
      .eq("estabelecimento_id", estabelecimentoId)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Erro ao carregar config de notificações:", error);
      return;
    }

    if (!data) {
      // Criar config padrão
      const defaultConfig: NotificationConfig = {
        usuario_id: userId,
        estabelecimento_id: estabelecimentoId,
        novo_chat_enabled: true,
        cliente_respondeu_enabled: true,
        transferencia_recebida_enabled: true,
        sla_alerta_enabled: true,
        som_enabled: true,
        volume: 80,
        desktop_notification_enabled: true,
      };

      const { data: newConfig, error: insertError } = await supabase
        .from("notificacoes_usuario_config")
        .insert(defaultConfig)
        .select()
        .single();

      if (!insertError && newConfig) {
        setConfig(newConfig);
      }
    } else {
      setConfig(data);
    }
  }, [userId, estabelecimentoId]);

  // Carregar notificações
  const loadNotifications = useCallback(async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from("notificacoes_log")
      .select("*")
      .eq("usuario_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Erro ao carregar notificações:", error);
      return;
    }

    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.lida).length);
    }
  }, [userId]);

  // Atualizar configuração
  const updateConfig = useCallback(async (newConfig: Partial<NotificationConfig>) => {
    if (!userId || !estabelecimentoId) return;

    const { error } = await supabase
      .from("notificacoes_usuario_config")
      .update(newConfig)
      .eq("usuario_id", userId)
      .eq("estabelecimento_id", estabelecimentoId);

    if (error) {
      console.error("Erro ao atualizar config:", error);
      toast.error("Erro ao salvar configurações");
      return;
    }

    toast.success("Configurações salvas");
    loadConfig();
  }, [userId, estabelecimentoId, loadConfig]);

  // Marcar notificação como lida
  const markAsRead = useCallback(async (notificationId: string) => {
    const { error } = await supabase
      .from("notificacoes_log")
      .update({ lida: true })
      .eq("id", notificationId);

    if (error) {
      console.error("Erro ao marcar como lida:", error);
      return;
    }

    loadNotifications();
  }, [loadNotifications]);

  // Marcar todas como lidas
  const markAllAsRead = useCallback(async () => {
    if (!userId) return;

    const { error } = await supabase
      .from("notificacoes_log")
      .update({ lida: true })
      .eq("usuario_id", userId)
      .eq("lida", false);

    if (error) {
      console.error("Erro ao marcar todas como lidas:", error);
      return;
    }

    loadNotifications();
  }, [userId, loadNotifications]);

  // Tocar som de notificação
  const playNotificationSound = useCallback(() => {
    if (!config?.som_enabled) return;

    const audio = new Audio("/notification.mp3");
    audio.volume = (config.volume || 80) / 100;
    audio.play().catch(err => console.error("Erro ao tocar som:", err));
  }, [config]);

  // Exibir notificação desktop
  const showDesktopNotification = useCallback((title: string, body: string) => {
    if (!config?.desktop_notification_enabled || !permissionGranted) return;

    new Notification(title, {
      body,
      icon: "/favicon.png",
      tag: "omnichannel-notification",
    });
  }, [config, permissionGranted]);

  // Processar nova notificação
  const handleNewNotification = useCallback((notification: Notification) => {
    // Verificar se o tipo de notificação está habilitado
    const isEnabled = () => {
      switch (notification.tipo) {
        case "novo_chat":
          return config?.novo_chat_enabled;
        case "cliente_respondeu":
          return config?.cliente_respondeu_enabled;
        case "transferencia_recebida":
          return config?.transferencia_recebida_enabled;
        case "sla_alerta":
          return config?.sla_alerta_enabled;
        default:
          return true;
      }
    };

    if (!isEnabled()) return;

    // Toast visual
    toast.info(notification.titulo, {
      description: notification.mensagem,
    });

    // Som
    playNotificationSound();

    // Notificação desktop
    showDesktopNotification(notification.titulo, notification.mensagem);

    // Atualizar lista
    loadNotifications();
  }, [config, playNotificationSound, showDesktopNotification, loadNotifications]);

  // Setup realtime
  useEffect(() => {
    if (!userId) return;

    checkPermission();
    loadConfig();
    loadNotifications();

    const channel = supabase
      .channel("notificacoes_channel")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notificacoes_log",
          filter: `usuario_id=eq.${userId}`,
        },
        (payload) => {
          handleNewNotification(payload.new as Notification);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, checkPermission, loadConfig, loadNotifications, handleNewNotification]);

  return {
    config,
    notifications,
    unreadCount,
    permissionGranted,
    updateConfig,
    markAsRead,
    markAllAsRead,
    checkPermission,
  };
}
