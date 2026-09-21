import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// Smartwatches typically have very small square-ish screens.
// We require BOTH dimensions to be tiny to avoid catching phones in landscape.
const WATCH_MAX_DIMENSION = 320;

// Redireciona no máximo 1 vez por aba: se o usuário voltar do /watch em um
// celular, não deve ser jogado de volta para lá.
const SESSION_FLAG = 'watch_redirect_done';

const uaLooksLikeWatch = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /Watch|WearOS|Wear OS|Tizen.*Watch|Galaxy Watch/i.test(ua);
};

// Além da janela, exige que a TELA FÍSICA do aparelho seja minúscula.
// Em celulares, screen.width/height continuam grandes mesmo com janela
// pequena, teclado aberto ou animação transitória do frame do preview —
// só relógios têm a tela física <= 320px nos dois eixos.
const deviceLooksLikeWatch = (): boolean => {
  if (typeof window === 'undefined' || !window.screen) return false;
  const tinyWindow = window.innerWidth <= WATCH_MAX_DIMENSION && window.innerHeight <= WATCH_MAX_DIMENSION;
  const tinyScreen = window.screen.width <= WATCH_MAX_DIMENSION && window.screen.height <= WATCH_MAX_DIMENSION;
  return tinyWindow && tinyScreen;
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

    // User-Agent de relógio: redireciona na hora, sem ambiguidade.
    if (uaLooksLikeWatch()) {
      goWatch();
      return;
    }

    // Heurística de tela minúscula: confere uma única vez após o carregamento
    // estabilizar (600ms), evitando tamanhos transitórios de celular.
    // Não escuta 'resize': celulares disparam resize o tempo todo (barra de
    // endereço, teclado) e relógios não mudam de tamanho.
    const timer = window.setTimeout(() => {
      if (location.pathname.startsWith('/watch')) return;
      if (deviceLooksLikeWatch()) goWatch();
    }, 600);

    return () => window.clearTimeout(timer);
  }, [navigate, location.pathname]);
};

export default useWatchRedirect;
