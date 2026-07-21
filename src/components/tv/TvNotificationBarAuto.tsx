import { useEffect } from "react";
import TvNotificationBar from "./TvNotificationBar";

/**
 * Versão que auto-detecta o device_id via query string (?device_id=...).
 * O app Android injeta esse parâmetro na URL ao abrir uma tela interna.
 */
export default function TvNotificationBarAuto({ deviceId: forcedId }: { deviceId?: string | null }) {
  const id = forcedId || new URLSearchParams(window.location.search).get("device_id");
  useEffect(() => {}, []);
  if (!id) return null;
  return <TvNotificationBar deviceId={id} />;
}
