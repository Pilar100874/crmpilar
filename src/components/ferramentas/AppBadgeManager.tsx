import { useAppBadge } from "@/hooks/ferramentas/useAppBadge";
import { useAutoLocation } from "@/hooks/ferramentas/useAutoLocation";

export function AppBadgeManager() {
  // Este hook atualiza o badge do PWA automaticamente
  useAppBadge();
  
  // Este hook envia a localização automaticamente quando o PWA é aberto
  useAutoLocation();
  
  return null;
}
