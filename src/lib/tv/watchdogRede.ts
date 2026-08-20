import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Watchdog de rede e de ciclo para telas de TV.
 *
 * Detecta dois tipos de falha em TV Box / WebView:
 *  1. Perda de conexão (offline, servidor inacessível, Wi-Fi caído);
 *  2. Queda do ciclo (a tela parou de avançar — timers congelados, player travado).
 *
 * Ao detectar, aguarda a rede voltar e retoma automaticamente após X segundos:
 * primeiro tenta a recuperação leve (`aoRecuperar`) e, se ainda assim não houver
 * progresso, recarrega a página.
 *
 * Parâmetros podem ser sobrescritos pela URL:
 *  `?wd_ciclo=<segundos>` `?wd_rede=<segundos>` `?wd=0` (desliga)
 */
export type TvWatchdogEstado = {
  online: boolean;
  /** true enquanto o watchdog aguarda a rede/retomada. */
  recuperando: boolean;
  /** Mensagem curta para exibir na tela (ou null). */
  mensagem: string | null;
};

export function useTvWatchdog(opts?: {
  /** Segundos sem progresso do ciclo para considerar travado (0 desliga). */
  segundosSemProgresso?: number;
  /** Segundos sem rede antes de tentar recuperar (0 desliga). */
  segundosSemRede?: number;
  /** Recuperação leve: recarregar dados, reiniciar player, etc. */
  aoRecuperar?: (motivo: "rede" | "ciclo") => void;
  /** Recarrega a página se a recuperação leve não resolver. */
  recarregarSePersistir?: boolean;
  ativo?: boolean;
}): TvWatchdogEstado & { marcarProgresso: () => void } {
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const numParam = (chave: string, padrao: number) => {
    const v = params?.get(chave);
    if (v == null) return padrao;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : padrao;
  };
  const desligado = params?.get("wd") === "0";

  const segundosSemProgresso = numParam("wd_ciclo", opts?.segundosSemProgresso ?? 180);
  const segundosSemRede = numParam("wd_rede", opts?.segundosSemRede ?? 30);
  const recarregarSePersistir = opts?.recarregarSePersistir ?? true;
  const ativo = (opts?.ativo ?? true) && !desligado;

  const aoRecuperarRef = useRef(opts?.aoRecuperar);
  aoRecuperarRef.current = opts?.aoRecuperar;

  const ultimoProgresso = useRef<number>(Date.now());
  const offlineDesde = useRef<number | null>(null);
  const ultimaTentativa = useRef<number>(0);
  const tentativas = useRef<number>(0);

  const [estado, setEstado] = useState<TvWatchdogEstado>({
    online: typeof navigator === "undefined" ? true : navigator.onLine,
    recuperando: false,
    mensagem: null,
  });

  const marcarProgresso = useCallback(() => {
    ultimoProgresso.current = Date.now();
    tentativas.current = 0;
    offlineDesde.current = null;
    setEstado((e) => (e.recuperando || e.mensagem ? { online: true, recuperando: false, mensagem: null } : e));
  }, []);

  useEffect(() => {
    if (!ativo || typeof window === "undefined") return;
    let cancelado = false;

    const alcancavel = async () => {
      try {
        const ctrl = new AbortController();
        const t = window.setTimeout(() => ctrl.abort(), 6000);
        await fetch(`${window.location.origin}/favicon.ico?_wd=${Date.now()}`, {
          method: "GET",
          cache: "no-store",
          signal: ctrl.signal,
        });
        window.clearTimeout(t);
        return true;
      } catch {
        return false;
      }
    };

    const recuperar = (motivo: "rede" | "ciclo") => {
      const agora = Date.now();
      // Evita loop de recuperação: no mínimo 20s entre tentativas
      if (agora - ultimaTentativa.current < 20_000) return;
      ultimaTentativa.current = agora;
      tentativas.current += 1;
      console.info(`[TV watchdog] recuperando (${motivo}) tentativa ${tentativas.current}`);
      if (tentativas.current <= 2) {
        aoRecuperarRef.current?.(motivo);
        ultimoProgresso.current = Date.now();
      } else if (recarregarSePersistir) {
        window.location.reload();
      }
    };

    const verificar = async () => {
      if (cancelado) return;
      const online = await alcancavel();

      if (!online) {
        if (offlineDesde.current == null) offlineDesde.current = Date.now();
        const segundos = Math.round((Date.now() - offlineDesde.current) / 1000);
        setEstado({
          online: false,
          recuperando: true,
          mensagem: `Sem conexão há ${segundos}s — reconectando…`,
        });
        return;
      }

      // Voltou a rede depois de uma queda: retoma o conteúdo
      if (offlineDesde.current != null) {
        const fora = Date.now() - offlineDesde.current;
        offlineDesde.current = null;
        setEstado({ online: true, recuperando: true, mensagem: "Conexão restabelecida — retomando…" });
        if (segundosSemRede === 0 || fora >= segundosSemRede * 1000) {
          ultimaTentativa.current = 0;
          recuperar("rede");
        }
        window.setTimeout(() => {
          if (!cancelado) setEstado({ online: true, recuperando: false, mensagem: null });
        }, 4000);
        return;
      }

      setEstado((e) => (e.online && !e.recuperando && !e.mensagem ? e : { online: true, recuperando: false, mensagem: null }));

      // Ciclo travado
      if (segundosSemProgresso > 0 && Date.now() - ultimoProgresso.current > segundosSemProgresso * 1000) {
        setEstado({ online: true, recuperando: true, mensagem: "Ciclo travado — retomando…" });
        recuperar("ciclo");
        window.setTimeout(() => {
          if (!cancelado) setEstado((e) => ({ ...e, recuperando: false, mensagem: null }));
        }, 4000);
      }
    };

    const iv = window.setInterval(verificar, 10_000);
    const onOffline = () => {
      if (offlineDesde.current == null) offlineDesde.current = Date.now();
      setEstado({ online: false, recuperando: true, mensagem: "Sem conexão — reconectando…" });
    };
    const onOnline = () => { void verificar(); };
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    void verificar();

    return () => {
      cancelado = true;
      window.clearInterval(iv);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, [ativo, segundosSemProgresso, segundosSemRede, recarregarSePersistir]);

  return { ...estado, marcarProgresso };
}
