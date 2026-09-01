import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Só existe aparelho nativo quando o app roda dentro do Capacitor (APK Android/iOS). */
export function isAppNativo(): boolean {
  const cap = (globalThis as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return !!cap?.isNativePlatform?.();
}

export type StatusPush = "indisponivel" | "inativo" | "registrando" | "ativo" | "negado" | "erro";

async function salvarToken(token: string, plataforma: string, unidadeId: string | null) {
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (!userId) return;
  await supabase
    .from("port_push_tokens")
    .upsert(
      { user_id: userId, token, plataforma, unidade_id: unidadeId, ativo: true, updated_at: new Date().toISOString() },
      { onConflict: "token" },
    );
}

/**
 * Registra o celular para receber alertas de campainha mesmo com o app fechado.
 * No navegador não faz nada (o alerta chega em tempo real pela tela aberta).
 */
export function usePushInterfone(unidadeId: string | null) {
  const [status, setStatus] = useState<StatusPush>(isAppNativo() ? "inativo" : "indisponivel");
  const [erro, setErro] = useState<string | null>(null);

  const registrar = useCallback(async () => {
    if (!isAppNativo()) {
      setStatus("indisponivel");
      return;
    }
    setStatus("registrando");
    setErro(null);
    try {
      const { PushNotifications } = await import("@capacitor/push-notifications");
      const permissao = await PushNotifications.requestPermissions();
      if (permissao.receive !== "granted") {
        setStatus("negado");
        return;
      }
      await PushNotifications.removeAllListeners();
      await PushNotifications.addListener("registration", (t) => {
        void salvarToken(t.value, "android", unidadeId).then(() => setStatus("ativo"));
      });
      await PushNotifications.addListener("registrationError", (e) => {
        setErro(String((e as { error?: string }).error ?? "Falha ao registrar o aparelho."));
        setStatus("erro");
      });
      await PushNotifications.register();
    } catch (e) {
      setErro((e as Error).message);
      setStatus("erro");
    }
  }, [unidadeId]);

  useEffect(() => {
    if (isAppNativo()) void registrar();
  }, [registrar]);

  return { status, erro, registrar };
}

/** Notificação local (app aberto/minimizado) para reforçar o toque da campainha. */
export async function notificarCampainhaLocal(titulo: string, corpo: string) {
  if (!isAppNativo()) return;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await LocalNotifications.schedule({
      notifications: [{ id: Date.now() % 100000, title: titulo, body: corpo, smallIcon: "ic_stat_icon" }],
    });
  } catch {
    /* sem permissão: apenas ignora */
  }
}

/**
 * Avisa os celulares registrados que há uma chamada chegando no ramal SIP.
 * Usa o mesmo canal de push da campainha, com tipo "sip".
 */
export async function notificarChamadaSip(unidadeId: string | null, origem?: string) {
  const { data, error } = await supabase.functions.invoke("portaria-push-campainha", {
    body: { unidade_id: unidadeId, tipo: "sip", origem: origem ?? null },
  });
  const r = data as { ok?: boolean; enviados?: number; mensagem?: string } | null;
  return { ok: !!r?.ok && !error, enviados: r?.enviados ?? 0, mensagem: r?.mensagem ?? error?.message };
}
