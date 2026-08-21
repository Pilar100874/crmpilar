import { useAppBadge } from "@/hooks/useAppBadge";
import { useAutoLocation } from "@/hooks/useAutoLocation";

export function AppBadgeManager() {
  // Este hook atualiza o badge do PWA automaticamente
  useAppBadge();
  
  // Este hook envia a localização automaticamente quando o PWA é aberto
  useAutoLocation();
  
  return null;
}
