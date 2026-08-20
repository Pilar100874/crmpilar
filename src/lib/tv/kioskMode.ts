import { useCallback, useEffect, useRef, useState } from 'react';

export interface KioskStatus {
  /** Quiosque ativo (fullscreen + bloqueios). */
  ativo: boolean;
  /** Ciclo automático pausado por falha detectada. */
  pausadoPorFalha: boolean;
  /** Última falha detectada (mensagem curta). */
  ultimaFalha: string | null;
  /** Marca uma falha manualmente (ex.: erro de carga de dados). */
  registrarFalha: (motivo: string) => void;
  /** Limpa o estado de falha imediatamente. */
  limparFalha: () => void;
}

const TECLAS_BLOQUEADAS = new Set([
  'F5',
  'F11',
  'F12',
  'Backspace',
  'Escape',
  'BrowserBack',
  'ContextMenu',
]);

function ehCampoDeTexto(alvo: EventTarget | null) {
  const el = alvo as HTMLElement | null;
  return !!el?.closest?.('input,textarea,[contenteditable="true"]');
}

/**
 * Modo quiosque para telas de TV: força tela cheia, remove interação clicável,
 * bloqueia scroll/zoom/atalhos e pausa o ciclo automático quando ocorrem falhas
 * (erros de JS, promessas rejeitadas ou perda de rede).
 */
export function useKioskMode(
  ativo: boolean,
  opcoes?: { pausaFalhaSegundos?: number },
): KioskStatus {
  const pausaSegundos = Math.max(10, opcoes?.pausaFalhaSegundos ?? 60);
  const [pausadoPorFalha, setPausado] = useState(false);
  const [ultimaFalha, setUltimaFalha] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  const limparFalha = useCallback(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    setPausado(false);
    setUltimaFalha(null);
  }, []);

  const registrarFalha = useCallback(
    (motivo: string) => {
      setUltimaFalha(motivo?.slice(0, 160) || 'Falha desconhecida');
      setPausado(true);
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        setPausado(false);
        setUltimaFalha(null);
        timerRef.current = null;
      }, pausaSegundos * 1000);
    },
    [pausaSegundos],
  );

  // Detecção automática de falhas
  useEffect(() => {
    if (!ativo) return;
    const onErro = (e: ErrorEvent) => registrarFalha(e.message || 'Erro de execução');
    const onRejeicao = (e: PromiseRejectionEvent) =>
      registrarFalha(String((e.reason as any)?.message ?? e.reason ?? 'Promessa rejeitada'));
    const onOffline = () => registrarFalha('Sem conexão com a rede');
    const onOnline = () => limparFalha();
    window.addEventListener('error', onErro);
    window.addEventListener('unhandledrejection', onRejeicao);
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('error', onErro);
      window.removeEventListener('unhandledrejection', onRejeicao);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [ativo, registrarFalha, limparFalha]);

  // Tela cheia + bloqueios
  useEffect(() => {
    if (!ativo) return;
    const root = document.documentElement;
    root.classList.add('kiosk-mode');

    const entrarFullscreen = () => {
      if (document.fullscreenElement) return;
      root.requestFullscreen?.({ navigationUI: 'hide' } as FullscreenOptions).catch(() => {
        /* navegador exige gesto do usuário */
      });
    };
    entrarFullscreen();

    const onQualquerGesto = () => entrarFullscreen();
    window.addEventListener('pointerdown', onQualquerGesto, true);
    window.addEventListener('keydown', onQualquerGesto, true);

    const onFullscreenChange = () => {
      if (!document.fullscreenElement) window.setTimeout(entrarFullscreen, 1500);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);

    const bloquear = (e: Event) => e.preventDefault();
    const bloquearScroll = (e: Event) => {
      if (!ehCampoDeTexto(e.target)) e.preventDefault();
    };
    const bloquearTeclas = (e: KeyboardEvent) => {
      if (ehCampoDeTexto(e.target)) return;
      if (TECLAS_BLOQUEADAS.has(e.key)) {
        e.preventDefault();
        return;
      }
      // Ctrl/Cmd + R/W/T/N/P/S/F/+/-/0
      if ((e.ctrlKey || e.metaKey) && /^[rwtnpsf=+\-0]$/i.test(e.key)) e.preventDefault();
      if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) e.preventDefault();
    };

    document.addEventListener('contextmenu', bloquear);
    document.addEventListener('dragstart', bloquear);
    document.addEventListener('selectstart', bloquear);
    document.addEventListener('gesturestart', bloquear as EventListener);
    document.addEventListener('wheel', bloquearScroll, { passive: false });
    document.addEventListener('touchmove', bloquearScroll, { passive: false });
    window.addEventListener('keydown', bloquearTeclas, true);

    return () => {
      root.classList.remove('kiosk-mode');
      window.removeEventListener('pointerdown', onQualquerGesto, true);
      window.removeEventListener('keydown', onQualquerGesto, true);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('contextmenu', bloquear);
      document.removeEventListener('dragstart', bloquear);
      document.removeEventListener('selectstart', bloquear);
      document.removeEventListener('gesturestart', bloquear as EventListener);
      document.removeEventListener('wheel', bloquearScroll);
      document.removeEventListener('touchmove', bloquearScroll);
      window.removeEventListener('keydown', bloquearTeclas, true);
    };
  }, [ativo]);

  return { ativo, pausadoPorFalha, ultimaFalha, registrarFalha, limparFalha };
}
