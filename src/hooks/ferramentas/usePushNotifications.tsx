import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export function usePushNotifications() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    const supported = "Notification" in window;
    setIsSupported(supported);
    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) return false;
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === "granted";
    } catch {
      return false;
    }
  }, [isSupported]);

  const sendLocalNotification = useCallback(
    (title: string, options?: NotificationOptions) => {
      if (!isSupported || permission !== "granted") return;

      // Use service worker registration if available for better PWA integration
      if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification(title, {
            icon: "/pwa-192x192.png",
            badge: "/pwa-192x192.png",
            ...options,
          } as NotificationOptions);
        });
      } else {
        new Notification(title, {
          icon: "/pwa-192x192.png",
          ...options,
        });
      }
    },
    [isSupported, permission]
  );

  // Polling for new notifications
  useEffect(() => {
    if (!user || permission !== "granted") return;

    let lastCheckedAt = new Date().toISOString();

    const checkNewNotifications = async () => {
      try {
        const { data } = await supabase
          .from("notifications")
          .select("title, message, type")
          .eq("user_id", user.id)
          .eq("is_read", false)
          .gt("created_at", lastCheckedAt)
          .order("created_at", { ascending: false })
          .limit(5);

        if (data && data.length > 0) {
          data.forEach((n) => {
            sendLocalNotification(n.title, {
              body: n.message,
              tag: `notification-${Date.now()}`,
            });
          });
        }

        lastCheckedAt = new Date().toISOString();
      } catch (error) {
        console.error("Error checking notifications:", error);
      }
    };

    const interval = setInterval(checkNewNotifications, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [user, permission, sendLocalNotification]);

  return {
    isSupported,
    permission,
    requestPermission,
    sendLocalNotification,
  };
}
