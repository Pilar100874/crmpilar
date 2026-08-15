import { useEffect, useRef } from "react";

/**
 * Recarrega a página automaticamente em dispositivos de TV para evitar
 * tela travada (memory leak, player parado, sessão expirada).
 *
 * - Intervalo padrão: 60 minutos (configurável por `?reload=<minutos>`; 0 desliga).
 * - Watchdog opcional: se a apresentação não sinalizar atividade
 *   (`marcarAtividade()`) dentro do tempo limite, recarrega antes da hora.
 */
export function useAutoReload(opts?: {
  minutosPadrao?: number;
  /** Minutos sem atividade para considerar travado (0 desliga). */
  watchdogMinutos?: number;
  ativo?: boolean;
}) {
  const { minutosPadrao = 60, watchdogMinutos = 0, ativo = true } = opts ?? {};
  const ultimaAtividade = useRef<number>(Date.now());

  const minutos = (() => {
    if (typeof window === "undefined") return minutosPadrao;
    const p = new URLSearchParams(window.location.search).get("reload");
    if (p === null) return minutosPadrao;
    const n = Number(p);
    return Number.isFinite(n) && n >= 0 ? n : minutosPadrao;
  })();

  useEffect(() => {
    if (!ativo || typeof window === "undefined") return;

    const recarregar = (motivo: string) => {
      console.info(`[TV] Recarregando apresentação (${motivo})`);
      window.location.reload();
    };

    const timers: number[] = [];

    if (minutos > 0) {
      timers.push(
        window.setTimeout(() => recarregar(`ciclo de ${minutos} min`), minutos * 60_000),
      );
    }

    if (watchdogMinutos > 0) {
      const limite = watchdogMinutos * 60_000;
      timers.push(
        window.setInterval(() => {
          if (Date.now() - ultimaAtividade.current > limite) {
            recarregar(`sem atividade há ${watchdogMinutos} min`);
          }
        }, 30_000),
      );
    }

    return () => timers.forEach((t) => {
      window.clearTimeout(t);
      window.clearInterval(t);
    });
  }, [minutos, watchdogMinutos, ativo]);

  return {
    /** Chame quando a apresentação avançar/atualizar para alimentar o watchdog. */
    marcarAtividade: () => {
      ultimaAtividade.current = Date.now();
    },
    minutos,
  };
}
