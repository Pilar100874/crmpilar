import { useEffect } from "react";
import TvNotificationBar from "./TvNotificationBar";

/**
 * Versão que auto-detecta o device_id via query string (?device_id=...).
 * O app Android injeta esse parâmetro na URL ao abrir uma tela interna.
 */
export default function TvNotificationBarAuto({ deviceId: forcedId }: { deviceId?: string | null }) {
  const params = new URLSearchParams(window.location.search);
  const id = forcedId || params.get("device_id") || params.get("device");
  useEffect(() => {}, []);
  if (!id) return null;
  return <TvNotificationBar deviceId={id} />;
}
