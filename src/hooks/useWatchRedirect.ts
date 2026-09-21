import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// Smartwatches typically have very small square-ish screens.
// We require BOTH dimensions to be tiny to avoid catching phones in landscape.
const WATCH_MAX_DIMENSION = 320;

// Flag de sessão: redireciona no máximo 1 vez por aba. Se o usuário voltar
// do /watch em um celular, não deve ser jogado de volta para lá.
const SESSION_FLAG = 'watch_redirect_done';

const uaLooksLikeWatch = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /Watch|WearOS|Wear OS|Tizen.*Watch|Galaxy Watch/i.test(ua);
};

const screenIsTiny = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= WATCH_MAX_DIMENSION && window.innerHeight <= WATCH_MAX_DIMENSION;
};

export const useWatchRedirect = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname.startsWith('/watch')) return;
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(SESSION_FLAG)) return;

    const goWatch = () => {
      try { sessionStorage.setItem(SESSION_FLAG, '1'); } catch { /* ignore */ }
      navigate('/watch', { replace: true });
    };

    // 1) User-Agent de relógio: redireciona na hora, sem ambiguidade.
    if (uaLooksLikeWatch()) {
      goWatch();
      return;
    }

    // 2) Heurística de tela minúscula: exige que o tamanho se MANTENHA
    // minúsculo em duas amostras (~700ms de intervalo). Celulares passam por
    // tamanhos transitórios durante o carregamento/resize (barra de endereço,
    // frame animado do preview, teclado) e não devem ser redirecionados.
    if (!screenIsTiny()) return;

    const timer = window.setTimeout(() => {
      if (location.pathname.startsWith('/watch')) return;
      if (screenIsTiny() && uaLooksLikeWatch()) {
        goWatch();
        return;
      }
      // Segunda amostra ainda minúscula + proporção quadrada típica de relógio
      // (evita celular em janela flutuante/split-screen muito estreita).
      if (screenIsTiny()) {
        const ratio = window.innerWidth / Math.max(1, window.innerHeight);
        const squareish = ratio > 0.75 && ratio < 1.33;
        const noTouchKeyboard = window.innerHeight === window.screen?.height || Math.abs(window.innerHeight - (window.screen?.height || 0)) < 40;
        if (squareish && noTouchKeyboard) goWatch();
      }
    }, 700);

    return () => window.clearTimeout(timer);
  }, [navigate, location.pathname]);
};

export default useWatchRedirect;
