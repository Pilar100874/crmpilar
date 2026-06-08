import { useEffect, useRef } from 'react';

/**
 * Mantém a tela acesa enquanto `active` for true.
 * Usa Screen Wake Lock API (suportada em Chrome/Edge/Safari modernos).
 * Reaquire automaticamente quando o app volta ao primeiro plano.
 */
export function useWakeLock(active: boolean) {
  const sentinelRef = useRef<any>(null);

  useEffect(() => {
    if (!active) return;
    if (typeof navigator === 'undefined' || !(navigator as any).wakeLock) return;

    let cancelled = false;

    const acquire = async () => {
      try {
        if (cancelled) return;
        if (document.visibilityState !== 'visible') return;
        if (sentinelRef.current) return;
        const sentinel = await (navigator as any).wakeLock.request('screen');
        sentinelRef.current = sentinel;
        sentinel.addEventListener?.('release', () => {
          sentinelRef.current = null;
        });
      } catch {
        // pode falhar (bateria baixa, sem permissão); ignorar
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') acquire();
    };

    acquire();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      try { sentinelRef.current?.release?.(); } catch {}
      sentinelRef.current = null;
    };
  }, [active]);
}

export default useWakeLock;
